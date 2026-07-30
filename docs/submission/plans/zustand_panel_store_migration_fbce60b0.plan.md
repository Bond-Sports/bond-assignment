---
name: Zustand Panel Store Migration
overview: Replace the `useAgentBuilderPanels` hook with a Zustand store (`usePanelStore`) using `persist` middleware for localStorage-based layout persistence, then rewire `useAgentBuilder` and `AgentBuilder.tsx` to consume the store instead of the hook.
todos:
  - id: create-store
    content: Create usePanelStore.ts with Zustand persist middleware containing all panel state and actions
    status: completed
  - id: rewire-hook
    content: "Refactor useAgentBuilderPanels.ts to be a thin bridge: reads from usePanelStore, keeps only DOM-coupled logic (refs, mouse handlers, keyboard shortcut)"
    status: completed
isProject: false
---

# Zustand Panel Store Migration

## What Changes

Replace the local-state-based [`useAgentBuilderPanels.ts`](apps/operator/src/pages/agent-builder/useAgentBuilderPanels.ts) hook with a Zustand persisted store. The resize divider mouse-event logic and keyboard shortcut stay in a thin hook since they depend on DOM refs/effects that don't belong in the store.

## Files Touched

### 1. NEW: `apps/operator/src/pages/agent-builder/usePanelStore.ts`

Create the Zustand store with `persist` middleware. Following the existing operator store pattern from [`useTaskStore.ts`](apps/operator/src/stores/useTaskStore.ts), which defines state + actions in a single `create` call.

The store holds **only serializable, persisted state** -- no refs, no DOM event handlers:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PanelState {
  openPanels: OpenPanel[];
  leftPanelWidth: number;
  centerRightSplit: number;
  maximizedPanelId: string | null;

  addPanel: (type: PanelType) => void;
  closePanel: (id: string) => void;
  setActiveTab: (panelId: string, tabKey: string) => void;
  setLeftWidth: (width: number) => void;
  setSplit: (split: number) => void;
  toggleMaximize: (id: string) => void;
  reorderPanels: (from: number, to: number) => void;
}
```

Key details:

- `persist` key: `'agent-builder-layout'` (localStorage)
- Default `openPanels`: `[{id:'default-1', type:'system-prompts', activeTab:'code'}, {id:'default-2', type:'thread', activeTab:'thread'}]`
- `addPanel` resolves default `activeTab` from `PANEL_DEFINITIONS` and generates ID via `${type}-${Date.now()}`
- `addPanel` calls `toast.error(...)` when at max 2 panels
- Width/split setters clamp using the existing constants from `types.ts`
- This is the **first persisted Zustand store** in the operator app; `zustand/middleware` is already available (v4.3.8)

### 2. MODIFY: `apps/operator/src/pages/agent-builder/useAgentBuilderPanels.ts`

Gut the file and turn it into a thin bridge hook that:

- Reads state from `usePanelStore` (all the panel state + actions)
- Keeps only the **non-serializable bits** that can't go in the store: `builderRef`, `draggingRef`, `isAddPanelMenuOpen` local state, mouse-event handlers (`handleLeftDividerMouseDown`, `handleCenterDividerMouseDown`), and the `Cmd+Shift+P` keyboard shortcut `useEffect`
- The mouse handlers call `usePanelStore.getState().setLeftWidth(...)` / `.setSplit(...)` instead of local `setState`
- Returns the same API shape as today so `useAgentBuilder.ts` and `AgentBuilder.tsx` don't need interface changes

This keeps the migration minimal: the store owns persistent data, the hook owns DOM-coupled side effects.

### 3. NO CHANGES to these files

- [`useAgentBuilder.ts`](apps/operator/src/pages/agent-builder/useAgentBuilder.ts) -- still composes session + panels hooks, same API
- [`AgentBuilder.tsx`](apps/operator/src/pages/agent-builder/AgentBuilder.tsx) -- no changes needed; it consumes `useAgentBuilder` which returns the same shape
- [`types.ts`](apps/operator/src/pages/agent-builder/types.ts) -- types/constants are reused as-is
- All panel components (`PanelContainer`, `PanelDivider`, `AddPanelMenu`, `ChatPanel`) -- untouched

## Persistence Behavior

- On first load: defaults (System Settings + Thread panels, 280px left width, 50% split)
- On subsequent loads: restores exact panel layout from `localStorage['agent-builder-layout']`
- `maximizedPanelId` persists too (user returns to maximized state if they left it that way)
- The `persist` middleware handles serialization/deserialization automatically for this flat state shape
