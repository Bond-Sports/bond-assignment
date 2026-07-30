---
name: Centralize OIDC Redirect URI
overview: Update the authentication configuration to support a centralized redirect URI for widget deployments, allowing OIDC popups to work correctly when embedded on third-party domains.
todos:
  - id: update-config-model
    content: Add oidcRedirectUri to AuthConfig in config.model.ts
    status: completed
  - id: update-auth-provider
    content: Update DynamicAuthProvider to use configurable redirect_uri
    status: completed
    dependencies:
      - update-config-model
---

