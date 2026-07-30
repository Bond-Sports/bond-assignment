---
name: Integrations versioning
overview: Align operator integration mutations with the agent-versioning contract by passing `agent_version_id` on `/v1/integrations/view` POST/PATCH/DELETE requests when a draft version is selected. Keep existing list-query behavior unchanged, since reads already use `version_id` through the versioned list helper.
todos:
  - id: type-integration-mutation-payloads
    content: Add typed integration view mutation payloads with optional agent_version_id in the shared API layer
    status: completed
  - id: wire-integrations-v3-mutations
    content: Inject agent_version_id into Integrations V3 RAG create/delete and API create/update flows
    status: completed
  - id: cover-dropdown-create-path
    content: Patch IntegrationsDropdown create flow so versioned RAG creation is consistent outside Integrations V3
    status: completed
  - id: validate-versioned-requests
    content: Lint touched files and verify request bodies include agent_version_id only for selected versions
    status: completed
isProject: false
---

# Fix Integrations Mutation Versioning

## Goal

Ensure every operator path that mutates integrations sends `agent_version_id` when a versioned draft is active, matching the backend contract for `/v1/integrations/view` create/update/delete. Keep GET list requests on the existing `version_id` query flow.

## Files To Touch

- [apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts](apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts)
- [apps/operator/src/pages/IntegrationsV3/hooks/useApiIntegrationPersistence.ts](apps/operator/src/pages/IntegrationsV3/hooks/useApiIntegrationPersistence.ts)
- [apps/operator/src/components/IntegrationsDropdown/useIntegrationsDropdown.ts](apps/operator/src/components/IntegrationsDropdown/useIntegrationsDropdown.ts)
- [libs/api/src/api/AgentSettings/IntegrationsApi/types.ts](libs/api/src/api/AgentSettings/IntegrationsApi/types.ts)
- [libs/api/src/api/AgentSettings/IntegrationsApi/useIntegrationsApi.ts](libs/api/src/api/AgentSettings/IntegrationsApi/useIntegrationsApi.ts)

## Implementation

- Add explicit payload types for integration view mutations in [libs/api/src/api/AgentSettings/IntegrationsApi/types.ts](libs/api/src/api/AgentSettings/IntegrationsApi/types.ts), including scope fields plus optional `agent_version_id`.
- Replace the current `any` mutation payloads in [libs/api/src/api/AgentSettings/IntegrationsApi/useIntegrationsApi.ts](libs/api/src/api/AgentSettings/IntegrationsApi/useIntegrationsApi.ts) with those types so the version field is modeled where the endpoint is defined.
- In [apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts](apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts), read `agentVersionIdForMutations` from `useVersionScopedEditLock()` and append `...(agentVersionIdForMutations ? { agent_version_id: agentVersionIdForMutations } : {})` to:
  - RAG create payloads
  - delete payloads
- In [apps/operator/src/pages/IntegrationsV3/hooks/useApiIntegrationPersistence.ts](apps/operator/src/pages/IntegrationsV3/hooks/useApiIntegrationPersistence.ts), add the same `agent_version_id` injection for:
  - API integration create
  - API integration update
  - direct integration patch updates
- In [apps/operator/src/components/IntegrationsDropdown/useIntegrationsDropdown.ts](apps/operator/src/components/IntegrationsDropdown/useIntegrationsDropdown.ts), patch the dropdown-based RAG create path too, so the bug is fixed for all current `useCreateIntegrationApi()` consumers, not just the main Integrations V3 page.
- Leave [apps/operator/src/hooks/useGetScopeParams.ts](apps/operator/src/hooks/useGetScopeParams.ts) unchanged. It should stay scope-only because reads use `version_id` in query params, while these mutation endpoints use `agent_version_id` in the request body.

## Why This Fix Level

The current bug is caused by mutation callers building bodies only from scope params. Fixing those mutation entry points addresses the cause directly and avoids leaking endpoint-specific version behavior into the generic scope helper.

## Validation

- Check touched files with `ReadLints`.
- Run the narrowest practical lint step, likely `nx lint operator`.
- Manually verify in a selected draft version that these requests include `agent_version_id`:
  - create RAG integration from Integrations V3
  - create RAG integration from Integrations dropdown
  - create API integration
  - update API integration / direct integration settings
  - delete integration
- Also verify live-scope behavior still omits `agent_version_id` when no version is selected.

## Risk To Watch

[apps/operator/src/api/entities.ts](apps/operator/src/api/entities.ts) already sends `agent_version_id` for scope-entity view mutations. Right now that can diverge from integration mutations. This change should bring those writes back into the same draft/live boundary.
