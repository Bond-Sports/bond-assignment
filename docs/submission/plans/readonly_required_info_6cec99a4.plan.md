---
name: readonly required info
overview: Add a true read-only display path for required/optional parameter cards in `ConstraintRulesList` so non-editable agent versions can view workflow parameter details without any editing affordances or accidental local mutations.
todos:
  - id: branch-readonly-open-path
    content: Route read-only required-info cards to `selectedWorkflow` modal opening instead of `selectedRule`.
    status: completed
  - id: add-trigger-readonly-mode
    content: Add `readOnly` support to `RequiredAndOptionalParamsTrigger` and its hook, including a close-only modal footer.
    status: completed
  - id: thread-readonly-through-params-ui
    content: Disable parameter editing affordances in `RequiredAndOptionalParams` and required/optional parameter children.
    status: completed
  - id: block-readonly-local-mutations
    content: Stop required-parameter normalization effects from mutating workflow state when rendering view-only.
    status: completed
  - id: verify-operator-files
    content: Run targeted lint/diagnostic validation on edited operator files and sanity-check editable vs read-only behavior.
    status: completed
isProject: false
---

# Read-Only Required Info Display

## What is broken

In `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx)`, read-only cards currently use a generic `onView={() => setSelectedRule(rule)}` path, which is correct for rule cards but wrong for required-info cards. Those cards should open the workflow parameter modal, not the rule modal.

The modal stack under `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredAndOptionalParamsTrigger.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredAndOptionalParamsTrigger.tsx)` is also edit-oriented: it always renders `Cancel`/`Save`, does not accept a read-only prop, and its children still expose add/remove/change controls.

## Planned changes

1. Update the card-open logic in `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx)` and `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/useConstraintRulesList.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/useConstraintRulesList.ts)` so read-only required-info cards load `selectedWorkflow` and open `RequiredAndOptionalParamsTrigger`, while rule cards continue using `UpsertRuleModal`.
2. Add an explicit `readOnly` prop to `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredAndOptionalParamsTrigger.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredAndOptionalParamsTrigger.tsx)` and its hook `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/useRequiredAndOptionalParamsTrigger.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/useRequiredAndOptionalParamsTrigger.ts)` so the modal can switch to a view-only footer and avoid save/cancel mutation behavior when the selected version is locked.
3. Thread that `readOnly` state through `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredAndOptionalParams.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredAndOptionalParams.tsx)`, `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredMissingParametersContainer/RequiredMissingParametersContainer.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredMissingParametersContainer/RequiredMissingParametersContainer.tsx)`, and related hooks so add/remove buttons, checkbox toggles, and parameter dropdown edits are disabled instead of editable.
4. Prevent local state mutation in read-only mode inside `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredMissingParametersContainer/useRequiredMissingParametersContainer.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredMissingParametersContainer/useRequiredMissingParametersContainer.ts)`. Right now it normalizes empty required groups by writing `config.params.required` on mount; that behavior should not run in a read-only session.
5. Validate the touched operator files for lint/type issues and sanity-check both paths: editable versions still save, read-only versions open the modal and show values without edit affordances.

## Key implementation notes

A small API extension is enough here; no architectural reshuffle is needed.

Essential behavior to preserve:

```96:103:/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx
<AgentRuleView
  rule={rule}
  onView={isSelectedAgentVersionReadOnly ? () => setSelectedRule(rule) : undefined}
  onEdit={isSelectedAgentVersionReadOnly ? undefined : () => onClickEditCard(rule)}
  onDelete={isSelectedAgentVersionReadOnly || !rule.code ? undefined : () => handleDeleteRule(rule)}
```

That view path should stay rule-specific, and required-info cards should branch to workflow viewing instead.

Current edit-only footer that needs a read-only variant:

```45:52:/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredAndOptionalParamsTrigger.tsx
<Modal.Footer>
  <Button variant="secondary-light" onClick={handleCancel}>
    Cancel
  </Button>
  <Button disabled={isDisabledAddButton} isLoading={isSaveLoading} onClick={handleSubmit}>
    Save
  </Button>
</Modal.Footer>
```

Current mutation-on-mount risk to guard in read-only mode:

```58:67:/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/RequiredAndOptionalParams/RequiredMissingParametersContainer/useRequiredMissingParametersContainer.ts
useEffect(() => {
  const copyRequiredParams = structuredClone(selectedWorkflow?.config?.params?.required ?? []);

  if (!copyRequiredParams?.length) {
    updateParameterGroups([[]]);
    return;
  }
```
