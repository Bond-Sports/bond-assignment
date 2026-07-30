---
name: smooch-integration-button
overview: Add a "Connect to Live Agent" button and documentation link in the escalation configuration page for users with Zendesk connected but Smooch disconnected.
todos:
  - id: import-hooks
    content: Import useIntegrations and isIntegrationCompleted in QuackChatChannelEscalationConfiguration.tsx
    status: pending
  - id: implement-checks
    content: Implement integration status checks for Zendesk and Smooch using useIntegrations hook
    status: pending
  - id: update-ui
    content: Replace default text with conditional rendering of Connect Button and Doc Link when Zendesk is connected but Smooch is missing
    status: pending
---

