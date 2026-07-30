---
name: Publish version modal + API
overview: "Add `usePublishAgentVersion` (POST with `published_by`), a dark-themed `PublishVersion` confirmation modal matching the mockup (split footer: View Changes | Cancel + Publish), wire the Actions menu Publish and View Changes items through `useVersionDropdown`, refresh versions and refetch current agent after success so `active_version_id` stays correct."
todos:
  - id: api-publish-hook
    content: Add IPublishAgentVersionPayload + usePublishAgentVersion in agent-versions.ts
    status: completed
  - id: publish-modal-ui
    content: Create PublishVersionModal.tsx + footer layout SCSS under version-dropdown-modal
    status: completed
  - id: hook-publish-wire
    content: "Extend useVersionDropdown: modal state, publish mutation, invalidations, isPublishDisabled, View Changes -> openVersionHistory"
    status: completed
  - id: integrate-publish
    content: Wire VersionActionsButton + VersionDropdown for publish and view changes
    status: completed
  - id: lint-publish
    content: Run nx lint operator (narrow/touched files as needed)
    status: completed
isProject: false
---

# Publish version (API + confirmation modal)

## API layer

**File:** `[apps/operator/src/api/agent-versions.ts](apps/operator/src/api/agent-versions.ts)`

- Add `IPublishAgentVersionPayload`:
  - `urlParams: { agentId: string; versionId: string }`
  - `published_by: string` (user id — same source as create: `user._id` from `[useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`)
- Add `usePublishAgentVersion`:
  - `url: '/v1/agents/{agentId}/versions/{versionId}/publish'`
  - `method: 'POST'`
  - `instance: INSTANCES.AGENT_SETTINGS`
  - `meta: { unwrapResponse: true }`
  - Response typed as `IAgentVersionItem` (aligns with your sample; status may be `published` after a real call even if the example schema shows `draft`).

`useMutate` puts non-`urlParams` fields into the request body, so `published_by` is sent as JSON as in Postman.

## Publish modal UI

**New file:** `apps/operator/src/components/VersionDropdown/partial/PublishVersionModal.tsx`

Match existing version modals: `[EditVersionModal.tsx](apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx)` / `[ArchiveVersionConfirmModal.tsx](apps/operator/src/components/VersionDropdown/partial/ArchiveVersionConfirmModal.tsx)` — `Modal` with `className="version-dropdown-modal"`, `withCloseIcon`, `showTitleSeparator`, `onRequestClose`.

- **Title:** `Publish Version`
- **Body:** Single paragraph using existing `[getVersionDisplayLabel](apps/operator/src/components/VersionDropdown/versionDropdownFormat.ts)` for the dynamic segment, e.g.  
  `This will make **{label}** the live configuration for this agent.`  
  Implement with `version-dropdown-modal__body-text` and a nested span (or `<strong>`) for the label so it matches the design emphasis without new token colors.
- **Footer layout (design):** split row — left: **View Changes** (`variant="outline"`); right: **Cancel** (`outline`) + **Publish Version** (`primary`, `isLoading` on publish). The default `Modal.Footer` is a plain div; use `Flex` with `justifyContent="space-between"` / `fullWidth` and a nested `Flex` for the right group, plus a **scoped class** under `[.break-modal-container.version-dropdown-modal .modal-footer](apps/operator/src/components/VersionDropdown/styles.scss)` if you need `width: 100%` or gap tweaks so the row matches the mockup.

**Props:** `isOpen`, `versionLabel: string`, `isLoading`, `onClose`, `onPublish`, `onViewChanges`.

## Hook wiring

**File:** `[apps/operator/src/components/VersionDropdown/useVersionDropdown.ts](apps/operator/src/components/VersionDropdown/useVersionDropdown.ts)`

- Import `usePublishAgentVersion` and `getVersionDisplayLabel`.
- State: `isPublishVersionModalOpen`.
- `handleOpenPublishVersionModal` / `handleClosePublishVersionModal`; open path should `setMenuOpen(false)` (same pattern as archive/edit).
- `handlePublishVersionConfirm`: guard `currentAgent?.id`, `selectedVersionId`, `user?._id`; `await publishAgentVersion({ urlParams: { agentId, versionId }, published_by: user._id })`; invalidate `[AGENT_VERSIONS_QUERY_KEY, currentAgent.id]` (same as archive); **invalidate agents list** so Jotai’s current agent picks up a new `active_version_id`:  
  `queryClient.invalidateQueries({ queryKey: ['current-agent'], exact: false })`  
  (matches `[useCurrentAgent.ts](apps/operator/src/hooks/useCurrentAgent.ts)` `CURRENT_AGENT_QUERY_KEY` literal — avoids duplicating refresh logic while keeping the atom in sync after publish).
- Toast success / error handling consistent with `handleArchiveVersionConfirm` / `handleEditSubmit`.
- Reset `isPublishVersionModalOpen` in the existing `useEffect` when `currentAgent?.id` changes.
- `**isPublishDisabled`: `true` when selected version `status === 'published'` (already live) or `status === 'archived'`, or missing `user?._id` / agent / version.

**View Changes (menu + modal):** Add `handleViewVersionChanges` that calls existing `openVersionHistory` (already in the hook) so both the Actions menu item and the modal’s **View Changes** button do something useful today. For the modal button: close the publish modal first, then `openVersionHistory()` (order avoids stacking modals/panels awkwardly).

## Component integration

**File:** `[apps/operator/src/components/VersionDropdown/partial/VersionActionsButton.tsx](apps/operator/src/components/VersionDropdown/partial/VersionActionsButton.tsx)`

- New props: `onOpenPublishVersion`, `isPublishDisabled`, `onViewChanges`.
- **Publish Version** `MenuItem`: `disabled={isPublishDisabled}`, `onClick` opens publish modal (or `noop` when disabled).
- **View Changes** `MenuItem`: `onClick={onViewChanges}` (replace `noop`).

**File:** `[apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`

- Render `PublishVersionModal` with `versionLabel={getVersionDisplayLabel(selectedVersionValue.version)}` when version exists (guard when opening).
- Pass new handlers and flags from the hook into `VersionActionsButton` and the modal (`onViewChanges` for modal = close + `handleViewVersionChanges` wrapper, or expose a dedicated `handlePublishModalViewChanges` from the hook).

## Validation

- Run `nx lint operator` on touched files (project-wide lint may still have pre-existing failures).

**Security note:** Do not commit the sample Postman JWT; auth remains via existing Axios configuration.
