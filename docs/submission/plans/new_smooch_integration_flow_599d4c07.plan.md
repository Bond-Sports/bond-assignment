---
name: New Smooch Integration Flow
overview: Implement a new onboarding and consumption flow for Smooch integrations that splits sensitive credentials (AWS Secrets) from metadata (Session Tracker DB) and uses signature verification for webhooks. Uses a new SessionTrackerClient in TSG.
todos:
  - id: st-schema
    content: Update Schema and Repository in Session Tracker
    status: completed
  - id: st-service
    content: Update Service and DTO in Session Tracker
    status: completed
  - id: tsg-clients
    content: Create SessionTrackerClient and Update SmoochClient in TSG
    status: completed
  - id: tsg-logic
    content: Update createSmoochIntegration in TSG
    status: completed
  - id: st-guard
    content: Implement new logic in AuthExternalZendeskGuard
    status: in_progress
    dependencies:
      - st-schema
      - st-service
---

# New Smooch Integration Flow

This plan implements a secure, split-storage architecture for Smooch integrations, moving metadata ownership to `session-tracker` and enabling automated webhook verification.

## 1. Session Tracker (`session-tracker`)

### Schema & Data Access

- **Update Schema**: Modify `schema.prisma` to:
    - Add `SMOOCH` to `ExternalChatIntegrationType` enum.
    - Add `metadata` (Json, nullable) field to `ExternalChatIntegration` model.
- **Run Migration**: Create and run migration.
- **Repository**: Update `ExternalChatIntegrationRepository` to support `metadata` in `upsert`.
- **DTO**: Update `UpsertExternalChatIntegrationDto` to include optional `metadata`.
- **Service**: Update `ExternalChatIntegrationService` to pass `metadata` to the repository.

### Authentication (Consumption)

- **Update `AuthExternalZendeskGuard`**:
    - **Step 1**: Check for `app` object in request body (Smooch signature).
    - **Step 2**: If present, extract `appId` (`_id`) and lookup `ExternalChatIntegration`.
    - **Step 3**: Verify signature using `externalChatIntegration.encryptedSecret`.
    - **Step 4**: If valid, extract `tenantId` and `metadata` (switchboardId, etc.) from the DB record.
    - **Step 5**: Fetch Zendesk credentials (`email`, `token`, `subdomain`) from `IntegrationConfigService` (in-memory cache) using `tenantId`.
    - **Step 6**: Merge all data (Metadata + Zendesk Creds + Smooch Creds) into `req.auth`.
    - **Fallback**: Maintain existing API Key logic for backward compatibility.

## 2. Ticket System Gateway (`ticket-system-gateway`)

### Clients

- **Update `SmoochClient`**: Add `createWebhook` method (calls `POST /v2/apps/:appId/integrations`).
- **Create `SessionTrackerClient`**:
    - Create new directory/files: `src/clients/session-tracker/session-tracker.client.ts` (and module/types).
    - **Config**: Add `SESSION_TRACKER_BASE_URL` to configuration service.
    - **Method**: Add `upsertExternalChatIntegration` method (calls `POST /external-chat-integration/upsert`).

### Onboarding (Creation)

- **Update `IntegrationService.createSmoochIntegration`**:
    - **Input**: `tenantId`, `appId`, `keyId`, `secretKey` (No sharedSecret).
    - **Prerequisite**: Fetch existing Zendesk secret to validate `email`/`token` existence.
    - **External Fetch**: Fetch external IDs (`switchboardId`, `groupId`, `brandId`) using provided credentials.
    - **AWS Secret**: Store **only** `username` (`keyId`) and `password` (`secretKey`) in `integrations/${tenantId}/smooch`.
    - **Smooch API**: Call `SmoochClient.createWebhook` to create the webhook and get the `secret`.
    - **Session Tracker Sync**: Call `SessionTrackerClient.upsertExternalChatIntegration` to store:
        - `type`: `SMOOCH`
        - `appId`: `params.appId`
        - `tenantId`: `params.tenantId`
        - `secret`: Webhook Secret (from Smooch)
        - `metadata`: `{ switchboardId, defaultGroup, defaultBrand, ... }`
    - **Database**: Create a minimal `Integration` record in TSG (type `CHAT`, name `smooch`) for visibility/listing.

## 3. Execution Steps

1.  **Session Tracker**: Schema changes & Repository updates.
2.  **Session Tracker**: Update Controller DTO & Service.
3.  **Ticket System Gateway**: Create `SessionTrackerClient` & Update `SmoochClient`.
4.  **Ticket System Gateway**: Update `createSmoochIntegration` logic.
5.  **Session Tracker**: Implement new logic in `AuthExternalZendeskGuard`.