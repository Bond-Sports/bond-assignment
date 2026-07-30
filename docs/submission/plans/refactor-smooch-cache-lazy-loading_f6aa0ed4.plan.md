---
name: ""
overview: ""
todos: []
---

# Refactor SmoochIntegrationCacheService to Lazy Loading

## Overview

Replace the periodic background refresh (Cron) with an on-demand "fetch-if-expired" strategy. Since we must decrypt all keys to perform a reverse lookup by API Key, we will continue to fetch all integrations at once, but only when requested and if the cache is stale.

## Implementation Steps

### 1. Modify `SmoochIntegrationCacheService`

**File**: `src/repositories/external-chat-integration/service/smooch-integration-cache.service.ts`**Changes**:

- Remove `@nestjs/schedule` imports (`Cron`, `CronExpression`) and `OnModuleInit` interface
- Remove the `refreshSmoochIntegrationCache` method decorated with `@Cron`
- Remove `onModuleInit` method
- Add a `CACHE_TTL` constant (e.g., 15 minutes = 900000 ms)
- Add a state variable `lastCacheUpdate: number | null = null` to track freshness
- Add a private `refreshCache` method (extract the refresh logic from the old cron method)
- Implement a private `ensureCache()` async method:
- Check if cache exists and is fresh: `this.lastCacheUpdate !== null && Date.now() - this.lastCacheUpdate < CACHE_TTL`
- If valid, return early
- If expired or missing, call `refreshCache()` to fetch all integrations, decrypt, and rebuild both `integrationCache` and `tenantCache`
- Update `lastCacheUpdate = Date.now()`
- Update `getIntegrationByApiKey` to be `async`:
- Call `await this.ensureCache()` first
- Return `this.integrationCache.get(apiKey)` or `undefined`
- Update `getIntegrationByTenantId` to be `async`:
- Call `await this.ensureCache()` first
- Return `this.tenantCache.get(tenantId)` or `undefined`

### 2. Update Auth Guard

**File**: `src/auth/auth.external-zendesk.guard.ts`**Changes**:

- In `canActivateDynamic` method (line 88):
- Change `this.smoochCacheService.getIntegrationByApiKey(receivedApiKey)` to `await this.smoochCacheService.getIntegrationByApiKey(receivedApiKey)`

### 3. Update Zendesk Client

**File**: `src/clients/zendesk/zendesk.client.service.ts`**Changes**:

- In `getDynamicChatConfigByOwner` method (line 20):
- Change `this.smoochIntegrationCacheService.getIntegrationByTenantId(owner)` to `await this.smoochIntegrationCacheService.getIntegrationByTenantId(owner)`

## Notes

- The cache will be refreshed on the first request after startup or after TTL expiration
- Since we have few integrations, the decrypt operation on first load should be fast