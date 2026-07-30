---
name: Smooch Integration Frontend Implementation Plan
overview: ""
todos:
  - id: model-update
    content: Update Integration.model.ts with smooch support
    status: pending
  - id: gallery-update
    content: Add Smooch to integration gallery items
    status: pending
  - id: config-update
    content: Enable CHAT in addIntegrationConfigs.ts
    status: pending
  - id: rendering-logic
    content: Implement conditional rendering in Integrations.tsx
    status: pending
  - id: flow-update
    content: Update AddIntegration.tsx flow for CHAT
    status: pending
  - id: form-creation
    content: Create SmoochConnectForm in ConnectIntegration.tsx
    status: pending
---

# Smooch Integration Frontend Implementation Plan

I have drafted the changes to add the Smooch integration option under a new "CHAT" category, visible only when Zendesk is connected.

## Proposed Changes

### 1. Integration Model & Config

- **File**: [`src/api/integration/Integration.model.ts`](src/api/integration/Integration.model.ts)
- Add `smooch` to `chatIntegrationNames` and `supportedChat`.
- **File**: [`src/features/integrations/add-integration/addIntegrationConfigs.ts`](src/features/integrations/add-integration/addIntegrationConfigs.ts)
- Enable `CHAT` configuration with title "Connect communication" and `supportedChat` options.
- **File**: [`src/api/integration/integrationNameToGalleryItem.tsx`](src/api/integration/integrationNameToGalleryItem.tsx)
- Add `smooch` gallery item (using Zendesk logo as placeholder/dependency indicator).

### 2. Integration Listing & Logic

- **File**: [`src/features/integrations/Integrations.tsx`](src/features/integrations/Integrations.tsx)
- Add `CHAT` section rendering.
- Implement conditional logic: Show "Smooch" option **only** if a Zendesk Ticket System integration is connected.
- Filter `chatOptions` to remove `smooch` if Zendesk is missing.

### 3. Add Integration Flow

- **File**: [`src/features/integrations/add-integration/AddIntegration.tsx`](src/features/integrations/add-integration/AddIntegration.tsx)
- Handle `CHAT` type selection.
- Route `smooch` to the manual connection form (skipping Nango).
- Handle `CHAT` integration creation submission.

### 4. Connection Form

- **File**: [`src/features/integrations/add-integration/connect-integration/ConnectIntegration.tsx`](src/features/integrations/add-integration/connect-integration/ConnectIntegration.tsx)
- Create `SmoochConnectForm` component.
- Fields: **App ID**, **Key ID**, **Secret Key**.
- **Payload Mapping** (to match backend requirements):
    - `App ID` -> `subdomain`
    - `Key ID` -> `email`
    - `Secret Key` -> `token`

## Verification

- Ensure the "CHAT" section appears.