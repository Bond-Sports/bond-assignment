---
name: Update Auth Headers for OIDC
overview: Update the frontend authentication flow to send the ID Token in the Authorization header instead of the custom x-auth-audience header, aligning with the new backend OpenIdAuthGuard implementation.
todos:
  - id: create-auth-store
    content: Create a new Zustand store ([src/app/store/auth-store.tsx](src/app/store/auth-store.tsx)) to hold the current ID Token and provide actions to set/clear it.
    status: completed
  - id: update-dynamic-auth-provider
    content: Modify [src/lib/providers/dynamic-auth-provider.tsx](src/lib/providers/dynamic-auth-provider.tsx) to listen for auth state changes and sync the ID Token with the new auth store.
    status: completed
  - id: update-api-provider-interceptor
    content: Rewrite the request interceptor in [src/lib/contexts/ApiProvider.context.tsx](src/lib/contexts/ApiProvider.context.tsx) to read the ID Token from the auth store and attach it as an Authorization header, removing the old x-auth-audience logic.
    status: completed
  - id: create-use-auth-token-hook
    content: (Optional) Create a custom hook [src/hooks/use-auth-token.ts](src/hooks/use-auth-token.ts) for easy access to the current token.
    status: completed
---

## Plan: Update Frontend Authentication Headers for New Backend OIDC Guard

### Current State Analysis

- **Backend**: New `OpenIdAuthGuard` expects the ID Token in the standard `Authorization: Bearer <token>` header and validates it against OIDC configuration fetched from S3.
- **Frontend**: Currently sends a custom `x-auth-audience` header and does not attach the user's ID Token to API requests.

### Proposed Changes

#### 1. Create a Global Auth Store for Token Access

**File**: [`src/app/store/auth-store.tsx`](src/app/store/auth-store.tsx) (New File)

- Create a Zustand store to hold the current ID Token.
- This store will be updated by the `DynamicAuthProvider` when the user authenticates.
- The `ApiProvider` will read from this store to attach the token to requests.

#### 2. Update DynamicAuthProvider to Store Token

**File**: [`src/lib/providers/dynamic-auth-provider.tsx`](src/lib/providers/dynamic-auth-provider.tsx)

- Import the new auth store.
- Use the `useAuth` hook to listen for authentication state changes.
- When `auth.isAuthenticated` is true, extract `auth.user?.id_token` and save it to the global auth store.
- When the user logs out, clear the token from the store.

#### 3. Update ApiProvider to Use Bearer Token

**File**: [`src/lib/contexts/ApiProvider.context.tsx`](src/lib/contexts/ApiProvider.context.tsx)

- Import the new auth store.
- Replace the existing request interceptor logic (lines 34-49).
- Remove the `x-auth-audience` header injection.
- Add logic to read the ID Token from the auth store and attach it as `Authorization: Bearer <token>`.
- Handle cases where the token is null (user not authenticated).

#### 4. (Optional) Create a Hook for Token Access

**File**: [`src/hooks/use-auth-token.ts`](src/hooks/use-auth-token.ts) (New File)

- A simple custom hook that returns the current token from the store.
- This provides a clean abstraction for any component that might need direct token access in the future.

### Implementation Steps

1.  **Create Auth Store**: Define the Zustand store with `token` and `setToken`/`clearToken` actions.
2.  **Modify DynamicAuthProvider**: Add `useEffect` hooks to sync auth state with the store.
3.  **Modify ApiProvider**: Rewrite the request interceptor to read from the auth store and set the `Authorization` header.
4.  **Test**: Verify that authenticated requests include the `Authorization` header and that the backend accepts them.

### Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant DynamicAuthProvider
    participant AuthStore
    participant ApiProvider
    participant Backend

    User->>DynamicAuthProvider: Login (signinPopup)
    DynamicAuthProvider->>AuthStore: Set ID Token
    User->>ApiProvider: Make API Request
    ApiProvider->>AuthStore: Read ID Token
    ApiProvider->>Backend: Authorization: Bearer <token>
    Backend->>Backend: Validate token against OIDC config
    Backend-->>ApiProvider: Response
```



### Files to be Modified

- [`src/lib/providers/dynamic-auth-provider.tsx`](src/lib/providers/dynamic-auth-provider.tsx)
- [`src/lib/contexts/ApiProvider.context.tsx`](src/lib/contexts/ApiProvider.context.tsx)

### Files to be Created