---
name: implement-test-endpoint-ai-reply
overview: Implement a test endpoint to fetch conversation transcript from Smooch/Zendesk, generate an AI reply, and return it.
todos:
  - id: fix-smooch-client
    content: Refactor SmoochClient.getConversationMessages to return messages
    status: completed
  - id: implement-service-logic
    content: Implement handleUserMessageApi in ChatSessionService with Smooch integration
    status: completed
  - id: add-endpoint
    content: Add API DTO and Endpoint to ChatSessionController
    status: completed
---

1.  **Update `SmoochClient`** (`src/clients/smooch/smooch.client.ts`):

    -   Refactor `getConversationMessages` to perform a `GET` request to `v2/apps/${appId}/conversations/${conversationId}/messages` and return the messages.
    -   Ensure the response type is properly defined (similar to `SmoochSendMessageResponse['messages']`).

2.  **Update `ChatSessionService`** (`src/chat-session/service/chat-session.service.ts`):

    -   In `handleUserMessageApi`, replace the TODO.
    -   Call `smoochClient.getConversationMessages(owner, conversationId)`.
    -   Map the returned messages to `ChatConversation` structure:
        -   Map `author.type` 'user' to 'user' role.
        -   Map `author.type` 'business' to 'assistant' role.
        -   Map `content.text` to `content`.
    -   Ensure the conversation history is passed to the AI client.

3.  **Create DTO** (`src/chat-session/controller/chat-session.controller.dto.ts`):

    -   Create `HandleUserMessageApiDto` with:
        -   `conversationId`: string (required)
        -   `owner`: string (required, as per user clarification)
        -   `token`: string (optional)
        -   `identifyPayload`: object (optional)

4.  **Update `ChatSessionController`** (`src/chat-session/controller/chat-session.controller.ts`):

    -   Add `@Post('api/message')` endpoint.
    -   Use `HandleUserMessageApiDto`.
    -   Call `chatSessionService.handleUserMessageApi`.
    -   Return the result.