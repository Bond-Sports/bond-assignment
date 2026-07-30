---
name: smooch-integration-button
overview: Add a "Connect to Live Agent" button in the escalation configuration page that appears when Zendesk is connected but Smooch is not, redirecting users to the integration settings.
todos:
  - id: import-hooks
    content: Import useIntegrations and isIntegrationCompleted in QuackChatChannelEscalationConfiguration.tsx
    status: pending
  - id: implement-checks
    content: Implement integration status checks for Zendesk and Smooch
    status: pending
  - id: add-button
    content: Add conditional rendering for the Connect to Live Agent button
    status: pending
---

