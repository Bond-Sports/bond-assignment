---
name: Fix Smooch image markdown
overview: Implement a minimal fix for live-agent escalation failures caused by Sunshine rejecting markdown image syntax as invalid image posts, while keeping the change localized and aligned with existing integration boundaries.
todos:
  - id: inspect-smooch-boundary
    content: Confirm the sanitization is applied only at the Smooch payload construction boundary in `src/clients/smooch/smooch.client.ts`.
    status: completed
  - id: add-targeted-sanitizer
    content: Add a narrow helper that rewrites only markdown image syntax before building Smooch text content.
    status: completed
  - id: cover-regression
    content: Add focused unit tests in `src/clients/smooch/smooch.client.spec.ts` for markdown image text and attachment-caption behavior.
    status: completed
  - id: verify-touched-files
    content: Run targeted test and lint validation for the updated Smooch client files.
    status: completed
isProject: false
---

# Fix Smooch Markdown Image Fallback

## Approach

Normalize outbound text in `[/Users/bugo/Documents/Developer/quack/session-tracker/src/clients/smooch/smooch.client.ts](/Users/bugo/Documents/Developer/quack/session-tracker/src/clients/smooch/smooch.client.ts)` before it is sent to Sunshine/Smooch.

Why this is the minimal and elegant fix:

- `SmoochClient.sendMessage()` is the single integration boundary that all relevant Smooch flows already use.
- The failure is caused by Sunshine rejecting `![alt](url)` text as an image payload (`not_an_image`), so the fix should live where Sunshine payloads are built, not in higher-level business logic.
- This avoids duplicating sanitization in escalation-specific code such as `[/Users/bugo/Documents/Developer/quack/session-tracker/src/quackchat/service/decision-action-handlers/quackchat-decision-escalation.service.ts](/Users/bugo/Documents/Developer/quack/session-tracker/src/quackchat/service/decision-action-handlers/quackchat-decision-escalation.service.ts)`.

Relevant current code:

```183:214:/Users/bugo/Documents/Developer/quack/session-tracker/src/clients/smooch/smooch.client.ts
  async sendMessage(params: SmoochSendMessageParams): Promise<SmoochSendMessageResponse> {
    const smoochConfig = await this.getSmoochConfig(params.owner);
    ...
    const content = {
      type: 'text',
      text: params.text,
    };

    if (params.attachment) {
      content['mediaUrl'] = params.attachment;
      content['type'] = 'file';
    }
    ...
  }
```

```426:445:/Users/bugo/Documents/Developer/quack/session-tracker/src/quackchat/service/decision-action-handlers/quackchat-decision-escalation.service.ts
  async sendMessagesToSmooch(...) {
    const messages = await this.getMessagesToSendToSmooch(chatSessionId, tenant);
    for (const message of messages) {
      if (message.message === '') {
        continue;
      }

      await this.sendMessageToSmoochWithRetry(
        conversationId,
        tenant,
        user?.externalId ?? userEmail,
        message,
        chatSessionId,
      );
    }
  }
```

## Intended change

Add a small helper in `SmoochClient` that rewrites only markdown image syntax:

- From: `![Add Form Fields](https://...)`
- To: `Add Form Fields: https://...` or just the URL when alt text is empty

Keep the transform narrowly scoped:

- Do not strip all markdown.
- Do not alter normal links unless later evidence shows they also break Sunshine.
- Preserve `mediaUrl` behavior when `params.attachment` is explicitly provided.

## Validation

Update `[/Users/bugo/Documents/Developer/quack/session-tracker/src/clients/smooch/smooch.client.spec.ts](/Users/bugo/Documents/Developer/quack/session-tracker/src/clients/smooch/smooch.client.spec.ts)` with focused unit coverage:

- `sendMessage()` keeps plain text unchanged.
- `sendMessage()` rewrites `![alt](url)` in text payloads.
- `sendMessage()` still sends `type: 'file'` and `mediaUrl` correctly when an attachment is present, while sanitizing the caption text if needed.

Run targeted tests and lint for the touched files only.
