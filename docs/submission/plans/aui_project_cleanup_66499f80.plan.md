---
name: AUI project cleanup
overview: 'Remove all legacy "fragments" code (old API routes, components, lib files, dependencies, assets) that is dead weight, fix the REFERENCE_AGENT_DIR mismatch bug, and simplify the codebase to its actual purpose: generating AUI agent schemas via E2B + OpenCode.'
todos:
  - id: fix-ref-dir
    content: Fix REFERENCE_AGENT_DIR mismatch in lib/aui/workspace.ts (change /home/user/my-agent to /home/user/example-agent)
    status: completed
  - id: delete-legacy-routes
    content: "Delete legacy API routes: app/api/chat/route.ts, app/api/morph-chat/route.ts, app/api/sandbox/route.ts"
    status: completed
  - id: delete-legacy-actions
    content: "Delete legacy server actions: app/actions/publish.ts, app/actions/validate-email.ts"
    status: completed
  - id: delete-legacy-components
    content: "Delete legacy components: fragment-web.tsx, fragment-interpreter.tsx, fragment-preview.tsx, deploy-dialog.tsx, repo-banner.tsx, chat-picker.tsx"
    status: completed
  - id: delete-legacy-lib
    content: "Delete legacy lib files: models.ts, models.json, morph.ts, prompt.ts, ratelimit.ts, api-errors.ts"
    status: completed
  - id: delete-middleware
    content: Delete middleware.ts (legacy short-link redirect)
    status: completed
  - id: delete-legacy-assets
    content: Delete legacy SVG assets from public/thirdparty/templates/
    status: completed
  - id: delete-orphaned
    content: "Delete untracked orphaned files: prisma/ directory, lib/db.ts"
    status: completed
  - id: simplify-schema
    content: Remove morphEditSchema from lib/schema.ts
    status: completed
  - id: simplify-preview
    content: "Simplify components/preview.tsx: remove Deploy, Preview tab, and legacy imports"
    status: completed
  - id: simplify-chat-input
    content: "Simplify components/chat-input.tsx: remove RepoBanner import and isMultiModal/file-upload dead code"
    status: completed
  - id: simplify-types
    content: "Clean up lib/types.ts: remove ExecutionResultInterpreter and ExecutionResultWeb"
    status: completed
  - id: remove-deps
    content: "Remove unused dependencies from package.json: @ai-sdk/*, ollama-ai-provider, @upstash/ratelimit, @vercel/kv, core-js, simple-icons"
    status: completed
  - id: clean-env
    content: "Remove unused env keys from .env.local: MORPH_API_KEY, KV_*, RATE_LIMIT_*"
    status: completed
  - id: verify
    content: Run lint, test, and build to verify everything works
    status: completed
isProject: false
---

# AUI Project Cleanup

## Context

This project was forked from the E2B "fragments" app, which supported multiple web app templates (Streamlit, Gradio, Vue, Next.js) with LLM-powered code generation running server-side. It has been repurposed into an AUI Agent Builder where OpenCode runs inside E2B sandboxes to generate/edit AUI schema files. The old template code has been deleted, but the legacy plumbing — API routes, components, lib files, dependencies, and assets — is still present and adds significant bloat.

## Bug Fix: REFERENCE_AGENT_DIR mismatch

The sandbox template (`sandbox-templates/aui-developer/template.ts`) copies example files into `/home/user/example-agent/`, but [lib/aui/workspace.ts](lib/aui/workspace.ts) line 5 defines `REFERENCE_AGENT_DIR = '/home/user/my-agent'`. This causes the `cp -R` command in `ensureAgentWorkspace` to fail with "exit status 1", breaking runtime startup.

**Fix:** Change `REFERENCE_AGENT_DIR` to `'/home/user/example-agent'` in [lib/aui/workspace.ts](lib/aui/workspace.ts). Also update the permission config in [lib/aui/opencode-runtime.ts](lib/aui/opencode-runtime.ts) lines 73-76 which reference `example-agent/**` to match.

## Files to Delete

### Legacy API routes (not used by AUI flow)

- `app/api/chat/route.ts` — old LLM-streamed fragment generation
- `app/api/morph-chat/route.ts` — old morph-based code editing
- `app/api/sandbox/route.ts` — old sandbox execution for web app templates

### Legacy server actions

- `app/actions/publish.ts` — deployment action for web apps
- `app/actions/validate-email.ts` — email validation for old deploy flow

### Legacy components

- `components/fragment-web.tsx` — iframe preview for web apps
- `components/fragment-interpreter.tsx` — code interpreter result display
- `components/fragment-preview.tsx` — routes to the two components above
- `components/deploy-dialog.tsx` — deploy dialog for web apps
- `components/repo-banner.tsx` — GitHub star banner (imported in `chat-input.tsx` but never rendered)
- `components/chat-picker.tsx` — old model/template picker (not imported anywhere)

### Legacy lib files (only used by legacy routes above)

- `lib/models.ts` — LLM provider client factory (only used by `chat` and `morph-chat` routes)
- `lib/models.json` — model definitions (only used by `models.ts` and `chat-picker.tsx`)
- `lib/morph.ts` — Morph API integration (only used by `morph-chat` route)
- `lib/prompt.ts` — fragment generation prompt builder (only used by `chat` route)
- `lib/ratelimit.ts` — Upstash rate limiting (only used by legacy `chat` and `morph-chat` routes)
- `lib/api-errors.ts` — API error handling (only used by legacy routes)

### Legacy middleware

- `middleware.ts` — Vercel KV-based redirect for deployed fragment short links (`/s/:path*`)

### Legacy public assets

- `public/thirdparty/templates/gradio-developer.svg`
- `public/thirdparty/templates/nextjs-developer.svg`
- `public/thirdparty/templates/streamlit-developer.svg`
- `public/thirdparty/templates/vue-developer.svg`
- `public/thirdparty/templates/code-interpreter-v1.svg`

### Untracked/orphaned files

- `prisma/` directory (untracked, no longer used)
- `lib/db.ts` (untracked, no longer used)

## Files to Simplify

### [lib/schema.ts](lib/schema.ts)

- Remove `morphEditSchema` and its type export (only used by deleted `morph-chat` route)
- Keep `fragmentSchema` and `FragmentSchema` — still used by `useAUIBuilder` for structuring the code preview

### [components/preview.tsx](components/preview.tsx)

- Remove the `DeployDialog` import and its render block (lines 1, 114-124)
- Remove the `FragmentPreview` import and the Preview tab content (lines 3, 99-111, 142-143) — AUI agents don't have a live preview; only the Code tab is relevant
- Remove `getTemplateId` import and `isLinkAvailable` logic (lines 13-14, 44-46)
- Remove `ExecutionResultWeb` import (line 14)
- This simplifies Preview to just the code viewer with a close button

### [components/chat-input.tsx](components/chat-input.tsx)

- Remove `RepoBanner` import (line 3) — the component is never rendered
- Remove `isMultiModal` prop and all multimodal-related logic (file uploads, drag-and-drop, paste handling) — it is always `false` and AUI agents don't use image input
- This significantly simplifies the component

### [lib/types.ts](lib/types.ts)

- Remove `ExecutionResultInterpreter` and `ExecutionResultWeb` types — only used by deleted preview/sandbox components
- Can be reduced to just the base type or removed entirely if Preview no longer needs `ExecutionResult`

## Dependencies to Remove from package.json

### AI SDK providers (LLM ran server-side in the legacy flow; now runs inside E2B via OpenCode)

- `@ai-sdk/anthropic`
- `@ai-sdk/fireworks`
- `@ai-sdk/google`
- `@ai-sdk/google-vertex`
- `@ai-sdk/mistral`
- `@ai-sdk/openai`
- `ollama-ai-provider`

### Legacy integrations

- `@upstash/ratelimit` — only used by deleted rate limiting code
- `@vercel/kv` — only used by deleted middleware and rate limiting
- `core-js` — polyfill, not needed
- `simple-icons` — only used by deleted `chat-picker.tsx`

### Morph

- Remove `MORPH_API_KEY` from `.env.local` (no longer used)

### Note: Keep these

- `ai` package — `DeepPartial` type is used in several places (could replace with a local utility type later, but not strictly necessary now)
- `@e2b/code-interpreter` + `e2b` — core sandbox runtime
- `zod` — schema validation
- `@supabase/supabase-js` — auth (kept per user preference)
- `posthog-js` + `@vercel/analytics` — analytics (kept per user preference)
- All `@radix-ui/*` packages — UI primitives
- `prismjs` — syntax highlighting in code viewer

## Env cleanup

Remove unused keys from `.env.local`:

- `MORPH_API_KEY`
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` (only used by deleted middleware)
- `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW` (only used by deleted rate limiting)

## Verification

After all changes:

- `npm run lint` passes
- `npm run test` passes
- `npm run build` succeeds
- The app starts and the AUI agent flow (runtime start, message, events, turn polling) works end-to-end
