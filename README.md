# Palm

Palm is an AI-assisted design platform that empowers designers to rapidly prototype, iterate, and export production-ready user interfaces. Palm focuses on human-in-the-loop AI workflows: designers sketch wireframes and Palm converts them into structured, editable UI that can be refined and exported as working React components.

Owner: Godwin (username: Onyerikam)
Parent Company: Avocado
Sub-parent: Ossie

---

## Vision

Build the fastest path from idea → working UI. Palm prioritizes a delightful, realtime design experience and AI-powered generation that produces structured, editable components (not just images). Our goal is to dramatically reduce the design → development handoff time while keeping designers firmly in control.

## Key features (MVP)

- Real-time collaborative canvas powered by Convex for optimistic UI and low-latency interactions.
- Vector drawing tools: frames, rectangles, ellipses, freehand, arrows, lines, and text.
- Mood board and style guide generation from images (color palettes, typography suggestions).
- AI generation: convert sketches + inspiration images into multiple streamed design variants.
- Generated UI stored as structured data (`GeneratedUIShape`) so designs are editable and exportable.
- One-click export to production-ready React components (Tailwind-ready) — gated behind credits.
- Authentication (Google + password) and subscription/credits model for paid exports.

## Tech stack

- Frontend: Next.js (App Router) + React 19
- Realtime + DB: Convex
- State: Redux Toolkit + RTK Query
- Styling: Tailwind CSS
- AI pipeline: streaming generation (backend), structured UI spec storage

## Architecture overview

- Server-side Convex functions handle business logic: projects, subscriptions, user profile, and generation jobs.
- UI shapes are stored in a normalized Redux entity adapter for efficient editing and syncing.
- Generated UI artifacts store both the spec and provenance (prompt, model, source frame) to allow refinement and reproducibility.
- Authentication is handled by Convex auth integration with Google/password providers.

## Getting started (developer)

1. Clone the repo

```powershell
git clone https://github.com/WebEssentz/Palm.git
cd Palm
```

2. Install dependencies (using your preferred package manager)

```powershell
# Using npm
npm install

# or using bun
bun install
```

3. Environment

- Copy `.env.example` to `.env.local` and fill in required values (Convex URL, OAuth client secrets, Stripe/Polar keys if used).

4. Run Convex development server (for serverless functions and local DB)

```powershell
npx convex dev
# or
bunx --bun convex dev
```

5. Run the Next.js dev server

```powershell
npm run dev
# or
bun run dev
```

Open http://localhost:3000

## Scripts

- `npm run dev` — start Next dev server
- `npm run build` — build production assets
- `npm start` — run built app
- `npm run lint` — run ESLint

## Project structure (high level)

- `/src/app` — Next.js pages and layouts
- `/src/components` — reusable UI components
- `/src/convex` — Convex client/provider and server-side functions
- `/src/redux` — store, slices, and RTK Query APIs
- `/src/hooks` — application hooks (auth, project creation)
- `/public` — static assets

## Contributing

We welcome contributions. High-level guidance:

1. Open an issue describing the feature or bug.
2. Create a branch prefixed with `feat/` or `fix/`.
3. Keep commits small and focused — one logical change per commit.
4. Add tests for new behaviors where applicable.
5. Open a pull request with clear description and testing steps.

## Contact & ownership

- Owner: Godwin (Onyerikam)
- Parent company: Avocado
- Sub-parent: Ossie
- For project questions or access, reach out to the owner on GitHub (https://github.com/Onyerikam) or internal channels.

## Security & privacy notes

- AI generation and uploaded images may contain proprietary content. For enterprise customers we support private model deployments or on-prem inference to meet data governance requirements.
- Do not commit secrets to the repository. Use environment variables and secret management.

---

If you'd like, I can also:

- Open a PR with this README and assign reviewers.
- Add a `CONTRIBUTING.md` and `SECURITY.md` with more detail.
- Add a simple `DEVELOPERS.md` with a checklist for setting up secrets and running the full stack locally.This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
