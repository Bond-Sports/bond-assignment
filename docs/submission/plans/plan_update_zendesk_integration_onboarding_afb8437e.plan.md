---
name: "Plan: Update Zendesk Integration Onboarding"
overview: Implement a new `createSmoochIntegration` endpoint in Ticket System Gateway to handle Zendesk+Smooch onboarding, and update Session Tracker to fetch this configuration dynamically.
todos:
  - id: gateway_smooch_client
    content: "[Gateway] Implement getSwitchboardId in SmoochLivechatClient"
    status: completed
  - id: gateway_zendesk_client
    content: "[Gateway] Implement getDefaultGroup and getDefaultBrand in ZendeskClient"
    status: completed
  - id: gateway_dto
    content: "[Gateway] Create CreateSmoochIntegrationDto"
    status: completed
  - id: gateway_service
    content: "[Gateway] Implement createSmoochIntegration and getZendeskConfig in IntegrationService"
    status: completed
  - id: gateway_controller
    content: "[Gateway] Add endpoints to IntegrationController"
    status: completed
  - id: st_config_service
    content: "[SessionTracker] Create IntegrationConfigService"
    status: completed
  - id: st_guard
    content: "[SessionTracker] Update AuthExternalZendeskGuard"
    status: completed
  - id: st_smooch_client
    content: "[SessionTracker] Update SmoochClient"
    status: completed
---

# Plan: Zendesk + Smooch Integration Onboarding

## Overview

We will implement a dedicated onboarding flow for Zendesk integrations that includes Smooch (Sunshine Conversations) credentials. This involves creating a new endpoint in `ticket-system-gateway` that validates credentials, fetches external IDs (Switchboard, Group, Brand), and stores the configuration. We will then update `session-tracker` to fetch this configuration dynamically instead of using hardcoded values.

## Steps

### 1. Ticket System Gateway (`ticket-system-gateway`)

#### A. Modify `SmoochLivechatClient`

- **[src/livechat-systems/client/smooch-livechat/smooch-livechat.client.ts](../ticket-system-gateway/src/livechat-systems/client/smooch-livechat/smooch-livechat.client.ts)**
    - Import `QuackHttpService` (or `HttpService`).
    - Implement `getSwitchboardId(appId: string, keyId: string, secretKey: string): Promise<string>`.
        - Use the Switchboards API to list switchboards and return the ID.

#### B. Modify `ZendeskClient`

- **[src/ticket-systems/zendesk/client/zendesk.client.ts](../ticket-system-gateway/src/ticket-systems/zendesk/client/zendesk.client.ts)**
    - Implement `getDefaultGroup(tenantId: string): Promise<string>`.
        - Reuse `getGroups` or call Zendesk Groups API.
        - Filter for `default: true`.
    - Implement `getDefaultBrand(tenantId: string): Promise<string>`.
        - Reuse `getBrands` or call Zendesk Brands API.
        - Filter for `default: true`.
    - **Note:** Ensure these methods use the Zendesk credentials (email/token) stored/provided, as Smooch keys may not work for Support API.

#### C. Integration DTOs

- **[src/integration/controller/integration.dto.ts](../ticket-system-gateway/src/integration/controller/integration.dto.ts)**
    - Create `CreateSmoochIntegrationDto`.
        - Extend or include fields: `tenantId`, `email`, `token`, `subdomain` (Zendesk).
        - Add fields: `appId`, `keyId`, `secretKey`, `webhookId`, `sharedSecret` (Smooch).

#### D. Integration Service

- **[src/integration/service/integration.service.ts](../ticket-system-gateway/src/integration/service/integration.service.ts)**
    - Implement `createSmoochIntegration(params: CreateSmoochIntegrationDto)`.
        - Fetch `switchboardId` via `SmoochLivechatClient`.
        - Fetch `defaultGroupId` and `defaultBrandId` via `ZendeskClient`.
        - Prepare metadata: `{ subdomain, appId, agentWorkspaceSwitchboardIntegration, defaultGroupOnEscalation, defaultBrandId }`.
        - Prepare secret: `{ email, token, username (keyId), password (secretKey), sharedSecret }`.
        - Save/Update Integration record and Secret.
    - Implement `getZendeskConfig(tenantId: string)`.
        - Retrieve Integration metadata.
        - Retrieve Secret value.
        - Return combined config.

#### E. Integration Controller

- **[src/integration/controller/integration.controller.ts](../ticket-system-gateway/src/integration/controller/integration.controller.ts)**
    - Add POST `/integration/smooch` (or `/integration/zendesk-smooch`) mapped to `createSmoochIntegration`.
    - Add GET `/integration/tenants/:tenantId/zendesk-config` mapped to `getZendeskConfig`.

### 2. Session Tracker (`session-tracker`)

#### A. Integration Config Service

- **`src/config/integration-config.service.ts`** (Create new)
    - Implement `IntegrationConfigService`.
    - Method `getZendeskConfig(tenantId: string)` (or similar).
    - Call Gateway's `zendesk-config` endpoint.
    - Implement caching (e.g., in-memory or Redis) to avoid hitting Gateway on every request.

#### B. Update Guard

- **[src/auth/auth.external-zendesk.guard.ts](session-tracker/src/auth/auth.external-zendesk.guard.ts)**
    - Inject `IntegrationConfigService`.
    - In `canActivate`, fetch config using the received API key (which corresponds to `sharedSecret` or `webhookId`? Need to clarify mapping).
        - *Correction*: The guard currently keys off a `receivedApiKey` which looks like a long string.
        - The user said: "the `subdomain` is saved to the `metadata`...".
        - The guard currently iterates over a hardcoded object where keys are "API keys".
        - We need to determine how to map the incoming request to a tenant. The current `receivedApiKey` might be the `sharedSecret` or a generated key.
        - **Assumption**: The `x-api-key` header contains the identifier that we can map to a tenant/config. If it's the `sharedSecret`, we might need to search for it, or the user passes a Tenant ID.
        - *Wait*, `AuthExternalZendeskGuard` uses `x-api-key`. In the hardcoded config, this key maps to the config.
        - If we use dynamic config, we need a way to look up the config by this key.
        - **Strategy**: 

            1. If the key is unique (like `sharedSecret` or `webhookId`), we can lookup by it?
            2. Or maybe the `IntegrationConfigService` fetches *all* Zendesk configs and caches them, allowing lookup by key?
            3. Given the requirement "cache it so it won't make a request for every request", fetching all or lazily fetching/caching seems appropriate.
            4. I will implement `IntegrationConfigService` to manage this lookup.

#### C. Update Smooch Client

- **[src/clients/smooch/smooch.client.ts](session-tracker/src/clients/smooch/smooch.client.ts)**
    - Update `getSmoochConfig`.
    - Use `IntegrationConfigService` to get `appId`, `switchboardId`, etc.

## Verification

- Test `createSmoochIntegration` with valid credentials (mocked if necessary).
- Verify `session-tracker` can fetch and use the config.