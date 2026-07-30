---
name: Add Required Field Indicators
overview: Update the OIDC configuration fields in the UI to visually indicate which fields are required (Client ID and Authority) and which are optional (Audience), based on the backend guard implementation.
todos:
  - id: update-oidc-labels
    content: Update labels in OIDCConfigurationFields.tsx to add required field indicators for Client ID and Authority.
    status: pending
  - id: optional-styling
    content: Add optional CSS class in Drawer.module.scss for required field indicator styling if needed.
    status: pending
---

## Plan

Update the OIDC configuration form to clearly mark required fields with an asterisk (*) or similar visual indicator, aligning the UI with the backend validation logic where Client ID and Authority are mandatory, and Audience is optional.

### Files to Modify

1.  **[src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/OIDCConfigurationFields.tsx](src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/OIDCConfigurationFields.tsx)**

    -   Modify the label text for "OIDC Client ID" and "OIDC Authority" to include a visual indicator (e.g., an asterisk).
    -   Optionally, add helper text or a note to clarify that Audience is optional.
    -   Ensure the "Validate Authority" button remains disabled if required fields (`oidcClientId`, `oidcAuthority`) are empty.

2.  **[src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/Drawer.module.scss](src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/Drawer.module.scss)** (Optional)

    -   Add a CSS class for styling the required field indicator (e.g., a red asterisk) if necessary, ensuring it supports both light and dark themes using Radix color tokens.

### Implementation Details

-   The labels for the required fields will be updated from their current text to include an asterisk, for example: "OIDC Client ID *" and "OIDC Authority *".