import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directoryArg = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : ".";
const portArg = process.argv.find((arg, index) => index > 1 && /^\d+$/.test(arg));
const directory = path.resolve(root, directoryArg);
const port = Number(portArg || process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function safeJoin(base, requestPath) {
  const decodedPath = decodeURIComponent(requestPath.split("?")[0]);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const resolvedPath = path.join(base, normalizedPath);

  if (!resolvedPath.startsWith(base)) {
    return null;
  }

  return resolvedPath;
}

const server = http.createServer(async (request, response) => {
  const requestPath = request.url === "/" ? "/index.html" : request.url || "/index.html";
  const filePath = safeJoin(directory, requestPath);

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    const finalPath = fileStat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const extension = path.extname(finalPath).toLowerCase();

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    createReadStream(finalPath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Try: PORT=3001 npm run dev`);
    process.exit(1);
  }

  if (error.code === "EACCES" || error.code === "EPERM") {
    console.error(`Cannot listen on ${host}:${port}. Check local network permissions or choose another port.`);
    process.exit(1);
  }

  throw error;
});

server.listen(port, host, () => {
  console.log(`Serving ${path.relative(root, directory) || "."} at http://${host}:${port}`);
});
