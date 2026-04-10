# Redraft

**Interactive review for AI-written Markdown.**

Redraft is a local-first review workspace for plans, specs, papers, and other long-form Markdown written with AI.

It adds the missing review layer that chat-based agent workflows usually lack:

- inline revision marks instead of silent rewrites
- comment threads attached to exact ranges or paragraphs
- thread-level agent actions instead of "rewrite the whole thing"
- document-level context that keeps agent replies aligned with your real intent

The current backend is optimized for `Codex`, including per-thread agent calls and optional direct Markdown edits. The review model itself is broader: the app is designed as an interactive review layer for AI-generated documents, not as a one-off Markdown editor.

## Why This Exists

When Codex or another agent writes a plan in chat, the output is usually hard to review well:

- you cannot approve a long plan paragraph by paragraph
- you cannot ask for a change on one sentence without re-running the whole document flow
- you often lose visible edit history when the agent rewrites text
- comment-driven iteration is awkward in a chat window

Redraft turns that workflow into a real document review loop:

1. generate a draft with an agent
2. open it as Markdown in Redraft
3. comment on exact sections
4. ask the agent to answer one thread or directly revise one passage
5. keep revision traces visible while you decide what to keep

## What It Is Good For

Redraft is especially useful for:

- project plans and execution roadmaps
- technical design docs and architecture writeups
- PRDs, SOPs, and operating documents
- papers, abstracts, and manuscript polishing
- application materials, proposals, and long-form memos
- any workflow where AI helps write, but a human still needs to review and steer

A strong pattern is: **draft broadly with AI, then refine locally with threaded review**.

## Core Workflow

Redraft is built around a simple unit of collaboration: **one comment thread, one focused change request**.

- load a Markdown document
- create a thread on a selected range or paragraph
- reply manually, or click `呼唤智能体` on that thread
- inject document context from a sibling `.context.md`
- let the agent answer only that thread
- if the thread explicitly asks to rewrite text, let the agent directly edit the Markdown
- inspect the result in review mode with visible revision traces

This keeps the agent scoped, predictable, and easier to supervise.

## What Makes It Different

### 1. Review Instead of Rewrite

Most AI writing tools optimize for "generate again".  
Redraft optimizes for **review, steer, and accept changes deliberately**.

### 2. Thread-Level Agent Calls

You do not need to hand the whole document back to the model every time.  
You can ask for a fix, translation, polish, clarification, or rewrite on one specific thread.

### 3. Revision Visibility

When the agent edits the original Markdown, the app can still show revision traces in review mode instead of replacing the text invisibly.

### 4. Local-First Files

The source of truth stays on disk:

- `doc.md`
- `doc.md.comments.json`
- `doc.md.context.md`
- `doc.md.review.json`

This makes the workflow easy to inspect, back up, diff, and integrate with your own tooling.

## Codex Integration

This repo currently ships with a working `Codex`-backed thread agent flow.

Inside a thread, the app can send Codex:

- the current Markdown document
- the current thread history
- the document-level `.context.md` summary

Codex then returns a reply for that thread and, when explicitly instructed, can directly modify the Markdown file itself.

This makes the app a strong fit for users who already use Codex to draft:

- implementation plans
- research plans
- design docs
- polished internal docs
- manuscript sections

## Repository Structure

- `tools/md_review_app/`
  Frontend and local HTTP server.
- `scripts/`
  Start, stop, foreground serve, and direct-link helpers.
- `workflow_review.md`
  Public demo document.
- `workflow_review.md.comments.json`
  Public demo comment threads.
- `workflow_review.md.context.md`
  Public demo context summary.

## Quick Start

From the repo root:

```bash
cd /path/to/review_app
./scripts/start_review_app.sh 127.0.0.1 8765 workflow_review.md
```

Then open:

```text
http://127.0.0.1:8765/?path=workflow_review.md
```

If you want to keep the server in the foreground:

```bash
./scripts/serve_review_app_foreground.sh
```

## Install the Codex Skill

This repo includes a `review-flow` skill for Codex.  
It routes long plans, docs, and reviewable writing into the app instead of leaving them in chat.

### Install via script

```bash
cd /path/to/review_app/tools/md_review_app
./scripts/install-review-flow-global.sh
```

Default install target:

```text
$HOME/.codex/skills/review-flow
```

### Install manually

Copy:

```text
tools/md_review_app/skills/review-flow
```

To:

```text
$HOME/.codex/skills/review-flow
```

After that, a new Codex session can use:

```text
$review-flow
```

## Recommended Usage Pattern

1. Ask Codex to draft a plan, spec, paper section, or long document.
2. Move the Markdown into this workspace.
3. Open it in Redraft.
4. Review with comment threads.
5. Use `呼唤智能体` only where targeted changes are needed.
6. Keep `.context.md` updated so thread-level replies stay aligned with your intent.
7. Export PDF or PDF+comments when you need a shareable artifact.

## Public Repo Checklist

Before making your own instance public, verify that you are not exposing real working material:

- remove real business or research content from `.md`
- remove real discussions from `.comments.json`
- remove sensitive intent or constraints from `.context.md`
- check session notes or internal runbooks for private references

## Positioning

A short way to describe Redraft:

> **Redraft is the missing review layer for AI-written Markdown.**

A Codex-specific version:

> **Redraft helps you review, revise, and steer Codex-written documents like real documents, not chat dumps.**
