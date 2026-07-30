---
name: Fix Auth Context and Provider Nesting
overview: Resolve the AuthProvider context error by refactoring DynamicAuthProvider to use an internal sync component and adjusting the provider nesting in main.tsx.
todos:
  - id: refactor-dynamic-auth-provider-sync
    content: Refactor [src/lib/providers/dynamic-auth-provider.tsx](src/lib/providers/dynamic-auth-provider.tsx) to move useAuth() and sync logic into a child component (AuthTokenSync).
    status: pending
  - id: reorder-providers-main-tsx
    content: Update [src/app/main.tsx](src/app/main.tsx) to swap the order of ApiProvider and DynamicAuthProvider.
    status: pending
---

