---
name: salesforce-v2-image-parsing
overview: 'Add Salesforce v2 image attachment parsing by extending static-content typing/schema to accept `formatType: "Attachments"` and mapping those entries into `LivechatMessage.text` (flattened text), consistent with existing normalization.'
todos:
  - id: extend-v2-staticcontent-types
    content: Add Attachments static-content interfaces and include them in Salesforce v2 static-content union.
    status: completed
  - id: extend-v2-joi-schema
    content: "Add Joi schema for `formatType: Attachments` and wire it into message payload validation."
    status: completed
  - id: implement-attachments-parser-branch
    content: Handle `Attachments` in Salesforce v2 parser and flatten attachment links into `LivechatMessage.text`.
    status: completed
  - id: add-regression-tests
    content: Create v2 service unit tests for attachments parsing and output formatting.
    status: completed
  - id: verify-tests-and-lints
    content: Run targeted tests/lints for edited files and fix any newly introduced issues.
    status: completed
isProject: false
---

# Salesforce V2 Attachment Parsing Plan

## Goal

Support Salesforce `Message` entries where `abstractMessage.staticContent.formatType === "Attachments"` so image attachment messages are no longer dropped and are returned as `CHAT_MESSAGE` with flattened text.

## Root Cause

`Message` entries are validated before parsing, and current static-content unions/schemas only allow `Text` and `RichLink`. `Attachments` payloads fail validation and return `undefined`.

```223:255:src/livechat-systems/service/salesforce-livechat/salesforce-livechat-v2.service.ts
switch (value.abstractMessage.messageType) {
  case 'StaticContentMessage':
    if (value.abstractMessage.staticContent.formatType === 'RichLink') {
      // ...
    }

    return {
      type: LivechatMessageType.CHAT_MESSAGE,
      text: value.abstractMessage.staticContent.text,
      // ...
    };
  // ...
}
```

## Changes

- Update Salesforce v2 static-content type union in `[src/livechat-systems/client/salesforce-livechat-v2/salesforce-livechat.client.types.ts](src/livechat-systems/client/salesforce-livechat-v2/salesforce-livechat.client.types.ts)`:
  - Add `AttachmentsStaticContentMessage` interface with `formatType: 'Attachments'`, optional `text`, and `attachments[]` (`name`, `mimeType`, `url`, `id`, etc. with permissive optional fields for forward compatibility).
  - Include it in `StaticContentMessage.staticContent` union.
- Update Joi validation in `[src/livechat-systems/client/salesforce-livechat-v2/salesforce-livechat.client.schema.ts](src/livechat-systems/client/salesforce-livechat-v2/salesforce-livechat.client.schema.ts)`:
  - Add `attachmentsStaticContentSchema` validating `formatType: 'Attachments'` + `attachments` array with required `url` and lenient optional metadata fields.
  - Include this schema in `staticContent` alternatives used by `staticContentMessageSchema`.
- Update parser in `[src/livechat-systems/service/salesforce-livechat/salesforce-livechat-v2.service.ts](src/livechat-systems/service/salesforce-livechat/salesforce-livechat-v2.service.ts)`:
  - Add explicit `StaticContentMessage` branch for `formatType === 'Attachments'`.
  - Build `text` as flattened content:
    - preserve message text when present;
    - append one markdown link per attachment (`[nameOrUrl](url)`), newline-separated;
    - return as `LivechatMessageType.CHAT_MESSAGE` with existing `agentName/agentId` mapping.
  - Keep existing behavior for `Text` and `RichLink` unchanged.
- Add focused tests (new file) at `[src/livechat-systems/service/salesforce-livechat/salesforce-livechat-v2.service.spec.ts](src/livechat-systems/service/salesforce-livechat/salesforce-livechat-v2.service.spec.ts)`:
  - Parses a `StaticContentMessage` with `formatType: 'Attachments'` and returns a message instead of dropping it.
  - Confirms flattened output format (base text + attachment markdown links).
  - Confirms fallback when attachment has no `name` (use URL as title).

## Validation

- Run targeted test for new spec file.
- Run lint check for changed files and resolve any new diagnostics.
