---
name: Replace HTML Auth Files with React Components
overview: Replace `auth-callback.html` and `silent-renew.html` with React components and routes to unify the codebase and leverage the existing React build system.
todos:
  - id: create-callback
    content: Create src/app/routes/auth/auth-callback-page.tsx
    status: completed
  - id: create-renew
    content: Create src/app/routes/auth/silent-renew-page.tsx
    status: completed
  - id: update-router
    content: Update src/app/routes/index.tsx with new routes
    status: completed
  - id: update-provider
    content: Update redirect URIs in src/lib/providers/dynamic-auth-provider.tsx
    status: completed
  - id: delete-html
    content: Delete legacy HTML files in public/
    status: completed
---

