# Creative Portfolio

Static portfolio website for design, painting, and photography works.

## Local Development

```bash
npm ci
npm run build
npm run dev
```

Open `http://localhost:3000`.

If `npm` is not available locally, run the same script directly:

```bash
node scripts/dev-server.js dist
```

## Build

```bash
npm run build
```

The production files are written to `dist/`.

## Vercel

Use these settings when importing the GitHub repository into Vercel:

- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: leave empty or use the default

The site entry point is `index.html`, and image assets are referenced from `assets/`.

## 内容维护

请阅读 [中文网站更新指南](docs/网站更新指南.md) 和 [CMS 评估](docs/CMS评估.md)。所有内容来自 `content/*.json`，构建时生成静态 HTML；修改数据后重新构建。`content/templates/` 包含三个可复制的草稿模板。
