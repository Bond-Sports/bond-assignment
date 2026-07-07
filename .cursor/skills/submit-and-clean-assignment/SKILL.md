---
name: submit-and-clean-assignment
description: Finalizes the Bond assignment on this shared machine. Copies Cursor plans and agent chat transcripts into the repo, commits and pushes everything to the candidate branch, verifies the push, then wipes all local traces (Cursor project data, plans, chat storage, local clone) so the next candidate cannot see plans, discussions, or other work. Use when the user asks to submit, hand in, finalize, or clean up the assignment.
disable-model-invocation: true
---

# Submit and Clean the Assignment

Finish the assignment in three phases: archive Cursor artifacts into the repo, commit and push, then clean the machine. The machine uses a shared guest account, so cleanup must remove every local trace.

**Hard safety rule: never delete anything before the push is verified on the remote.** If the push fails or cannot be verified, stop and report — do not start cleanup.

Copy this checklist and track progress:

```
Submission Progress:
- [ ] Phase 1: Copy plans and transcripts into the repo
- [ ] Phase 2: Commit and push all work
- [ ] Phase 3: Verify the push landed on the remote
- [ ] Phase 4: Wipe local traces
- [ ] Phase 5: Verify cleanup
```

## Key paths

The Cursor project slug for this workspace is the absolute workspace path with `/` replaced by `-`:

| What | Path |
|---|---|
| Workspace | `~/Documents/GitHub/bond-assignment` |
| Cursor project data | `~/.cursor/projects/Users-guestaccount-Documents-GitHub-bond-assignment/` |
| Chat transcripts | `<project data>/agent-transcripts/<uuid>/<uuid>.jsonl` |
| Plans | `~/.cursor/plans/` and `.cursor/plans/` inside the workspace (if present) |
| Cursor chat/workspace storage | `~/Library/Application Support/Cursor/User/workspaceStorage/` |

## Phase 1: Copy plans and transcripts into the repo

Create `docs/submission/` in the repo and copy artifacts in:

```bash
cd ~/Documents/GitHub/bond-assignment
mkdir -p docs/submission/transcripts docs/submission/plans
find ~/.cursor/projects/Users-guestaccount-Documents-GitHub-bond-assignment/agent-transcripts -name '*.jsonl' -exec cp {} docs/submission/transcripts/ \;
find ~/.cursor/plans -name '*.md' -exec cp {} docs/submission/plans/ \; 2>/dev/null || true
```

Also copy any plan files from the workspace `.cursor/plans/` directory if it exists. Keep the existing `TRANSCRIPT.md` at the repo root as-is.

The transcript of the currently running chat is captured up to this moment; do this phase last-minute so nothing is missed.

## Phase 2: Commit and push

```bash
git add -A
git commit -m "Add plans and Cursor discussion transcripts for submission"
git push -u origin HEAD
```

Push to the candidate branch (currently `andy-benichou`), never to `main`.

## Phase 3: Verify the push

```bash
git status --short --branch
git ls-remote origin $(git branch --show-current)
```

The remote SHA must equal `git rev-parse HEAD` and the working tree must be clean. **Only proceed to Phase 4 when both checks pass.**

## Phase 4: Wipe local traces

Run these in order. The workspace-storage loop only removes folders that reference this assignment, so other projects are untouched.

```bash
rm -rf ~/.cursor/projects/Users-guestaccount-Documents-GitHub-bond-assignment
rm -rf ~/.cursor/projects/Users-guestaccount-Documents-bond-assignment
rm -rf ~/.cursor/plans
rm -rf ~/.cursor/agents

for dir in ~/Library/Application\ Support/Cursor/User/workspaceStorage/*/; do
  grep -lq 'bond-assignment' "$dir/workspace.json" 2>/dev/null && rm -rf "$dir"
done

grep -rl 'bond-assignment' ~/Library/Application\ Support/Cursor/User/History/*/entries.json 2>/dev/null \
  | xargs -I{} dirname {} | xargs rm -rf
```

Then delete the local clone and re-clone a fresh copy on `main` so the next candidate has a clean starting point:

```bash
cd ~ && rm -rf ~/Documents/GitHub/bond-assignment
git clone https://github.com/Bond-Sports/bond-assignment.git ~/Documents/GitHub/bond-assignment
```

The fresh clone stays on `main` with no candidate branches checked out.

Optionally clear shell history entries from this session: `history -p` in zsh, or truncate `~/.zsh_history` if the user asks for it.

## Phase 5: Verify cleanup

```bash
ls ~/.cursor/projects/ 2>/dev/null
ls ~/.cursor/plans ~/.cursor/agents 2>/dev/null
cd ~/Documents/GitHub/bond-assignment && git branch --show-current && git status --short
```

No `bond-assignment` traces should remain in Cursor data, and the fresh clone must be on `main` with a clean working tree.

Finally, tell the user to **quit Cursor completely without reopening the workspace** — Cursor may rewrite open-chat state to disk on exit, and the current chat window still shows the conversation until the app is closed.
