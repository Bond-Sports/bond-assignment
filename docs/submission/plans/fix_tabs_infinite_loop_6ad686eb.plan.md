---
name: Fix Tabs infinite loop
overview: Fix the infinite re-render loop in the shared `Tabs` component caused by its `useLayoutEffect` having unstable DOM-derived dependencies and always creating new state objects, which cascades with react-aria's `useHasTabbableChild` layout effect under React 19.
todos:
  - id: fix-tabs-layout-effect
    content: "Refactor the useLayoutEffect in libs/break/src/lib/Tabs/Tabs.tsx: move DOM query inside the effect, use functional setState with bailout, depend only on state.selectedKey"
    status: completed
  - id: verify-fix
    content: Build the operator app to confirm no TypeScript/lint errors introduced
    status: completed
isProject: false
---

# Fix Tabs Infinite Re-render Loop (React 19 Compatibility)

## Problem

After upgrading to React 19, clicking a version option in the VersionDropdown causes a "Maximum update depth exceeded" error in the `TabPanel` component. The root cause is in `[libs/break/src/lib/Tabs/Tabs.tsx](libs/break/src/lib/Tabs/Tabs.tsx)`, not in the operator app.

## Root Cause

The `Tabs` component's `useLayoutEffect` (lines 60-70) has two flaws that create an infinite loop under React 19:

1. **DOM query during render with derived deps**: `activeTab` is queried from the DOM during render (line 56), and `activeTab?.offsetLeft` / `activeTab?.offsetWidth` are used as effect dependencies. These are unstable -- layout measurements can shift between renders.
2. **Always-new state object**: `setActiveTabStyle({ width: ..., transform: ... })` creates a new object reference every call. React uses `Object.is` for bailout checks, so a new object always triggers a re-render, even when width/transform values are identical.

Combined with react-aria's `useHasTabbableChild` hook (used inside `useTabPanel`) which runs a `useLayoutEffect` with no dependency array on every render, these two effects create a cascading state update cycle that exceeds React 19's 50-update limit.

## Fix (single file change)

**File**: `[libs/break/src/lib/Tabs/Tabs.tsx](libs/break/src/lib/Tabs/Tabs.tsx)`

**Change the `useLayoutEffect` (lines 56-70) to:**

1. Move the `activeTab` DOM query **inside** the effect (not during render) so its measurements are not used as dependencies.
2. Remove `activeTab?.offsetLeft` and `activeTab?.offsetWidth` from the dependency array -- only depend on `state.selectedKey`.
3. Guard `setActiveTabStyle` with a value comparison so it only updates state when width or transform actually changed, preventing unnecessary re-renders.

The result should look like:

```tsx
useLayoutEffect(() => {
  const activeTab = ref.current?.querySelector<HTMLDivElement>(
    '[role="tab"][aria-selected="true"]'
  );

  const width = activeTab?.offsetWidth || 0;
  const transform = `translateX(${activeTab?.offsetLeft || 0}px)`;

  setActiveTabStyle((prev) => {
    if (prev.width === width && prev.transform === transform) {
      return prev;
    }
    return { width, transform };
  });

  if (activeTab?.offsetLeft) {
    containerRef.current?.scrollTo({
      left: activeTab.offsetLeft,
      behavior: "smooth",
    });
  }
}, [state.selectedKey]);
```

This breaks the cycle because:

- The effect only fires when `selectedKey` changes (not on DOM measurement shifts).
- The functional `setState` with same-value bailout returns the **same reference** when nothing changed, so React skips re-rendering.
- No unstable DOM-derived values in the dependency array.

Also remove the now-unused `activeTab` variable that was previously defined at line 56-58 (outside the effect).

## Scope

- Only one file is changed: `[libs/break/src/lib/Tabs/Tabs.tsx](libs/break/src/lib/Tabs/Tabs.tsx)`
- This is the shared `Tabs` component used across all apps in the monorepo, so fixing it here resolves the issue everywhere.
- No changes needed to the VersionDropdown, BaseModel, or any operator-specific code.
