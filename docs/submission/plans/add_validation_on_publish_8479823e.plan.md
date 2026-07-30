---
name: Add Validation on Publish
overview: Modify the publish flow to validate that required OIDC fields (Client ID and Authority) are filled before allowing the configuration update, showing a toast error if validation fails.
todos:
  - id: add-validation-logic
    content: Add validation logic for required OIDC fields in ConfigurationDrawer.tsx handleSave.
    status: in_progress
  - id: add-toast-error
    content: Integrate toast notification to display validation errors on publish.
    status: pending
  - id: optional-consistent-validation
    content: Apply the same validation logic to the main customization drawer (index.tsx) for consistency if applicable.
    status: pending
---

## Plan

Update the publish mechanism in the Knowledge Hub configuration drawers to validate required OIDC fields (Client ID and Authority) when the "Publish" button is clicked. If validation fails, display a toast error and prevent the configuration update.

### Files to Modify

1.  **[src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/ConfigurationDrawer.tsx](src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/ConfigurationDrawer.tsx)**

    -   Update the `handleSave` callback to include validation logic.
    -   Check if `localConfig.auth?.enabled` is true and, if so, verify that `localConfig.auth.oidcClientId` and `localConfig.auth.oidcAuthority` are non-empty strings.
    -   If validation fails, trigger a toast notification with an appropriate error message and return early to prevent the `updateConfiguration` call.
    -   Ensure the "Validate Authority" button remains enabled regardless of field content.

2.  **[src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/index.tsx](src/features/automation-configuration/knowledge-hub-channel/knowledge-hub/parts/drawer/index.tsx)** (Optional but recommended for consistency)

    -   Apply the same validation logic to the main customization drawer if it also handles OIDC fields, ensuring a consistent user experience across both drawers.

### Implementation Details

-   The validation will occur within the `handleSave` function, which is triggered by the "Publish" button.
-   A toast library (likely already integrated in the project) will be used to display the error message.
-   The validation will only apply if the authentication switch is enabled (`localConfig.auth?.enabled`).