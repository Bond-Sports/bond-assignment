---
name: Read-only snapshot UX fix
overview: "Align published/archived “version snapshot” behavior with [VersionScopedReadOnlyBanner](apps/operator/src/pages/base-model/partials/VersionScopedReadOnlyBanner/VersionScopedReadOnlyBanner.tsx): keep all mutating actions blocked, but restore safe viewing paths (RAG knowledge hub, widgets-builder browsing/history) that were incorrectly gated as if they were edits."
todos:
  - id: integrations-rag-row
    content: "Reorder useIntegrationsV3 handleRowClick (RAG before read-only guard); IntegrationsV3Table: isRowClickable + getRowProps for read-only RAG-only clicks"
    status: completed
  - id: knowledge-hub-readonly
    content: Pass readOnly into KnowledgeHubModal/useKnowledgeHubModal; hide write UI; onSourceRowClick view-only; guard mutation handlers
    status: completed
  - id: widgets-nav-history
    content: "HeaderPanel/GenerateWidget: allow filter chips and Start with Example in read-only; useWidgetsBuilder: allow handleHistoryVersionSelect without toast"
    status: completed
  - id: manual-verify
    content: "Manual pass: published RAG hub view-only, widgets builder browse/history, draft regressions"
    status: completed
isProject: false
---

# Read-only snapshot: viewing vs mutating

## Principle

- **Block**: API calls that create/update/delete (integrations, templates, vectors, uploads, prompt regeneration, etc.) — keep existing guards in [useIntegrationsV3.ts](apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts), [useWidgetsBuilder.ts](apps/operator/src/pages/widgets-builder/useWidgetsBuilder.ts), [useOptionConfigurator.ts](apps/operator/src/components/CardConfigurator/useOptionConfigurator.ts), etc.
- **Allow**: Local UI navigation and read-only inspection that does not persist (open RAG hub modal, switch template filter, pick a history snapshot in the editor, `setCode`/`setSchema` from history for display inside read-only Monaco).

No change required to banner copy if behavior matches “viewing” again.

---

## 1. Integrations V3 — RAG row opens Knowledge Hub again

**Problem**: [useIntegrationsV3.ts](apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts) `handleRowClick` returns before `setRagEditIntegration` when read-only, so [KnowledgeHubModal](apps/operator/src/pages/IntegrationsV3/IntegrationsV3.tsx) never opens (only entry is that setter).

**Fix**:

- Reorder `handleRowClick` so **RAG** integrations always call `setRagEditIntegration(integration)` first.
- Apply the read-only toast + early return **only** for **API** row-open-edit (`handleOpenApiEdit`) paths (and any other mutation-oriented opens you keep behind the same guard).

**Table row UX** ([IntegrationsV3Table.tsx](apps/operator/src/pages/IntegrationsV3/components/IntegrationsV3Table.tsx)):

- Today `isRowClickable={!readOnly}` disables all row clicks. Use `**isRowClickable` always `true` (same as draft) and [TableV2 `getRowProps](libs/break/src/lib/Table/TableV2/partials/TableBody.tsx)`to set`disabled: true` when:
  - `readOnly && row.rowType === 'enrichment'` (still no edit flow), or
  - `readOnly && row.rowType === 'integration' && integration.type !== 'RAG'` (API rows should not look clickable / should not fire click).
- In `handleRowClick`, keep enrichment → `onEditEnrichment` only when `!readOnly` (redundant if row disabled, but keeps handler obvious).

---

## 2. Knowledge Hub modal — view-only when version is read-only

**Problem**: Opening the modal for inspection still exposes **mutations** (new document, remove all, source row → edit vector, etc.) via [useKnowledgeHubModal.ts](apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/useKnowledgeHubModal.ts) / [KnowledgeHubModal.tsx](apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/KnowledgeHubModal.tsx).

**Fix** (thread `readOnly={ui.isSelectedAgentVersionReadOnly}` from [IntegrationsV3.tsx](apps/operator/src/pages/IntegrationsV3/IntegrationsV3.tsx) into the modal → hook):

- **UI**: Hide or fully disable the “New Document” `Menu`, and the “Remove all” control (and any other obvious write entry points in that modal shell).
- `**onSourceRowClick`**: When `readOnly`, always open **view flow (`setDocToView` + `isViewModalOpen`) — same idea as the existing `isSelectedHubScopeTypeMismatch` branch — instead of `onOpenEditVector`.
- **Guards**: No-op / return early in `handleSelectSourceMethod`, `handleOpenRemoveAllConfirm`, `handleConfirmRemoveAllSources`, `onSubmitEditVector` when `readOnly` (defense in depth even if UI is hidden).
- **Jobs tab**: Row click opens [JobDocumentsModal](apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/KnowledgeHubModal.tsx); treat as read-only browsing unless you find a mutation path there (if any, gate similarly).

Extend hook params type: `UseKnowledgeHubModalParams` with optional `readOnly?: boolean`.

---

## 3. Widgets builder — navigation and history are not edits

**Problem**: [HeaderPanel.tsx](apps/operator/src/pages/widgets-builder/layout/HeaderPanel.tsx) disables template filter chips when `readOnly`, and [GenerateWidget.tsx](apps/operator/src/pages/widgets-builder/tabs/GenerateWidget.tsx) disables “Start with an Example”. Together with [useWidgetsBuilder.ts](apps/operator/src/pages/widgets-builder/useWidgetsBuilder.ts) resetting `templateFilter` to `'generated'` on scope change, users can be **stuck** without example browsing — navigation, not persistence.

**Fix**:

- Remove `readOnly` disabling from **template filter chips** (keep `onTemplateFilterChange` unrestricted for published view).
- Re-enable “Start with an Example” in generate tab when version read-only: `handleStartWithTemplate` only resets local state / navigates; **keep** `handleGenerate` and create-template paths blocked as today.

**History dropdown** ([useWidgetsBuilder.ts](apps/operator/src/pages/widgets-builder/useWidgetsBuilder.ts) `handleHistoryVersionSelect`):

- Remove the read-only toast + return; allow updating `selectedHistoryId`, `appliedPromptValue`, `code`, `schema` for **display** inside read-only editors.
- If [AppliedPrompt](apps/operator/src/pages/widgets-builder/tabs/parts/AppliedPrompt.tsx) is ever re-enabled for generated templates, ensure textarea/update button remain non-mutating when read-only (separate from this hook change); today the main gap is `handleHistoryVersionSelect` in the hook.

Optional clarity pass: rename local `readOnly` in [WidgetsBuilder.tsx](apps/operator/src/pages/widgets-builder/WidgetsBuilder.tsx) to something like `versionReadOnly` and pass it only to components that must block mutations (actions, Monaco `readOnly`, generate button, etc.), not to pure navigation controls — or split props (`blocksMutations` vs `editorReadOnly`) if that reads cleaner after the above edits.

---

## 4. Verification (manual)

- **Published/archived version**: Integrations tab → click **RAG** row → Knowledge Hub opens → sources/jobs browsable; no uploads / remove all / edit vector.
- **Same version**: Widgets builder → switch Examples / Generated chips; “Start with an Example” from Generate tab; pick a **history** version → JSX/schema preview updates, editors stay non-editable, Save/Generate still blocked.
- **Draft**: Regression check — row click API still opens edit modal; RAG still opens hub with full actions.

---

## 5. Out of scope (unless you explicitly want it)

- **API integrations** in read-only: still no row-click edit (by design in current diff). A fuller “view API integration” read-only modal would be a separate feature.
- Changing [VersionScopedReadOnlyBanner](apps/operator/src/pages/base-model/partials/VersionScopedReadOnlyBanner/VersionScopedReadOnlyBanner.tsx) text — not needed once behavior matches “viewing.”
