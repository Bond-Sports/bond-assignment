---
name: BFF parallel tests-maker dispatch
overview: "Replace the primary agent's synchronous Task-tool invocation of tests-maker with a BFF-dispatched parallel OpenCode session targeting `agent: \"tests-maker\"` in the same sandbox. This gives true fire-and-forget: primary starts implementing immediately while tests-maker writes the scenario matrix in parallel."
todos: []
isProject: false
---


## Why the current setup doesn't work

From the trace you pasted, two distinct def