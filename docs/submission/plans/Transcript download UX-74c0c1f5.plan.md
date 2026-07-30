<!-- 74c0c1f5-9ea5-4b33-b1c2-a6af4c30e2cd -->
---
todos:
  - id: "branch"
    content: "Create feature branch from main (leave local constants/index.html dirty)"
    status: pending
  - id: "header-mute"
    content: "Replace Header 3-dot menu with direct mute speaker IconButton; remove download from header"
    status: pending
  - id: "messages-download"
    content: "Add Download Transcript after CSAT in Messages when chatEnded"
    status: pending
  - id: "cleanup-startnewchat"
    content: "Remove download from StartNewChat and QuackChatComp wiring"
    status: pending
  - id: "verify-build"
    content: "Run npm run build and sanity-check the wiring"
    status: pending
isProject: false
---
# Move Download Transcript after CSAT

Your reading matches Denise’s ask. **Agreed approach:**

1. Remove the three-dot menu; keep mute as a direct speaker icon in the header.
2. Remove Download Transcript from next to Start New Chat.
3. Show Download Transcript in the message stream after CSAT, only once the conversation has ended (`chatEnded`).

CSAT can appear mid-chat for some tenants, so download stays gated on `chatEnded`, not on `showCSAT`.

## Current state

- Header builds a dropdown with Mute + Download ([`Header.tsx`](src/v2/core/parts/Header.tsx)).
- Download also sits beside Start New Chat ([`StartNewChat.tsx`](src/v2/core/parts/StartNewChat.tsx)).
- Transcript logic already exists ([`transcript.ts`](src/v2/core/utils/transcript.ts)); no change needed there.
- Flag: `settings.allowDownloadTranscript !== false` ([`QuackChatComp.tsx`](src/v2/core/parts/QuackChatComp.tsx)).

## Changes

### 1. Header: speaker icon only

In [`Header.tsx`](src/v2/core/parts/Header.tsx):

- Remove `onDownloadTranscript` prop and Download menu item.
- Remove the three-dot `DropdownMenu`.
- When `enableNewMessageSound` is true, render a ghost `IconButton` with `SpeakerOffIcon` / `SpeakerLoudIcon` and aria-label `Mute sounds` / `Unmute sounds`.

### 2. Message stream: download after CSAT

In [`Messages.tsx`](src/v2/core/parts/message/Messages.tsx), after the CSAT block:

- If `chatEnded` and `onDownloadTranscript` is provided, render a small end-of-chat block (same padding/typography feel as CSAT) with a gray outline **Download Transcript** button.
- Wire `onDownloadTranscript` from [`QuackChatComp.tsx`](src/v2/core/parts/QuackChatComp.tsx) into `Messages`.
- Keep existing gate: `allowDownloadTranscript !== false` and `messages.length > 0`.
- Only pass the handler when `chatEnded` (so it never appears mid-chat).

### 3. Start New Chat: remove download

In [`StartNewChat.tsx`](src/v2/core/parts/StartNewChat.tsx) and its call site in `QuackChatComp`:

- Remove `onDownloadTranscript` and the second button; leave only “Start New Chat”.

## Out of scope

- Leave local dirty files (`src/constants.ts`, `src/index.html`) untouched.
- No transcript format / API changes.
- Branch: `noam/quack-4435-feature-request-yotpo-add-chat-transcript-download` when implementing.

## Verification

- `npm run build`
- Manual: ended chat with CSAT → download after CSAT; mid-chat → no download; header → speaker only, no dots; Start New Chat → no download button.