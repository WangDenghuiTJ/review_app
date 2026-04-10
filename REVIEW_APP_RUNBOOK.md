# Review App 固化运行手册

更新时间：2026-04-09

## 当前固定结论

- Review App 的稳定工作区改为 `/home/wangdh/review_app`
- 默认审阅正文是 `/home/wangdh/review_app/workflow_review.md`
- 默认评论文件是 `/home/wangdh/review_app/workflow_review.md.comments.json`
- 默认最终状态文件是 `/home/wangdh/review_app/workflow_review.md.review.json`
- 浏览器入口统一使用 `http://127.0.0.1:8765/?path=workflow_review.md`

## 已解决的问题

### 1. 旧工作区位于只读路径

原问题：

- 旧参考文档把真实正文写死在 `/mnt/e/code/PyCharm/workflow_review.md`
- 当前智能体在这个会话里无法写入 `/mnt/e/code/PyCharm`
- 结果是正文无法稳定落盘，后续批注和回复也无法形成闭环

固化方案：

- 后续统一使用 `/home/wangdh/review_app` 作为 Review App 工作区
- 智能体只向这个目录写正文和评论文件

### 2. 浏览器没有固定可打开链接

原问题：

- App 之前默认只加载 `workflow_review.md`
- 需要切换文档时，只能手动在输入框里改路径
- 智能体无法直接给用户一个“点开就到目标文档”的链接

固化方案：

- 前端已支持 `?path=相对路径`
- 标准链接格式统一为：

```text
http://127.0.0.1:8765/?path=workflow_review.md
```

例如：

```text
http://127.0.0.1:8765/?path=workflow_review.md
http://127.0.0.1:8765/?path=docs/algae_plan.md
```

### 3. 服务不自启，链接经常打不开

原问题：

- `127.0.0.1:8765` 没有监听时，用户拿到链接也打不开
- 智能体每次都要重新探索服务是否在跑
- 当前智能体命令环境不能可靠持有长期后台进程

固化方案：

- 启动统一走 `/home/wangdh/review_app/scripts/start_review_app.sh`
- 这个脚本会先探活，再按需通过 `tmux` 拉起服务
- 成功后直接输出可打开链接
- 如需手动关闭，可运行 `/home/wangdh/review_app/scripts/stop_review_app.sh`
- 页面内提供“确认通过并关闭”按钮：先把最终状态写入 `.review.json`，再关闭服务

## 后续固定流程

### A. 生成审阅稿

1. 智能体把正文写入 `/home/wangdh/review_app/<目标文档>.md`
2. 如需新文档，直接新建同目录下的 `.md`

### B. 启动并给链接

智能体默认应运行：

```bash
/home/wangdh/review_app/scripts/start_review_app.sh
```

如需手动关闭：

```bash
/home/wangdh/review_app/scripts/stop_review_app.sh
```

如果要前台持有服务，推荐在独立终端运行：

```bash
/home/wangdh/review_app/scripts/serve_review_app_foreground.sh
```

如果目标不是默认文档：

```bash
/home/wangdh/review_app/scripts/start_review_app.sh 127.0.0.1 8765 docs/algae_plan.md
```

或单独生成链接：

```bash
/home/wangdh/review_app/scripts/review_doc_link.sh docs/algae_plan.md
```

### C. 审阅

- 用户打开智能体给出的浏览器链接
- 在页面中直接阅读正文
- 用选区批注或行级批注提出问题
- 如果审阅通过，可直接点击页面上的“确认通过并关闭”

### D. 增加批注

- 一条批注只对应一个问题
- 若需要智能体优先处理，用“标记待处理”

### E. 回复批注

- 智能体读取对应 `.comments.json`
- 如需判断最终是否已通过，读取对应 `.review.json`
- 逐线程回复
- 如接受批注，直接同步修改对应 `.md`
- 回复完成后保存评论文件

## 给后续智能体的最短执行口径

1. 不要再用 `/mnt/e/code/PyCharm/workflow_review.md` 作为默认目标。
2. 统一用 `/home/wangdh/review_app` 作为 Review App 工作区。
3. 给用户链接时，必须给 `http://127.0.0.1:8765/?path=<相对文档路径>` 这种可直接打开的链接。
4. 给链接前先运行 `start_review_app.sh`，不要要求用户手动启动服务。
5. 不要默认启用空闲自动关闭。
6. 如果用户点击“确认通过并关闭”，最终状态要从 `.review.json` 读取。
