---
name: CTS-11969 plan
overview: Add the existing cross-version RAG warning pattern to the Integrations v3 create and knowledge-hub update flows, limited to `IntegrationsV3` and its modal stack.
todos:
  - id: map-warning-conditions
    content: Centralize the RAG + selected-version condition used to decide when the cross-version warning must appear.
    status: completed
  - id: gate-rag-create
    content: Add the warning step before `CreateIntegrationChooserModal` triggers `onCreateRag`.
    status: completed
  - id: gate-kb-updates
    content: Add the same warning step before knowledge-hub upload, edit, and remove-all mutations.
    status: completed
  - id: preserve-delete-behavior
    content: Keep the existing RAG delete warning and irreversible remove-all confirmation behavior intact while reusing the same modal pattern where possible.
    status: completed
  - id: manual-validate
    content: Manually verify versioned RAG create/update flows and confirm no warning appears in non-RAG or non-versioned paths.
    status: completed
isProject: false
---

# CTS-11969 Plan

## Scope

Implement the Jira requirement from [CTS-11969](https://getstuff.atlassian.net/browse/CTS-11969) in `IntegrationsV3` only.

This plan covers warning the user when a selected agent version is active and they perform RAG actions that actually affect all agent versions because the backing knowledge hub is not versioned:

- Create a new RAG integration
- Upload/add documents to the RAG knowledge hub
- Edit existing documents in the RAG knowledge hub
- Remove documents from the RAG knowledge hub

This plan does not include the separate `SupportDocs` screen.

## Existing Anchors

The current delete behavior already contains the exact product rule we should mirror:

- [apps/operator/src/pages/IntegrationsV3/IntegrationsV3.tsx](apps/operator/src/pages/IntegrationsV3/IntegrationsV3.tsx) shows a RAG-specific delete warning when `data.deleteTarget.type === 'RAG' && ui.hasSelectedAgentVersion`.
- [apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts](apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts) is the source of `ui.hasSelectedAgentVersion`, based on `agentVersionIdForMutations` from [apps/operator/src/hooks/useVersionScopedEditLock.ts](apps/operator/src/hooks/useVersionScopedEditLock.ts).
- [apps/operator/src/pages/IntegrationsV3/components/CreateIntegrationChooserModal.tsx](apps/operator/src/pages/IntegrationsV3/components/CreateIntegrationChooserModal.tsx) is the create-RAG entry point; its finish action calls `onCreateRag(...)` directly.
- [apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/KnowledgeHubModal.tsx](apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/KnowledgeHubModal.tsx) and [apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/useKnowledgeHubModal.ts](apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/useKnowledgeHubModal.ts) own the RAG document actions: add/upload source methods, `onSubmitEditVector`, and `handleConfirmRemoveAllSources`.

## Implementation Approach

1. Introduce one reusable "RAG cross-version impact" warning pattern for `IntegrationsV3`.
   Use the existing delete modal behavior as the source of truth for when the warning is needed: `RAG` + selected agent version. Keep the rule centralized so create and knowledge-hub updates do not each invent their own version-check logic.
2. Reuse or lightly generalize the existing integration confirmation modal instead of adding a one-off warning implementation in each action.
   The current [apps/operator/src/pages/IntegrationsV3/components/DeleteIntegrationModal.tsx](apps/operator/src/pages/IntegrationsV3/components/DeleteIntegrationModal.tsx) already supports configurable `title` and `content`. Extend this pattern into a neutral confirmation/warning modal for non-delete RAG actions, or add a narrowly scoped sibling modal if renaming would create noisy churn.
3. Gate RAG creation before the mutation runs.
   Add the warning in the create flow before `handleCreateRag` is executed from [apps/operator/src/pages/IntegrationsV3/components/CreateIntegrationChooserModal.tsx](apps/operator/src/pages/IntegrationsV3/components/CreateIntegrationChooserModal.tsx). The confirmation copy should explain that creating the RAG in one version applies to all versions of the agent.
4. Gate knowledge-hub mutations before they run.
   Add the same warning pattern ahead of the mutating actions in [apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/useKnowledgeHubModal.ts](apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/useKnowledgeHubModal.ts):

- opening a document-add flow that will upload/create a source
- saving an edited vector via `onSubmitEditVector`
- removing documents via the existing remove-all confirmation flow

1. Preserve the current destructive confirmation layering.
   `Remove all documents` already has its own irreversible-action confirmation in [apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/KnowledgeHubModal.tsx](apps/operator/src/pages/IntegrationsV3/components/KnowledgeHubModal/KnowledgeHubModal.tsx). Keep that confirmation, and add the cross-version warning as the versioning-specific guard instead of weakening or replacing the irreversible-action confirm.
2. Keep the warning targeted.
   Do not show it when:

- no agent version is selected
- the integration is not `RAG`
- the screen is already read-only and the action is disabled

## Validation

Verify these paths manually in operator with agent versioning enabled and a draft version selected:

- Creating a new RAG shows the warning before the create request.
- Opening the knowledge hub and adding a file, URL, or single resource shows the warning before the mutation.
- Editing a source shows the warning before save.
- Removing all documents preserves the existing irreversible-action confirm and also shows the cross-version warning in the new flow.
- Non-RAG integrations and non-versioned flows do not show the warning.
- Published/archived versions remain read-only and do not expose the new flow.

## Notes

The cleanest minimal-change path is to keep version state owned by [apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts](apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts) and pass a boolean down into the create and knowledge-hub modal layers, rather than re-deriving version context separately in each child.
