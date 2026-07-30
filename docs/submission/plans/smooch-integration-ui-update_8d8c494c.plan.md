---
name: smooch-integration-ui-update
overview: Update the escalation configuration UI to conditionally guide users to connect Smooch if Zendesk is already connected, otherwise showing the default support contact message.
todos:
  - id: imports
    content: Import useIntegrations, isIntegrationCompleted, and Link in QuackChatChannelEscalationConfiguration.tsx
    status: completed
  - id: logic
    content: Implement isZendeskConnected and isSmoochConnected logic
    status: completed
  - id: render
    content: Update render method to handle the three UI states (Connected, Needs Smooch, Default)
    status: completed
---

