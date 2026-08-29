#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image, UnidentifiedImageError


PROJECT_DIR = Path(__file__).resolve().parents[1]
DROP_DIR = Path(os.environ.get("WECHAT_QR_DROP_DIR", "/Users/mac/Documents/Codex/WechatGroupQR")).resolve()
ARCHIVE_DIR = DROP_DIR / "archive"
LOG_DIR = DROP_DIR / "logs"
BACKUP_DIR = PROJECT_DIR / "assets" / "wechat-backups"
QR_PATH = PROJECT_DIR / "assets" / "wechat-group.png"
META_PATH = PROJECT_DIR / "assets" / "wechat-qr-meta.json"
ALLOWED_GIT_PATHS = {
    "assets/wechat-group.png",
    "assets/wechat-qr-meta.json",
}
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}
TIMEZONE = ZoneInfo("America/Los_Angeles")
GIT_BIN = (
    os.environ.get("GIT_BIN")
    or shutil.which("git")
    or "/usr/bin/git"
)


def log(message: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(TIMEZONE).strftime("%Y-%m-%d %H:%M:%S %Z")
    line = f"[{stamp}] {message}"
    print(line)
    with (LOG_DIR / "wechat-qr-updater.log").open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def run_git(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [GIT_BIN, *args],
        cwd=PROJECT_DIR,
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def project_relative(path: Path) -> str:
    return path.resolve().relative_to(PROJECT_DIR).as_posix()


def ensure_safe_paths() -> None:
    if hasattr(os, "geteuid") and os.geteuid() == 0:
        raise RuntimeError("Refusing to run as root. Please run as your normal Mac user.")

    for path in [DROP_DIR, ARCHIVE_DIR, LOG_DIR, BACKUP_DIR, QR_PATH.parent, META_PATH.parent]:
        resolved = path.resolve()
        if not (
            str(resolved).startswith(str(PROJECT_DIR))
            or str(resolved).startswith(str(DROP_DIR))
        ):
            raise RuntimeError(f"Unsafe path outside project/drop folder: {resolved}")


def current_git_state() -> tuple[str, str]:
    branch = run_git(["branch", "--show-current"]).stdout.strip()
    upstream = run_git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).stdout.strip()
    if not branch:
        raise RuntimeError("Git is not on a named branch. Please switch back to main first.")
    if not upstream:
        raise RuntimeError("Git upstream is not configured. Please set the GitHub upstream first.")
    return branch, upstream


def ensure_clean_except_allowed() -> None:
    status = run_git(["status", "--porcelain", "--untracked-files=all"]).stdout.splitlines()
    unsafe = []

    for line in status:
        if not line.strip():
            continue
        path_text = line[3:]
        if " -> " in path_text:
            path_text = path_text.split(" -> ", 1)[1]
        if path_text not in ALLOWED_GIT_PATHS:
            unsafe.append(line)

    if unsafe:
        raise RuntimeError(
            "Git has other uncommitted changes. Stop before updating QR:\n"
            + "\n".join(unsafe)
        )


def newest_image() -> Path | None:
    DROP_DIR.mkdir(parents=True, exist_ok=True)
    candidates = [
        path
        for path in DROP_DIR.iterdir()
        if path.is_file()
        and not path.name.startswith(".")
        and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda path: path.stat().st_mtime)


def validate_image(path: Path) -> Image.Image:
    try:
        with Image.open(path) as candidate:
            candidate.verify()
        image = Image.open(path)
        width, height = image.size
        if width < 120 or height < 120:
            raise RuntimeError("Image is too small to be a reliable WeChat QR code.")
        if width / height > 3 or height / width > 3:
            raise RuntimeError("Image aspect ratio looks unusual for a QR code.")
        return image
    except UnidentifiedImageError as error:
        raise RuntimeError("The newest file is not a valid JPG/PNG image.") from error


def backup_current_qr(now_token: str) -> None:
    if not QR_PATH.exists():
        return
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = BACKUP_DIR / f"wechat-group-{now_token}.png"
    shutil.copy2(QR_PATH, backup_path)
    backups = sorted(BACKUP_DIR.glob("wechat-group-*.png"), key=lambda item: item.stat().st_mtime)
    for old_backup in backups[:-30]:
        old_backup.unlink()
    log(f"Backed up current QR to {backup_path}")


def replace_qr(source: Path, image: Image.Image) -> None:
    if source.suffix.lower() == ".png":
        shutil.copy2(source, QR_PATH)
        return

    converted = image.convert("RGB")
    converted.save(QR_PATH, format="PNG", optimize=False, compress_level=0)


def write_meta(source_name: str, now: datetime) -> None:
    display_time = now.strftime("%Y-%m-%d %H:%M:%S %Z")
    META_PATH.write_text(
        json.dumps(
            {
                "lastUpdated": display_time,
                "lastUpdatedISO": now.isoformat(),
                "sourceFile": source_name,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def archive_source(source: Path, now_token: str) -> Path:
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    archive_name = f"{now_token}-{source.name}"
    target = ARCHIVE_DIR / archive_name
    shutil.move(str(source), target)
    return target


def git_commit_and_push(now: datetime) -> str | None:
    run_git(["add", *sorted(ALLOWED_GIT_PATHS)])
    diff_result = run_git(["diff", "--cached", "--quiet"], check=False)
    if diff_result.returncode == 0:
        log("No QR changes to commit.")
        return None

    message = f"Update WeChat group QR - {now.strftime('%Y-%m-%d')}"
    run_git(["commit", "-m", message])
    commit_hash = run_git(["rev-parse", "--short", "HEAD"]).stdout.strip()
    push_result = run_git(["push"], check=False)
    if push_result.returncode != 0:
        raise RuntimeError(
            "Git commit succeeded but push failed. Local files are kept.\n"
            + push_result.stderr.strip()
        )
    return commit_hash


def main() -> int:
    parser = argparse.ArgumentParser(description="Update the public WeChat group QR image.")
    parser.add_argument("--no-git", action="store_true", help="Replace files but do not commit or push.")
    parser.add_argument("--dry-run", action="store_true", help="Only validate the newest image.")
    args = parser.parse_args()

    try:
      ensure_safe_paths()
      current_git_state()
      image_path = newest_image()
      if image_path is None:
          log("No new QR image found.")
          return 0

      image = validate_image(image_path)
      log(f"Found newest QR image: {image_path.name} ({image.size[0]}x{image.size[1]})")

      if args.dry_run:
          log("Dry run complete. No files changed.")
          return 0

      if not args.no_git:
          ensure_clean_except_allowed()

      now = datetime.now(TIMEZONE)
      now_token = now.strftime("%Y%m%d-%H%M%S")
      backup_current_qr(now_token)
      replace_qr(image_path, image)
      write_meta(image_path.name, now)
      archive_path = archive_source(image_path, now_token)
      log(f"Archived original QR to {archive_path}")

      if args.no_git:
          log("Updated QR without Git commit because --no-git was used.")
          return 0

      commit_hash = git_commit_and_push(now)
      if commit_hash:
          log(f"Committed and pushed QR update: {commit_hash}")
      return 0
    except Exception as error:
      log(f"ERROR: {error}")
      return 1


if __name__ == "__main__":
    raise SystemExit(main())
