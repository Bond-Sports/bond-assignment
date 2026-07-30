---
name: Extract Salesforce Session Service
overview: Extract `createSalesforceChatSessionIfNotCreated` and related logic into a new `QuackchatSalesforceSessionService` to resolve circular dependencies and simplify the architecture.
todos:
  - id: create-service
    content: Create `src/quackchat/service/live-chat-systems/quackchat-salesforce-session.service.ts`
    status: completed
  - id: register-module
    content: Register service in `src/quackchat/service/quackchat.module.ts`
    status: completed
  - id: update-close-chat
    content: Update `src/quackchat/service/decision-action-handlers/quackchat-close-chat.service.ts` to use new service
    status: completed
  - id: update-salesforce-service
    content: Update `src/quackchat/service/live-chat-systems/quackchat-salesforce.service.ts` to remove extracted methods and forwardRef
    status: in_progress
isProject: false
---

1.  **Create `QuackchatSalesforceSessionService`**:

- Create `src/quackchat/service/live-chat-systems/quackchat-salesforce-session.service.ts`.
- Implement `createSalesforceChatSessionIfNotCreated`.
- Implement `checkIfSalesforceChatSessionAlreadyCreated` (private).
- Implement `getChatSession` (private helper using `PrismaReadonlyService`).
- Inject required dependencies: `QuackLoggerService`, `TicketSystemGatewayClient`, `ChatSessionService`, `PrismaReadonlyService`.

2.  **Update `QuackchatModule`**:

- Register `QuackchatSalesforceSessionService` in `providers` and `exports`.

3.  **Update `QuackchatDecisionCloseChatService`**:

- Inject `QuackchatSalesforceSessionService` instead of `QuackchatSalesforceService`.
- Update usage to call `createSalesforceChatSessionIfNotCreated` from the new service.
- Remove `forwardRef` usage.

4.  **Update `QuackchatSalesforceService`**:

- Remove `createSalesforceChatSessionIfNotCreated`.
- Remove `checkIfSalesforceChatSessionAlreadyCreated`.
- Remove `forwardRef` usage for `QuackchatDecisionCloseChatService` (but keep the dependency if needed for `closeChat`, but without `forwardRef` if the cycle is broken).
- Wait, `QuackchatSalesforceService` needs `QuackchatDecisionCloseChatService`. `QuackchatDecisionCloseChatService` will now depend on `QuackchatSalesforceSessionService`. `QuackchatSalesforceSessionService` does NOT depend on `QuackchatSalesforceService`. So `QuackchatDecisionCloseChatService` does NOT depend on `QuackchatSalesforceService`. The cycle is broken.
- Remove `forwardRef` from the `QuackchatDecisionCloseChatService` injection in `QuackchatSalesforceService`.

5.  **Verify**:

- Run tests to ensure everything still works.
