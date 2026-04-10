---
name: review-flow
description: Route long plans, 方案, design docs, roadmaps, execution plans, SOPs, research plans, architecture writeups, and other reviewable long-form outputs into MT Review App instead of leaving them in chat. Use when the user asks to write content into Review App, asks for a plan or方案 to review before execution, asks for pending Review App threads to be processed and synced back into the document, explicitly says to execute only after approval, or when the reply would naturally become a substantial document that should be reviewed and iterated instead of sent inline.
---

# Review Flow

Use this skill to enforce a document-review-execute loop.

Keep the workflow file-driven:

- Write the plan into the Review App Markdown file
- If the source Markdown is outside `/home/wangdh/review_app`, import it into the workspace first
- Start or reuse the local Review App service after each document write and return a browser-openable link
- Let the user review in the app
- Maintain the sibling `.context.md` when goals, constraints, rejected options, or reply tone matter for future thread handling
- Process comment threads and sync accepted changes into the Markdown
- Execute only after the user explicitly approves the reviewed document

Read [references/review-app-reference.md](references/review-app-reference.md) when you need the concrete file paths, operating rules, or prompt patterns.

## Decide Whether To Use The Flow

Enter the flow when at least one of these is true:

- The user asks for a plan, 方案, roadmap, design document, or long-form execution outline
- The user asks for a SOP, research memo, architecture draft, planning document, or structured proposal
- The user asks to write the result into Review App
- The user says they want to review before execution
- The user asks to read pending threads, process comments, or sync feedback back into the document
- The user says to execute only after the reviewed plan is confirmed
- The answer would be long enough that it is better treated as a document than as a chat reply

Do not enter the flow for:

- Short factual answers
- Small one-off edits that do not need document review
- Casual brainstorming with no request to persist or review the result

If the output is clearly document-like and would be cumbersome in chat, prefer the Review App flow even if the user only implied review rather than stating it explicitly.

Strong trigger phrases include:

- "写成方案给我审"
- "写到 Review App"
- "先出个计划书"
- "生成一版让我改"
- "我来批注"
- "等我确认后再执行"
- "先别执行，先给我审阅"

## Run The Workflow

### 1. Draft Into Review App

When starting a new reviewed document:

1. Confirm whether to overwrite the current review file or revise the existing document
2. If the source file is outside the workspace, copy it into `/home/wangdh/review_app` and use the imported path as canonical
3. Write the full draft into the actual Review App Markdown file
4. If useful background intent exists, write or refresh the sibling `.context.md`
5. Preserve existing comment threads unless the user clearly wants a reset or the document is being replaced wholesale
6. Immediately run the Review App launcher so the service is available
7. Return the direct review link and tell the user to review in the app rather than pasting the whole document back into chat

Treat the Markdown file as the source of truth for the current draft.

### 2. Process Review Feedback

When the user asks to continue after review:

1. Read the comment JSON and the current Markdown together
2. Prioritize threads explicitly marked as pending
3. Read the sibling `.context.md` when it is relevant to the current thread handling
4. Reply thread by thread
5. Sync accepted feedback into the Markdown immediately
6. Leave a clear reply in each processed thread so the user can audit what changed
7. After syncing the document, run the launcher again and return the fresh direct link

If the user directly edits the Markdown, preserve those edits. Do not revert user changes just because an older draft existed in chat.

When the user is already inside the browser review UI:

1. Prefer the built-in “呼唤智能体” button for a single thread
2. Treat that worker as single-thread scoped, not whole-document or whole-comments scoped
3. Assume it receives the current Markdown, the current thread history, and the document `.context.md`
4. If the thread explicitly asks to rewrite or replace original text, expect the worker to modify the Markdown directly and leave a reply in the same thread

### 3. Decide Whether Execution Is Allowed

Execution is allowed only when the user clearly says the reviewed plan is approved.

Valid approval examples:

- "按这个方案执行"
- "可以开始做了"
- "定稿了，照这个执行"
- "按 Review App 里的最终版推进"

Do not treat these as approval:

- "先看看"
- "继续改"
- "我再审一下"
- "你先回复批注"

If approval is ambiguous, keep working in review mode.

## Enforce These Rules

- Write reviewed documents into the real Review App target file, not a similarly named file under the app source directory
- Treat the Markdown file as the current draft and the comments JSON as the review log
- Treat the sibling `.context.md` as the durable summary of goals, constraints, rejected directions, and thread-handling guidance
- Prefer replying in threads over explaining only in chat
- If you accept a comment, update the document instead of only promising to do so
- After any document write or review-thread sync, run `/home/wangdh/review_app/scripts/start_review_app.sh 127.0.0.1 8765 <doc>.md` and use its stdout as the user-facing link
- Do not stop after writing the file if the service link has not been returned to the user
- If the user asks to execute but unresolved review ambiguity remains, surface the ambiguity first

## Communicate Concisely

When drafting:

- State that the document was written to Review App
- Run `/home/wangdh/review_app/scripts/start_review_app.sh 127.0.0.1 8765 <doc>.md`
- Return the direct link printed by the launcher, rather than reconstructing it from memory
- State that the service is ready, not just that the file was edited
- Do not ask the user to manually start the local Review App when the launcher script can do it
- State whether comments were preserved or reset
- Ask the user to review in the app

When processing comments:

- State how many pending threads were handled
- State whether the Markdown was updated
- State whether the `.context.md` was created or refreshed when relevant
- Return the refreshed review link after the sync
- Point out any unresolved conflicts

When execution begins:

- State that you are using the current approved Markdown as the execution baseline
