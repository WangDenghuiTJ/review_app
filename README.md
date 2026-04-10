# Review App

一个本地运行的 Markdown 审阅工具，核心目标是把“写文档、加批注、单线程呼唤智能体、必要时直接改原文”这条链路做成可重复使用的本地工作流。

这个仓库已经过公开示例清理：

- 根目录里的 `workflow_review.md` 是公开演示文档
- 对应的 `.comments.json`、`.context.md`、`.review.json` 也是公开示例
- 不包含真实项目正文或私人审阅记录

## 功能

- 直接加载和编辑 Markdown
- 针对选区或段落创建批注线程
- 在线程里人工回复
- 在线程里点击“呼唤智能体”
- 智能体只处理当前线程，但会读取：
  - 当前 Markdown 正文
  - 当前线程历史
  - 同名 `.context.md`
- 如果线程明确要求改原文，智能体可以直接修改当前 Markdown
- 编辑审阅模式支持显示相对基线的修订痕迹
- 支持导出 PDF 和 PDF+批注

## 仓库结构

- `tools/md_review_app/`
  Review App 前端与服务端源码
- `scripts/`
  启动、停止、生成直达链接等辅助脚本
- `workflow_review.md`
  默认演示文档
- `workflow_review.md.comments.json`
  默认演示批注
- `workflow_review.md.context.md`
  默认演示上下文摘要

## 本地启动

先进入仓库根目录：

```bash
cd /path/to/review_app
```

再执行：

```bash
./scripts/start_review_app.sh 127.0.0.1 8765 workflow_review.md
```

如果你只是想前台运行服务：

```bash
./scripts/serve_review_app_foreground.sh
```

默认打开地址：

```text
http://127.0.0.1:8765/?path=workflow_review.md
```

## 安装到自己的 Codex

这个仓库里带了一份 `review-flow` skill，可安装到你自己的全局 Codex skills 目录。

### 方式 1：直接运行安装脚本

```bash
cd /path/to/review_app/tools/md_review_app
./scripts/install-review-flow-global.sh
```

默认会安装到：

```text
$HOME/.codex/skills/review-flow
```

安装完成后，在新的 Codex 会话里就可以直接使用：

```text
$review-flow
```

### 方式 2：手动复制

把下面这个目录复制到你自己的全局 skills 目录：

```text
tools/md_review_app/skills/review-flow
```

目标位置通常是：

```text
$HOME/.codex/skills/review-flow
```

## 推荐使用方式

1. 把你的 Markdown 放进 Review App 工作区。
2. 启动本地服务并打开直达链接。
3. 在网页里批注。
4. 单线程问题用“呼唤智能体”处理。
5. 大规模规划、回写、定稿执行则用 `$review-flow`。

## 公开仓库提示

如果你准备把自己的实例设为公开仓库，建议先检查：

- 示例 Markdown 是否仍包含真实业务内容
- `.comments.json` 是否仍保留真实讨论
- `.context.md` 是否泄露真实目标或约束
- `NEXT_SESSION_SUMMARY.md` 之类的说明文件是否仍带私人会话背景
