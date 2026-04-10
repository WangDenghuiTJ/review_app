# Review App Reference

## Current Project Paths

- Review App source: `/home/wangdh/review_app/tools/md_review_app`
- Workspace root: `/home/wangdh/review_app`
- Actual review Markdown: `/home/wangdh/review_app/workflow_review.md`
- Actual comments JSON: `/home/wangdh/review_app/workflow_review.md.comments.json`
- Actual context sidecar: `/home/wangdh/review_app/workflow_review.md.context.md`
- Actual review state JSON: `/home/wangdh/review_app/workflow_review.md.review.json`
- Start script: `/home/wangdh/review_app/scripts/start_review_app.sh`
- Stop script: `/home/wangdh/review_app/scripts/stop_review_app.sh`
- Foreground launcher: `/home/wangdh/review_app/scripts/serve_review_app_foreground.sh`
- Link helper: `/home/wangdh/review_app/scripts/review_doc_link.sh`
- Default browser link: `http://127.0.0.1:8765/?path=workflow_review.md`

Critical rule:

- Do not use `/mnt/e/code/PyCharm/workflow_review.md` in this sandboxed workflow
- Write reviewed documents under `/home/wangdh/review_app`
- If the user hands over a Markdown from elsewhere, copy/import it into `/home/wangdh/review_app` before launching review
- Give the user a direct `?path=` link, not just the bare homepage
- Start the service automatically via `start_review_app.sh` before returning the link
- The default launch command is `/home/wangdh/review_app/scripts/start_review_app.sh 127.0.0.1 8765 <doc>.md`
- Treat the stdout of `start_review_app.sh` as the canonical user-facing link
- After any document rewrite or review-thread sync, rerun `start_review_app.sh` and return the link again
- Do not assume idle auto-shutdown is enabled
- If the user closes review via the page button, read final approval from `.review.json`

## Operating Model

- Generate long-form plans in the Markdown review file
- Maintain a sibling `.context.md` when the document needs durable background context for later thread handling
- Immediately ensure the local Review App service is serving that file
- Let the user review in the browser
- Read comments from the JSON file
- Reply in threads and sync accepted changes back into the Markdown
- Execute only after the user explicitly approves the reviewed document

## Thread Agent Model

- The in-app “呼唤智能体” button is single-thread scoped
- It receives the current Markdown, the current thread history, and the document `.context.md`
- It does not currently read every thread in the document
- If the thread explicitly asks to replace, rewrite, translate, or directly edit the original text, it may modify the Markdown and then write a reply back into the same thread
- If the user expects cross-thread reasoning, handle that in chat or by manually processing multiple threads rather than assuming the button does it

## Launcher Contract

Use the launcher, not ad-hoc commands, unless it fails:

```bash
/home/wangdh/review_app/scripts/start_review_app.sh 127.0.0.1 8765 workflow_review.md
```

Expected behavior:

- If the service is already healthy, it prints the direct `?path=` link and exits `0`
- If the service is not running, it starts it in tmux, waits for health, prints the direct link, and exits `0`
- If startup fails, it exits non-zero and points to the Review App logs

User-facing rule:

- After you write or sync the review document, return the launcher output link in chat
- Do not tell the user to manually start the service if the launcher can do it
- Only mention the foreground launcher when the background launcher fails in the current environment

## Review States

- `待处理`: explicitly requested for agent handling
- `进行中`: exists but not marked pending
- `已解决`: user considers the thread closed

Handle pending threads first.

## Prompt Patterns

## Strong Trigger Phrases

If the user says anything close to these, prefer `review-flow`:

- "写到 Review App 里"
- "生成个方案让我审"
- "做个长一点的计划书"
- "我想在文档里批注"
- "先给我出文档，不要直接执行"
- "我确认之后你再开始做"
- "你先把方案落文档"
- "按审过的版本执行"

### Draft For Review

```text
基于下面要求，生成一版完整方案，并写入 MT Review App 默认加载的 workflow_review.md，先不要执行，只让我审阅。
```

### Process Pending Threads

```text
读取 Review App 里当前待处理线程，逐条回复；必要时先补全 workflow_review.md.context.md；凡是你认同并需要落到正文的，直接同步修改 workflow_review.md。
```

### Execute After Approval

```text
以当前 workflow_review.md 的已确认版本为准开始执行。如果发现执行口径需要偏离，先列出偏离点，再继续。
```

## Failure Modes To Avoid

- Writing to the wrong Markdown file
- Replying only in chat without updating thread history
- Accepting comments without syncing the Markdown
- Starting execution before explicit approval
