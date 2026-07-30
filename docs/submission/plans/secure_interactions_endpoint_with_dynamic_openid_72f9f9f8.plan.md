---
name: Secure Interactions Endpoint with Dynamic OpenID
overview: Implement dynamic OpenID Connect authentication for the open interactions endpoint. The guard will require `x-auth-domain` and `x-auth-audience` headers to validate the token, throwing an error if missing, to support multi-tenant configurations passed from the frontend.
todos:
  - id: create-openid-guard
    content: Create OpenIdAuthGuard in src/auth/openid-auth.guard.ts
    status: completed
  - id: update-controller-auth
    content: Update KnowledgeHubPublicController to use OpenIdAuthGuard and apply email filter
    status: completed
---

