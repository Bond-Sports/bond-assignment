---
name: Organize Auth and Feature Flags
overview: Centralize feature capability logic into a dedicated hook and update the configuration model to support dynamic OIDC scopes. This resolves the `AuthProvider` context error and improves code organization.
todos:
  - id: update-config-model
    content: Update config.model.ts to include oidcScope
    status: completed
  - id: update-auth-provider
    content: Update dynamic-auth-provider.tsx to use configurable scope
    status: completed
    dependencies:
      - update-config-model
  - id: create-features-hook
    content: Create use-app-features.ts hook
    status: completed
    dependencies:
      - update-config-model
  - id: refactor-app-layout
    content: Refactor AppLayout to use useAppFeatures
    status: completed
    dependencies:
      - create-features-hook
  - id: refactor-tickets-indicator
    content: Refactor OpenTicketsIndicator to use useAppFeatures
    status: completed
    dependencies:
      - create-features-hook
  - id: refactor-sidebar
    content: Refactor AppSidebar to use useAppFeatures
    status: completed
    dependencies:
      - create-features-hook
---

