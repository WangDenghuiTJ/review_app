# Public Demo Session Summary

Updated: 2026-04-10

This file is intentionally generic and safe for a public repository.

## What This App Demonstrates

1. Editing Markdown in a local browser-based review app.
2. Saving comment threads into a sibling `.comments.json`.
3. Saving document context into a sibling `.context.md`.
4. Letting a single-thread agent reply to one comment thread.
5. Allowing that agent to directly modify the current Markdown when the thread explicitly asks for it.

## What To Check In A Fresh Environment

- The local server starts on `127.0.0.1:8765`.
- The default document loads as `workflow_review.md`.
- Comment threads can be created and saved.
- The “呼唤智能体” action only handles the current thread.
- Revision marks appear after agent-written edits in review mode.

## Public Repo Note

Do not treat this file as a real user session transcript.
It is only a sanitized summary for repository readers.
