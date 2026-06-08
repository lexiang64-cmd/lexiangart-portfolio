# Creative Portfolio

Static portfolio website for design, painting, and photography works.

## Local Development

```bash
npm run dev
```

Open `http://localhost:3000`.

If `npm` is not available locally, run the same script directly:

```bash
node scripts/dev-server.js
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
