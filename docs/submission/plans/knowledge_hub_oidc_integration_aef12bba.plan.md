---
name: Knowledge Hub OIDC Integration
overview: Implement OIDC authentication using `react-oidc-context`. This involves updating the configuration model, creating a dynamic auth provider that conditionally enables OIDC, integrating it into the app entry points, and adding UI components for login/logout.
todos:
  - id: install-deps
    content: Install dependencies
    status: completed
  - id: update-config-model
    content: Update config.model.ts
    status: completed
    dependencies:
      - install-deps
  - id: create-user-store
    content: Create user-store.ts
    status: completed
    dependencies:
      - update-config-model
  - id: create-auth-provider
    content: Create dynamic-auth-provider.tsx
    status: completed
    dependencies:
      - create-user-store
  - id: create-callback
    content: Create auth-callback.html
    status: completed
  - id: integrate-provider
    content: Integrate DynamicAuthProvider in entry points
    status: completed
    dependencies:
      - create-auth-provider
  - id: create-ui
    content: Create LoginButton.tsx and UserProfile.tsx
    status: completed
    dependencies:
      - integrate-provider
---

# Knowledge Hub OIDC Integration Plan

## Phase 1: Dependencies & Configuration

- [ ] **Install OIDC Libraries**
- `npm install react-oidc-context oidc-client-ts`
- [ ] **Update Configuration Model**
- Edit [`src/entities/config/config.model.ts`](src/entities/config/config.model.ts) to add `AuthConfig` interface and `auth` property to `KnowledgeHubConfiguration`.
- [ ] **Verify Config Store**
- Check [`src/app/store/config-store.tsx`](src/app/store/config-store.tsx) to ensure it handles the new nested `auth` object (existing `deepMerge` should handle this).

## Phase 2: State Management & Stores

- [ ] **Create User Store** (User Requested)
- Create `src/app/store/user-store.ts` using Zustand.
- This store will mirror the authenticated user state for access outside the OIDC context if needed, or simply provide a simplified user interface.
- [ ] **OIDC Persistence**
- Ensure the OIDC `UserManager` is configured with `userStore: new WebStorageStateStore({ store: window.localStorage })` to satisfy the persistence requirement.

## Phase 3: Dynamic Auth Provider

- [ ] **Create `DynamicAuthProvider`**
- Create [`src/lib/providers/dynamic-auth-provider.tsx`](src/lib/providers/dynamic-auth-provider.tsx).
- **Logic:**
  - Read `config` from `useConfigStore`.
  - If `config.auth.enabled` is false, render children directly.
  - If true, configure `AuthProvider` with `oidcConfig`.
  - Set `redirect_uri` to `${window.location.origin}/auth-callback.html`.
  - Sync auth state to `userStore` (optional/if needed).
- [ ] **Integrate Provider**
- **Modify [`src/sdk/main.tsx`](src/sdk/main.tsx)**: Wrap `PreviewAppLayout` (or `ThemeProvider`) with `<DynamicAuthProvider>` **inside** `ApiProvider`.
- **Modify [`src/app/main.tsx`](src/app/main.tsx)**: Wrap `SidebarProvider` (or `ThemeProvider`) with `<DynamicAuthProvider>` **inside** `ApiProvider`.

## Phase 4: Auth Callback

- [ ] **Create Static Callback**
- Create [`public/auth-callback.html`](public/auth-callback.html).
- Implement basic OIDC callback logic (`oidc.UserManager().signinPopupCallback()`).

## Phase 5: UI Components

- [ ] **Create Auth Feature**
- Create directory `src/features/auth`.
- [ ] **Create Login Button**
- Create [`src/features/auth/LoginButton.tsx`](src/features/auth/LoginButton.tsx).
- Implement Login/Logout logic using `useAuth`.
- [ ] **Create User Profile**
- Create [`src/features/auth/UserProfile.tsx`](src/features/auth/UserProfile.tsx) to display user info.

## Phase 6: Verification

- [ ] **Local Testing**
- Verify flow on `http://localhost:8080` (App) and `http://localhost:8081` (Lib/Widget).
- [ ] **Security Checks**
- Verify PKCE and no client secret in bundle.