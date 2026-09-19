# Hirebase

Hirebase is a multi-tenant recruiting CRM for small agencies and in-house talent teams. It covers the full hiring pipeline, companies, jobs, candidates, applications, and interviews, and layers an AI copilot on top that can answer questions about your pipeline and take action on it (move a candidate to the next stage, source matches for a role, draft an offer) using the same permission-checked logic as the UI.

## Features

- **Pipeline management** - companies, jobs, candidates, applications, and interviews with a drag-and-drop kanban board per job.
- **AI Talent Agent** - a chat-based copilot, backed by Claude, that can read your workspace's data and run real actions (create a candidate, move an application, source matches, draft an offer) through the same server actions the UI uses, so there's a single, consistent permission and validation path for humans and the agent alike.
- **Semantic candidate sourcing** - rank candidates against a job description using vector search, surfaced as a match score on each application.
- **Organizations and billing** - every workspace is a Clerk organization; plan limits (free vs. paid) are enforced server-side, not just hidden in the UI.
- **Recruiter-facing "Today" queue** - a daily digest of what needs attention: new applications, stale candidates, upcoming interviews.

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Actions, React 19)
- **Database / CMS:** Sanity (structured content + Sanity Context for AI-native querying)
- **Auth & billing:** Clerk (organizations, sessions, subscription plans, webhooks)
- **AI:** Anthropic Claude via the Vercel AI SDK, connected to the app's data through a Sanity Context MCP server
- **UI:** Tailwind CSS, Base UI primitives, shadcn-style components, dnd-kit for the kanban board
- **Language:** TypeScript throughout, including the Sanity schema and Studio configuration

## Architecture notes

Hirebase is multi-tenant: every document belongs to a Clerk organization (`orgId`), and every read and write is scoped to the caller's own organization. A few things worth knowing if you're extending this:

- **`lib/tenant.ts`** is the single source of truth for tenant scoping (`requireOrg()`, `assertOwned()`). Every server action and every AI agent tool routes through it, so there's exactly one place that enforces "you can only touch your own organization's data."
- **The AI agent's data access is scoped per request.** The MCP connection URL embeds a GROQ filter built fresh for each request from the caller's `orgId` - it is never cached or hoisted to module scope, which would let one organization's filter leak into another's request on a warm server instance.
- **Plan limits are enforced with a post-write reconciliation step**, not just a pre-check, to close the race condition where two concurrent requests could both pass a "do we have room for one more?" check before either write lands.

## Getting started

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (this repo pins `pnpm@11.22.0` via `packageManager` in `package.json` - using plain `npm install` will fail on a peer dependency resolution that pnpm handles fine)
- A [Sanity](https://sanity.io) project
- A [Clerk](https://clerk.com) application, with an organization-based billing plan set up if you want to exercise the paid-plan features
- An [Anthropic](https://console.anthropic.com) API key

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - from your Clerk application
- `CLERK_WEBHOOK_SIGNING_SECRET` - only needed if you're wiring up the billing webhook locally
- `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` - from your Sanity project
- `SANITY_API_READ_TOKEN` - a viewer-role token, used both for the app's reads and the Sanity Context MCP connection
- `SANITY_API_WRITE_TOKEN` - an editor-role token, used by server actions and the seed script
- `SANITY_CONTEXT_MCP_BASE_URL` - your Sanity Context MCP endpoint (`https://api.sanity.io/<version>/context/mcp/<projectId>/<dataset>`)
- `ANTHROPIC_API_KEY` - your Anthropic API key

You'll also need to update `sanity.cli.ts` with your own `studioHost` (a Sanity Studio hostname is a claim on a subdomain, so pick your own), and create a Sanity Context configuration in your project's dashboard matching the slug referenced in `lib/mcp.ts`.

### 3. Seed some demo data (optional)

```bash
pnpm seed
```

Re-run with `pnpm seed:reset` to wipe and reseed.

### 4. Run the app

```bash
pnpm dev
```

The app runs at `http://localhost:3000`. The Sanity Studio is available at `/studio`.

### Deploying

This instance is deployed at `hire.swayam.space`. When deploying, update your Clerk application's allowed origins/redirect URLs and your Sanity CORS origins to include the production domain, and add a CNAME (or your host's equivalent) pointing `hire.swayam.space` at your hosting provider.

### Other scripts

```bash
pnpm build       # production build
pnpm lint        # ESLint
pnpm typecheck   # generates Next.js route types, then runs tsc --noEmit
pnpm test        # unit + integration tests (no external services needed)
pnpm test:e2e    # end-to-end tests (needs a Clerk test instance - see TESTING.md)
```

See [TESTING.md](./TESTING.md) for the full test suite breakdown, setup requirements, and what's intentionally out of scope.

## Project structure

```
app/                Next.js App Router routes (dashboard, auth, API routes, Sanity Studio)
components/         UI components, organized by feature area
lib/
  actions/          Server actions (the single write path for both the UI and the AI agent)
  sanity/           Sanity client setup
  tenant.ts         Multi-tenant scoping (requireOrg, assertOwned)
  mcp.ts            Per-request, tenant-scoped MCP connection URL
  agent-tools.ts    Tool definitions exposed to the AI agent
  agent-prompt.ts   The agent's system prompt
  plan-limits.ts    Free-plan limits and enforcement
sanity/             Sanity schema types and Studio structure
scripts/            Local dev tooling (data seeding)
tests/
  unit/             Vitest unit tests (mocked dependencies, no network)
  integration/      Vitest integration tests for lib/actions/ and the webhook route
  e2e/              Playwright end-to-end tests (needs a real Clerk test instance)
  mocks/            Shared test doubles for the Sanity client and Clerk auth()
```

## Author

Built by Swayam Swarup Panda.

## License

MIT - see [LICENSE](./LICENSE).
