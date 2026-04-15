# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StreamShed** — a client-side-only web app for removing unwanted audio/subtitle tracks from video files. Runs entirely in the browser via FFmpeg WebAssembly (no server, no uploads). Uses `-c copy` (stream copy) for fast remuxing without re-encoding.

## Commands

- `npm run dev` — Start dev server (Vite, auto-opens with required CORS headers)
- `npm run build` — Type-check (`tsc -b`) then production build
- `npm run lint` — ESLint
- `npm run preview` — Preview production build

## Architecture

**State machine in App.tsx** drives the entire UI flow using a discriminated union (`AppState`):
`idle → loading-ffmpeg → probing → selecting → processing → done` (or `error` from any step)

**`useFFmpeg` hook** (`src/hooks/useFFmpeg.ts`) is the core engine:
- Loads FFmpeg WASM from unpkg CDN (requires `SharedArrayBuffer` — see Vite config)
- `probe()` — writes file to virtual FS, runs `ffmpeg -i` and parses stream info from stderr logs via regex
- `remux()` — builds `-map 0:N` args for kept streams, executes with `-c copy`, returns a blob URL

**Feature-based structure:** `src/features/dropzone/`, `src/features/track-selector/`
**Shared UI:** `src/components/ui/` (hand-rolled Switch and Progress, shadcn-style)

## Critical Configuration

**`vite.config.ts`** must serve these headers for FFmpeg WASM threading:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
`@ffmpeg/ffmpeg` and `@ffmpeg/util` are excluded from Vite's `optimizeDeps`.

## Tech Stack

React 19, TypeScript (strict), Vite 7, Tailwind CSS v4 (CSS-based config via `@tailwindcss/vite`), `@ffmpeg/ffmpeg` 0.12.x, Lucide icons

## Styling

Dark theme using CSS custom properties in `src/index.css`. All styling via Tailwind utility classes referencing `var(--accent)`, `var(--muted)`, etc. No component library installed — UI primitives are in `src/components/ui/`.
