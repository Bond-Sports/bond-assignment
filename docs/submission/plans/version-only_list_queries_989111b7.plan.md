---
name: Version-only list queries
overview: Switch operator list/query requests to use only the selected agent `version_id` whenever versioning is active, instead of mixing `version_id` with scope filters. Keep mutation payloads on their existing `agent_version_id` flow unless a backend contract change explicitly requires otherwise.
todos:
  - id: add-version-aware-list-helper
    content: Add a central operator helper that returns `{ version_id }` for versioned list queries and falls back to existing scope params in live mode.
    status: completed
  - id: update-primary-versioned-lists
    content: Refactor confirmed versioned list/query consumers to use the central helper instead of mixing scope filters with `version_id`.
    status: completed
  - id: audit-secondary-list-callers
    content: Sweep integrations, parameters, workflows, placeholders, scope references, task generation, and widget/card-template list callers for the same mixed-param pattern.
    status: completed
  - id: validate-query-shapes
    content: Verify selected-version and live-mode request shapes, plus query-key behavior, after the refactor.
    status: completed
isProject: false
---

# Version-Only Query Plan

## Goal

Update the operator app so versioned list/query endpoints send only `version_id` when a selected agent version exists. In live mode with no selected version, preserve the current scope-based behavior.

## Current Findings

The operator app currently mixes scope filters with `version_id`, which conflicts with the backend validation rule you described.

```11:27:/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useGetScopeParams.ts
  const getScopeParamsForGetRequest = useCallback(() => {
    if (isAuiAdminMode) {
      if (selectedCategory?.value !== 'GLOBAL') {
        return {
          network_category_id: selectedCategory?.value,
        };
      } else {
        return {};
      }
    }
    return {
      network_id: selectedNetwork?._id,
      network_category_id: selectedNetwork?.category?._id as string,
      account_id: selectedAccount?._id as string,
      organization_id: selectedAccount?.organization as string,
    };
  }, [...]);
```

```93:125:/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/ontology-configuration/useOntologyConfiguration.tsx
  const parametersParams = useMemo(
    () => ({
      ...scopeParams,
      ...(versionIdForQuery ? { version_id: versionIdForQuery } : {}),
    }),
    [...]
  );

  const scopeEntitiesParams = useMemo(() => ({
    ...getScopeParamsForGetRequest(),
    ...(versionIdForQuery ? { version_id: versionIdForQuery } : {}),
  }), [...]);
```

## Implementation Approach

1. Add a central operator-side helper for version-aware list params.
   Use the selected version from `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionScopedEditLock.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useVersionScopedEditLock.ts)` or the existing effective-version hook and return:

- `{ version_id }` when a selected version exists.
- Current scope params only when no version is selected.

1. Keep query helpers and mutation helpers separate.
   Do not blindly change `getScopeParamsForPostRequest()` or mutation bodies, because create/update/delete flows currently rely on `agent_version_id` and backend docs only require the query-side switch. If needed, introduce a dedicated helper such as `getVersionAwareListParams()` instead of overloading all scope helpers.
2. Update every operator list/query consumer that currently spreads scope plus `version_id`.
   Primary versioned list/query call sites already confirmed:

- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/ontology-configuration/useOntologyConfiguration.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/ontology-configuration/useOntologyConfiguration.tsx)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/ontology-configuration/components/ParameterConfigurationModal/useParameterConfigurationModal.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/ontology-configuration/components/ParameterConfigurationModal/useParameterConfigurationModal.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/entities.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/api/entities.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useAgentToolOptions.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useAgentToolOptions.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/useManageConstraintRules.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/AgentRules/ConstraintRulesList/useManageConstraintRules.tsx)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/hooks/useWorkflowList.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/hooks/useWorkflowList.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/agent-settings/useAgentIdentity.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/agent-settings/useAgentIdentity.ts)`

1. Sweep the remaining read paths that are currently scope-only or partly version-aware.
   These should be audited and switched to the same central helper where they are true versioned list endpoints:

- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useIntegrationsListData.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useIntegrationsListData.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/IntegrationsV3/useIntegrationsV3.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/Integration/useIntegration.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/Integration/useIntegration.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/AgentSettings/partials/AgentContext/hooks/useJsonParamDropdown.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/AgentSettings/partials/AgentContext/hooks/useJsonParamDropdown.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/IntegrationsV3/components/AUIParameters/useAUIParameters.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/IntegrationsV3/components/AUIParameters/useAUIParameters.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useScopeReferenceParams.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/hooks/useScopeReferenceParams.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/TaskGeneration/useTaskGeneration.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/contexts/MainContext.tsx)`

1. Include card-template list fetching in the sweep even though this repo uses `/card-templates`, not `/card-templates/view`.
   The relevant operator scope helper is `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/widgets-builder/useWidgetsBuilderScope.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/widgets-builder/useWidgetsBuilderScope.ts)`, with list consumers in:

- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/widgets-builder/useWidgetsBuilder.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/widgets-builder/useWidgetsBuilder.ts)`
- `[/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/ResponseRules/useResponseWidgetsAccordion.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/pages/base-model/partials/ResponseRules/useResponseWidgetsAccordion.ts)`

1. Validate that shared API wrappers do not need structural changes for GET/list calls.
   Current research shows the shared `libs/api` GET/list types already accept `version_id` for the relevant list routes, so the main work should stay in operator request assembly rather than shared transport code. Only touch shared types if a specific list caller is blocked by TypeScript.
2. Verify behavior with a selected version and without one.
   Check that:

- versioned list requests contain only `version_id`
- live-mode requests still contain scope filters
- React Query keys continue to refresh correctly when switching selected version or scope
- no list caller still combines `version_id` with `network_id`, `account_id`, `organization_id`, `network_category_id`, `include_global_scope`, or `enable_reduce_by_scope`
