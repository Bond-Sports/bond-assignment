---
name: Replace timer with status dot
overview: Replace the countdown timer with a "Connected" / "Disconnected" status indicator driven by keepalive results. Remove the timer useEffect and timeLeft state entirely.
todos:
  - id: replace-state
    content: Replace `timeLeft` state with `connected` boolean state
    status: completed
  - id: remove-timer-effect
    content: Remove the countdown timer useEffect
    status: completed
  - id: update-keepalive-effect
    content: Update keepalive useEffect to set `connected` true/false based on ping results
    status: completed
  - id: replace-ui
    content: Replace timer span in the header with green/red dot + Connected/Disconnected label
    status: completed
isProject: false
---

# Replace timer with connection status indicator

## Changes in [src/components/app-shell.tsx](src/components/app-shell.tsx)

### 1. Replace `timeLeft` state with `connected` state

Remove:

```typescript
const [timeLeft, setTimeLeft] = useState<string>("");
```

Add:

```typescript
const [connected, setConnected] = useState(false);
```

### 2. Remove the countdown timer useEffect (lines 59-78)

Delete the entire "Countdown timer" `useEffect` block. It is no longer needed.

### 3. Update the keepalive useEffect to drive `connected`

In the keepalive `useEffect` (lines 80-103):

- On success (`d.ok`): call `setConnected(true)` and `updateEndAt(d.endAt)`
- On failure (`!d.ok`): call `setConnected(false)` and `clearSession()`
- On network error: call `setConnected(false)` (but don't clear session yet -- wait for next ping to confirm)
- On cleanup (return): call `setConnected(false)`

### 4. Replace the timer display with a status dot (lines 202-210)

Replace the `timeLeft` span with a connection indicator. The dot uses a CSS `box-shadow` for the glow effect, keeping it pure inline styles (no new CSS files needed):

```typescript
{
  session?.status === "ready" && (
    <span
      className="flex items-center gap-1.5 text-xs"
      title={connected ? "Sandbox connected" : "Sandbox disconnected"}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{
          background: connected ? "#22c55e" : "#ef4444",
          boxShadow: connected ? "0 0 6px #22c55e" : "none",
        }}
      />
      <span style={{ color: "var(--text-muted)" }}>
        {connected ? "Connected" : "Disconnected"}
      </span>
    </span>
  );
}
```
