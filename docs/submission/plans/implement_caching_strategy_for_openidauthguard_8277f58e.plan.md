---
name: Implement Caching Strategy for OpenIdAuthGuard
overview: ""
todos: []
---

# Implement Caching Strategy for OpenIdAuthGuard

To avoid repeated S3 and database calls for tenant configuration, we will implement an in-memory caching strategy within `OpenIdAuthGuard` using a `Map` with a TTL (Time To Live).

## Proposed Changes

### [src/auth/openid-auth.guard.ts](src/auth/openid-auth.guard.ts)

1.  **Define Cache Interface**: Define a `CacheEntry` type to store the configuration and its expiration time.
    ```typescript
            type CacheEntry = {
              config: any; // or the specific Configuration type
              expiresAt: number;
            };
    ```




2.  **Add Cache Properties**: Add private properties to the `OpenIdAuthGuard` class for the cache storage and TTL configuration.

    -   `private readonly configCache = new Map<string, CacheEntry>();`
    -   `private readonly cacheTtlMs = 5 * 60 * 1000;` (5 minutes)

3.  **Implement `getTenantConfig` Method**: Create a private helper method to encapsulate the caching logic.

    -   **Check Cache**: Check if the `tenantId` exists in `configCache` and if `Date.now() < expiresAt`. If valid, return the cached config.
    -   **Fetch on Miss**:
        -   Perform the database lookup for `configRecord`.
        -   Perform the S3 fetch using `customerFacingConfigurationsService`.
    -   **Update Cache**: Store the fetched configuration in `configCache` with a new expiration time.
    -   **Return**: Return the configuration.

4.  **Update `canActivate`**: Refactor `canActivate` to use `this.getTenantConfig(tenantId)` instead of the direct DB/S3 calls.

## Verification