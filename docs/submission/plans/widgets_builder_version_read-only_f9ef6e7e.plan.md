---
name: Widgets Builder version read-only
overview: "Apply the same agent-version read-only pattern as Integrations V3: use `useVersionScopedEditLock`, guard all mutating handlers with toast + early return, disable editors and actions in the widgets-builder UI, show `VersionScopedReadOnlyBanner` on the Base Model Widgets Builder tab, and pass read-only through to embedded `RightPanel` in FineTuningView."
todos:
  - id: hook-guards
    content: "useWidgetsBuilder: useVersionScopedEditLock, toast guards, openDeleteConfirm/history/schema/param guards, derived canSave/canDelete, expose flag"
    status: completed
  - id: widgets-builder-shell
    content: "WidgetsBuilder.tsx: pass readOnly to HeaderPanel/CenterPanel; modal safety"
    status: completed
  - id: base-model-banner
    content: "BaseModel.tsx: VersionScopedReadOnlyBanner above WidgetsBuilder tab"
    status: completed
  - id: layout-tabs
    content: types + HeaderPanel, ActionButtons, CenterPanel, GenerateWidget, Templates, Components, RightPanel readOnly wiring
    status: completed
  - id: fine-tuning-right-panel
    content: "FineTuningView: pass readOnly to RightPanel from context"
    status: completed
isProject: false
---

# Widgets Builder: published/archived read-only

## Pattern (reuse)

- `[useVersionScopedEditLock](apps/operator/src/hooks/useVersionScopedEditLock.ts)`: `isSelectedAgentVersionReadOnly` when `AGENT_VERSIONING` is on and the selected version is `published` or `archived`.
- Mirror Integrations: toast + early return on mutations; disable primary controls; optional banner on the tab.

`[useWidgetsBuilderScope](apps/operator/src/pages/widgets-builder/useWidgetsBuilderScope.ts)` already merges `version_id` for lists via `[useVersionedListParams](apps/operator/src/hooks/useVersionedListParams.ts)`; this work is **UX + mutation guards**, not query shape.

## 1. Hook: `[useWidgetsBuilder.ts](apps/operator/src/pages/widgets-builder/useWidgetsBuilder.ts)`

- Import `useVersionScopedEditLock`.
- Shared toast string (aligned with integrations), e.g. _"This version is read-only. Select a draft to create or edit widgets."_
- **Return** `isSelectedAgentVersionReadOnly` on the hook result (consumers: `WidgetsBuilder`, `FineTuningView` via context).
- **Guards** (toast + return) at the start of:
  - `handleGenerate` (creates template via `createCardTemplate`)
  - `handleSaveChanges` (`updateCardTemplate`)
  - `handleConfirmDeleteTemplate` (`deleteCardTemplate`)
  - `handleUpdatePrompt` (`cardTemplateGenerate`)
- `**openDeleteConfirm`: wrap in `useCallback` — if read-only, toast and do not set `templateToDelete`.
- `**handleHistoryVersionSelect`: guard (would overwrite editor state from history).
- `**handleSchemaChange`: no-op when read-only (schema JSON editor).
- `**handleAuiParameterSelect`: guard (mutates schema).
- **Derived flags** (keep UI simple):
  - e.g. `canSaveChanges` already requires `currentTemplateId` and dirty state — also `&& !isSelectedAgentVersionReadOnly`.
  - `canDeleteTemplate`: require `!isSelectedAgentVersionReadOnly` (in addition to existing `currentTemplate` logic) so header delete hides/disabled consistently.

## 2. Shell: `[WidgetsBuilder.tsx](apps/operator/src/pages/widgets-builder/WidgetsBuilder.tsx)`

- Read `isSelectedAgentVersionReadOnly` from context hook return.
- Pass `**readOnly={isSelectedAgentVersionReadOnly}` (or same name across types) into `HeaderPanel` and `CenterPanel`.
- Delete **Modal**: disable primary Delete button (and optionally Cancel-only affordance) when read-only — redundant if `openDeleteConfirm` never opens, but cheap safety.

## 3. Base Model tab: `[BaseModel.tsx](apps/operator/src/pages/base-model/BaseModel.tsx)`

- In `CONTROL_TABS.WIDGETS_BUILDER`, match Integrations/Ontology: when `isSelectedAgentVersionReadOnly`, render `[VersionScopedReadOnlyBanner](apps/operator/src/pages/base-model/partials/VersionScopedReadOnlyBanner/VersionScopedReadOnlyBanner.tsx)` with `readOnlySelectedVersion` (already available from `useBaseModel` in this file).

## 4. Props / layout components

Extend types in `[types.ts](apps/operator/src/pages/widgets-builder/types.ts)` for `IHeaderPanelProps`, `ICenterPanelProps`, `IActionButtonsProps`, `ITemplatesProps`, `IGenerateWidgetViewProps`, `IRightPanelProps`, `IComponentsViewProps` with optional `readOnly?: boolean` (default `false` in destructuring).

| File                                                                                        | Change                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------- |
| `[HeaderPanel.tsx](apps/operator/src/pages/widgets-builder/layout/HeaderPanel.tsx)`         | Forward `readOnly` to `ActionButtons`; optionally disable template filter chips when read-only (cosmetic; not mutating).                                                                                                |
| `[ActionButtons.tsx](apps/operator/src/pages/widgets-builder/tabs/parts/ActionButtons.tsx)` | `disabled={readOnly                                                                                                                                                                                                     |     | ...}` on save / undo / delete; back button stays enabled. |
| `[CenterPanel.tsx](apps/operator/src/pages/widgets-builder/layout/CenterPanel.tsx)`         | Forward `readOnly` to `GenerateWidget`, `Templates`, `Components`.                                                                                                                                                      |
| `[GenerateWidget.tsx](apps/operator/src/pages/widgets-builder/tabs/GenerateWidget.tsx)`     | Disable textarea, suggestion chips, “Start with an Example”, and generate button when `readOnly`.                                                                                                                       |
| `[Templates.tsx](apps/operator/src/pages/widgets-builder/tabs/Templates.tsx)`               | Monaco `options.readOnly = readOnly`; when `readOnly`, do not run param-dropdown insert path (guard `handleParamSelect` / `useParamDropdown` usage — simplest: skip opening dropdown or no-op selects when `readOnly`). |
| `[Components.tsx](apps/operator/src/pages/widgets-builder/tabs/Components.tsx)`             | Hide Add/Edit for AUI admin when `readOnly`; Monaco usage editor `readOnly`; still allow **Copy**.                                                                                                                      |
| `[RightPanel.tsx](apps/operator/src/pages/widgets-builder/layout/RightPanel.tsx)`           | Monaco schema editor `readOnly` when prop set.                                                                                                                                                                          |

## 5. Fine-tuning embed: `[FineTuningView.tsx](apps/operator/src/widgets/FineTuningView/FineTuningView.tsx)`

- When `widgetsBuilder` exists, pass `readOnly={widgetsBuilder.isSelectedAgentVersionReadOnly}` (or equivalent) into `RightPanel` so embedded schema editing respects version lock.

## 6. Standalone route

`[app.tsx](apps/operator/src/app.tsx)` `WidgetsBuilderProvider` + `WidgetsBuilder` — same hook runs; no BaseModel banner there (no change unless product wants a duplicate banner; out of scope unless requested).

## Verification

- **Draft** version: builder behaves as today.
- **Published/archived**: no generate/save/delete/prompt regen/history apply; editors read-only; Components add/edit blocked; banner on Base Model Widgets tab; FineTuning embedded schema read-only.
- Versioning **off**: `isSelectedAgentVersionReadOnly === false`, no regressions.

Run `nx lint operator` (and `nx lint break` if any break lib touched — none expected).
