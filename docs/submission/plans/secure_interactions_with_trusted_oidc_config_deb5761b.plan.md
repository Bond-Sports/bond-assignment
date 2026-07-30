---
name: Secure Interactions with Trusted OIDC Config (Prepared)
overview: Prepare the OpenIdAuthGuard for a future migration to use trusted OIDC configuration from S3 storage instead of frontend headers. The logic will be added as a commented-out helper function to avoid changing current behavior while providing a clear path for security enhancement.
todos:
  - id: prepare-trusted-config-logic
    content: Add commented logic for trusted S3 config fetch in OpenIdAuthGuard
    status: completed
---

# Secure Interactions with Trusted OIDC Config (Prepared)

This plan prepares the `OpenIdAuthGuard` for a future migration to use trusted OIDC configuration from S3 storage instead of frontend headers. The logic will be added as a commented-out helper function to avoid changing current behavior while providing a clear path for security enhancement.

## Changes

1.  **Update Guard**: `src/auth/openid-auth.guard.ts`

    -   Add a commented-out logic block inside `canActivate` or as a helper method.
    -   **Logic (Commented)**:
        -   Injection of `PrismaReadonlyService` and `CustomerFacingConfigurationsService`.
        -   Extraction of `tenantId` from URL params.
        -   DB lookup for the configuration token.
        -   S3 fetch for the trusted JSON config.
        -   Extraction of `oidcAuthority` and `oidcAudience`.
    -   **Note**: This logic is NOT called yet. The guard continues to use headers for now.

## Verification