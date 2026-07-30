---
name: Smooch Integration Frontend Implementation Plan
overview: ""
todos:
  - id: model-assets
    content: Update Integration.model.ts and gallery items
    status: completed
  - id: api-impl
    content: Implement createSmoochIntegration API in Integration.api.ts
    status: completed
  - id: listing-logic
    content: Update config and Integrations.tsx for conditional rendering
    status: completed
  - id: form-impl
    content: Implement SmoochConnectForm with tooltip in ConnectIntegration.tsx
    status: completed
  - id: flow-integration
    content: Integrate Smooch creation flow in AddIntegration.tsx
    status: completed
---

# Smooch Integration Frontend Implementation Plan

I will implement the frontend support for Smooch integration under a new "CHAT" category. This integration will only be available when a Zendesk Ticket System is already connected.

## Proposed Changes

### 1. Integration Model & Assets

- **File**: [`src/api/integration/Integration.model.ts`](src/api/integration/Integration.model.ts)
- Add `smooch` to `chatIntegrationNames` and `supportedChat`.
- **File**: [`src/api/integration/integrationNameToGalleryItem.tsx`](src/api/integration/integrationNameToGalleryItem.tsx)
- Add `smooch` to gallery items with the Zendesk logo (as it's a Zendesk product).

### 2. API Implementation

- **File**: [`src/api/integration/Integration.api.ts`](src/api/integration/Integration.api.ts)
- Add `createSmoochIntegration` function.
- **Endpoint**: `POST /sessions-api/integrations`
- **Payload**:
    ```json
            {
              "params": {
                "tenantId": "string",
                "type": "SMOOCH",
                "appId": "string",
                "keyId": "string",
                "secretKey": "string"
              }
            }
    ```




- Create a hook `useCreateSmoochIntegration` that uses `useWorkspace` to get the `tenantId`.

### 3. Integration Listing & Logic

- **File**: [`src/features/integrations/add-integration/addIntegrationConfigs.ts`](src/features/integrations/add-integration/addIntegrationConfigs.ts)
- Enable `CHAT` configuration.
- **File**: [`src/features/integrations/Integrations.tsx`](src/features/integrations/Integrations.tsx)
- Render `CHAT` section.
- **Conditional Logic**: Only show "Smooch" option if `zendesk` (Ticket System) integration exists and is completed.

### 4. Connection Flow & Form

- **File**: [`src/features/integrations/add-integration/AddIntegration.tsx`](src/features/integrations/add-integration/AddIntegration.tsx)
- Handle `CHAT` type selection.
- Integrate `useCreateSmoochIntegration`.
- Handle submission for Smooch type specifically to call the new API.
- **File**: [`src/features/integrations/add-integration/connect-integration/ConnectIntegration.tsx`](src/features/integrations/add-integration/connect-integration/ConnectIntegration.tsx)
- Create `SmoochConnectForm`.
- **Fields**: `App ID` (appId), `Key ID` (keyId), `Secret Key` (secretKey).
- **Tooltip/Instruction**: Add an information tooltip with the following guide:

> "Create an API token> Login to your Zendesk and go to the Admin page.> Scroll down to the “Conversations API” tab under “APIs”.> Click on “Create API key”.> Name the API key “Quack AI” and copy the “App ID”, “Key ID” and “Secret Key”."

## Verification

- Verify `CHAT` section appears only when Zendesk is connected.