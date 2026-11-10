# RoadReady NL frontend

React + TypeScript learning interface for the Go API in `../backend`. It uses Vite, Tailwind CSS, React Router, TanStack Query, and Lucide icons.

## Prerequisites

Use Node.js 18.14 or newer and npm. The tooling is pinned to work with the Node 18 runtime available in this repository.

## Run locally

Start the backend first, with PostgreSQL configured as described in [the backend README](../backend/README.md):

```bash
cd ../backend
DATABASE_URL='postgres://cbr:YOUR_PASSWORD@localhost:5432/cbr?sslmode=disable' go run ./cmd/api
```

In another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Vite serves the frontend on the URL printed in the terminal (normally `http://localhost:5173`) and proxies `/api` and `/healthz` to `http://localhost:8080`. Change `VITE_API_PROXY_TARGET` if your API uses another address. For a separately hosted API, set `VITE_API_BASE_URL` and configure CORS on that API.

## Checks

```bash
npm run lint
npm test
npm run build
```

## Structure

- `src/api`: typed fetch functions matching the existing Go HTTP contract.
- `src/pages.tsx`: dashboard, topic, lesson, practice, quiz, and results routes.
- `src/components.tsx`: small shared layout and state components.
- `src/lesson-content.tsx`: deliberately limited, safe lesson renderer; it does not inject stored content as HTML.
- `src/admin-media.tsx` and `src/media.tsx`: upload library, reusable picker, and authorized visual rendering.
- `src/lesson-builder.tsx`: accessible `@dnd-kit` block editor with explicit reorder controls.
- `src/lesson-blocks.tsx`: shared admin-preview and learner lesson renderer.
- `src/rich-text.tsx`: TipTap WYSIWYG toolbar used by lessons, questions, callouts, scenario feedback and outcomes.
- `src/scenario-editor.tsx`: visual scene composer with draggable road users/signs, precise coordinates and learner-choice editing.

Quiz details and results are kept in `sessionStorage` only so a browser refresh does not lose an active quiz. Scores remain authoritative only when returned by the Go API; no learner progress is persisted in the frontend.

## Interactive scenarios

Open `/scenarios` to select a scenario. Each scene is an SVG rendered from the public configuration returned by the Go API. The client sends only the selected `actionId`; Go decides correctness, feedback, outcome, and informational XP. Animation is deterministic and respects the operating system’s reduced-motion preference.

## Visual content

Administrators use `/admin/media` to drag or select PNG, JPEG, WebP, GIF and
MP4 files, edit accessibility metadata, select video poster images, search the
library and archive assets. Lesson, question and scenario editors reuse those
assets. The lesson editor stores validated blocks and shares its preview
renderer with learner lesson pages. Images load lazily and native video uses
controls with metadata-only preloading.

Rich text is persisted as a deliberately constrained Markdown subset rather
than arbitrary HTML. This keeps existing API contracts and database columns
compatible while supporting headings, emphasis, lists, quotes and HTTPS links.
The WYSIWYG media button opens the private media library and embeds an image,
GIF or video at the current cursor position. Stored content contains a stable
`[[media:asset_id]]` reference rather than an expiring object URL. Learner
lesson, practice, quiz, scenario and exam views resolve that reference through
the authorized media endpoint. Publishing is rejected if an embedded asset is
missing or unavailable. Selecting embedded media reveals controls for resizing
from 25–100%, left/centre/right alignment, moving it up or down, drag-and-drop
reordering, an optional placement-specific title, and removal. Left and right
placement uses text wrapping, while centred media remains a separate block.
Layout and title settings are stored with the stable asset reference and
reproduced in learner views. The shared media-library caption, source, alt text,
and transcript remain attached to the asset. Questions use the same safe
renderer in practice, quizzes and exams. The scenario editor writes the
existing structured scene JSON through visual form controls; the backend
continues validating and scoring that structure.

## Embedded lesson quizzes

The lesson WYSIWYG toolbar includes **Insert quiz**. It creates a separate,
structured lesson quiz and inserts a stable `[[lesson-quiz:...]]` reference at
the cursor. Learners answer accessible single-select or multi-select questions
in place; backend scoring returns feedback, explanations, and a retryable
score. These quizzes remain independent from practice and mock exams.
