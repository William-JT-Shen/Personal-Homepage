# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRISM (**P**ortfolio & **R**esearch **I**nterface **S**ite **M**aker) is a config-driven personal academic website template built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, and Zustand. All site content lives in plain files (`content/` TOML, Markdown, BibTeX) — there is no database or CMS. The site is a fully static export (no server runtime). This working copy is a customized personal site (author "Juntao Shen", i18n en/zh enabled).

## Commands

- Node.js >= 22 required (see `.nvmrc`). Install deps with `npm install`.
- `npm run dev` — dev server with Turbopack at http://localhost:3000
- `npm run build` — builds and statically exports the site to `out/`
- `npm run lint` — ESLint (flat config, `next/core-web-vitals` + `next/typescript` in `eslint.config.mjs`)
- There is no test suite.

## Architecture

### Content-driven configuration

`content/config.toml` is the single source of truth for the whole site: site/author/social info, `[features]` flags, the `[[navigation]]` list, and the `[i18n]` section. **The build throws if it is missing** (`getDefaultConfig()` in `src/lib/config.ts`). Content files are read with `fs` from `process.cwd()` via `src/lib/content.ts` — every content getter takes an optional `locale` and falls back from `content_<locale>/` to `content/` (e.g. `content_zh/config.toml` is merged over the default config in `getConfig(locale)`; `[i18n]` always comes from the default config).

### Routing and the dataByLocale pattern

There are only two routes:

- `src/app/page.tsx` — homepage: renders the Profile sidebar plus sections defined in `content/about.toml` (`markdown`, `publications`, or `list` sections). With `features.enable_one_page_mode = true`, every nav `page` renders as a section on `/` instead of a separate route.
- `src/app/[slug]/page.tsx` — dynamic pages. `generateStaticParams()` derives slugs from `navigation` entries in `config.toml` (excluding `about`); each page's TOML defines its `type`: `publication` (BibTeX `source`), `text` (Markdown `source`), or `card` (inline `items`). Missing config → `notFound()`.
- Card items (`CardPage.tsx`) optionally support `image` (clicking the title opens the image in an in-page lightbox; e.g. a certificate stored in `public/`) and `link` (title opens the URL in a new tab). Lightbox UI strings live in the `card` section of `messages.ts`.

The locale is client-side state (not in the URL), so **server components pre-render the data for every locale** into a `dataByLocale: Record<string, Data>` map, passed as serializable props to a `'use client'` component (`HomePageClient` / `DynamicPageClient`), which selects the entry matching the Zustand `localeStore`. Follow this pattern when adding server-fetched content that varies by locale — never read the locale in a server component.

To add a page: create `content/<name>.toml` with `type`, `title`, and the type-specific fields, then add a matching `[[navigation]]` entry to `content/config.toml` (and to each `content_<locale>/config.toml`). No code changes needed.

### i18n

- `src/lib/i18n/config.ts` — `getRuntimeI18nConfig()` applies defaults to the raw `[i18n]` TOML config (mode `auto`/`fixed`, persist, switcher, labels).
- An inline bootstrap `<script>` in `src/app/layout.tsx` resolves the locale and sets `data-locale` on `<html>` before hydration (no flash); `localeStore.initialize()` then reads that attribute → localStorage (`locale-storage`) → `navigator.language`, via `matchLocale()` (normalizes `zh-CN` → `zh`).
- UI strings are a hardcoded dictionary in `src/lib/i18n/messages.ts` (keys per locale, e.g. `en`, `zh`), consumed via the `useMessages()` hook. Add new translatable UI strings there — they are not in content files.

### Theming

Class-based dark mode (`darkMode: 'class'`, dark variant `&:where(.dark, .dark *)` in `globals.css`). `themeStore` (zustand, persisted to `theme-storage` localStorage) drives it; an inline script in `layout.tsx` sets the initial class before hydration, and `ThemeProvider` hides children until mounted to prevent FOUC. All colors are CSS variables defined in `src/app/globals.css` and mapped to Tailwind tokens (`primary`, `accent`, `neutral-*`) in `tailwind.config.mjs`.

### Publication pipeline

- `.bib` files are imported as raw strings via the webpack `asset/source` rule in `next.config.ts` plus the `*.bib` module declaration in `src/types/bib.d.ts`.
- `src/lib/bibtexParser.ts` — `parseBibTeX()` wraps `bibtex-parse-js`: maps BibTeX entry types to `PublicationType`, sorts by year/month descending, and handles PRISM's custom fields: `selected = {true}` (featured on homepage), `preview`, `description`, `keywords`, `code`. Author markers: `*` = corresponding author, `#` = co-author; the site owner's name (from config, across all locales) is auto-highlighted in author lists.
- `src/lib/bibtexInline.ts` — hand-written parser for inline BibTeX formatting in titles (`\textit`, `\emph`, `\textbf`, `\textsc`, `\textsuperscript`, `\textsubscript`) producing a `BibTeXInlineNode` tree rendered by `FormattedBibTeXText`.

## Static export notes

- `next.config.ts` sets `output: 'export'`, `trailingSlash: true`, and `images.unoptimized` — do not add features requiring a server (middleware, API routes, `next/image` optimization).
- Deploying under a repo subpath (not `username.github.io` root) requires setting `basePath` and `assetPrefix` in `next.config.ts` (see `docs/deployment.md`).
- `.github/workflows/deploy.yml` builds `out/` and deploys to GitHub Pages; it runs on `workflow_dispatch` only — push triggers are commented out.
- `src/app/layout.tsx` preconnects to and preloads a webfont from `jialeliu.com` (the original template author's domain, also referenced in `globals.css`). Customize or localize these if the site must work offline.
