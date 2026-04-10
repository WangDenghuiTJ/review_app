# Redraft

[English](./README.md) | [简体中文](./README.zh-CN.md)

**面向 AI Markdown 文档的交互式审阅工作台。**

Redraft 是一个本地优先的 Markdown 审阅应用，适合审阅由 AI 生成的长文档，例如方案、计划书、技术设计、论文草稿、PRD、SOP 等。

它补上了很多聊天式智能体工作流里缺失的一层：

- 不是直接静默覆盖，而是尽量保留可见修订痕迹
- 批注挂在精确的选区或段落上，而不是散落在聊天记录里
- 可以按线程定点呼唤智能体，而不是整篇重写
- 用 `.context.md` 注入文档级背景，让智能体更贴近真实意图

当前仓库默认接的是 `Codex`，包括单线程智能体回复、必要时直接改 Markdown 原文等能力。但这个 App 的核心价值并不只是“接 Codex”，而是提供一个适合 AI 文档交互式审阅的工作台。

## 它解决了什么问题

当 Codex 或其他智能体在聊天窗口里给出一篇长方案时，通常会有这些问题：

- 很难逐段审阅和确认
- 只想改一句话，却往往要重跑整篇文档
- 智能体一旦润色原文，常常没有稳定的修改痕迹
- 批注、追问、定点修改都不适合在纯聊天界面里完成

Redraft 把这个过程变成真正的文档审阅闭环：

1. 先让智能体生成草稿
2. 把 Markdown 放进 Redraft
3. 对具体段落发起批注
4. 只对某一条线程呼唤智能体处理
5. 在审阅模式里查看正文修订痕迹，再决定是否接受

## 适合哪些场景

Redraft 特别适合下面这些内容：

- 项目计划书、执行路线图
- 技术设计文档、架构方案
- PRD、SOP、内部说明文档
- 论文、摘要、手稿润色
- 申请材料、提案、长备忘录
- 一切“AI 帮你先写，人再逐段把关”的场景

它最适合的使用姿势不是“让 AI 一次写完全部”，而是：

**先广泛起草，再围绕局部线程逐步收敛。**

## 核心工作流

Redraft 的最小协作单元是：

**一条批注线程，对应一个聚焦问题。**

典型流程如下：

- 加载 Markdown 文档
- 在选区或段落上创建批注线程
- 人工回复，或点击 `呼唤智能体`
- 自动注入同名 `.context.md` 里的文档级背景
- 让智能体只处理当前线程
- 如果线程里明确要求“直接改原文”，允许它直接修改 Markdown
- 在审阅模式里查看修订痕迹

这样做的好处是：智能体作用范围更小，更容易监督，也更符合真实审阅过程。

## 和常见 AI 写作工具的区别

### 1. 重点不是“重写”，而是“审阅”

很多 AI 写作产品默认思路是“再生成一版”。  
Redraft 的重点是：**可审、可批、可追踪、可逐段修改。**

### 2. 线程级智能体调用

你不需要每次都把整篇文档重新交给模型。  
你可以只针对某一条线程，让它做翻译、润色、澄清、改写、补充说明。

### 3. 修订痕迹可见

当智能体直接修改正文时，审阅模式仍然可以显示修订痕迹，而不是黑盒式替换原文。

### 4. 文件本地优先

Redraft 的真实数据都落在本地文件里：

- `doc.md`
- `doc.md.comments.json`
- `doc.md.context.md`
- `doc.md.review.json`

这让它更适合做版本管理、备份、脚本集成，以及和你自己的工作流打通。

## Codex 集成方式

这个仓库目前内置了一套已经跑通的 `Codex` 单线程回复链路。

当你在线程里点击 `呼唤智能体` 时，系统会把这些内容一起交给 Codex：

- 当前 Markdown 正文
- 当前这条线程的历史消息
- 文档级 `.context.md` 摘要

如果线程要求的是普通回答，Codex 会把回复写回该线程。  
如果线程里明确写了“直接修改原文”“替换这段文字”等要求，它也可以直接改当前 Markdown 文件。

这使它非常适合下面这些 Codex 使用方式：

- 先让 Codex 写方案
- 再逐段审阅、逐段批注
- 对局部内容做翻译、润色、改写
- 保留可见的文档修订过程

## 仓库结构

- `tools/md_review_app/`
  前端与本地 HTTP 服务端源码
- `scripts/`
  启动、停止、前台服务、生成直达链接等脚本
- `workflow_review.md`
  公开演示文档
- `workflow_review.md.comments.json`
  公开演示批注线程
- `workflow_review.md.context.md`
  公开演示上下文摘要

## 快速开始

在仓库根目录执行：

```bash
cd /path/to/review_app
./scripts/start_review_app.sh 127.0.0.1 8765 workflow_review.md
```

然后打开：

```text
http://127.0.0.1:8765/?path=workflow_review.md
```

如果你想前台运行服务：

```bash
./scripts/serve_review_app_foreground.sh
```

## 安装到自己的 Codex

仓库里带了一份 `review-flow` skill，适合把长方案、长文档、审阅型输出统一导入 Redraft，而不是留在聊天窗口里。

### 方式一：脚本安装

```bash
cd /path/to/review_app/tools/md_review_app
./scripts/install-review-flow-global.sh
```

默认会安装到：

```text
$HOME/.codex/skills/review-flow
```

### 方式二：手动复制

把下面这个目录复制到你的全局 Codex skills 目录：

```text
tools/md_review_app/skills/review-flow
```

目标通常是：

```text
$HOME/.codex/skills/review-flow
```

安装完成后，在新的 Codex 会话里可以直接使用：

```text
$review-flow
```

## 推荐使用方式

1. 先让 Codex 写一份计划、方案、论文段落或长文档草稿。
2. 把 Markdown 放进这个工作区。
3. 在 Redraft 里打开它。
4. 通过批注线程逐段审阅。
5. 只在需要的地方点击 `呼唤智能体`。
6. 持续维护 `.context.md`，让单线程回复更贴近你的真实目标。
7. 需要分享时导出 PDF 或 PDF+批注。

## 一句话定位

最短的描述方式：

> **Redraft 是 AI Markdown 文档缺失的那一层交互式审阅。**

如果要更偏 Codex 用户语境：

> **Redraft 让你能像审真实文档一样，去审阅、修改、引导 Codex 写出来的内容，而不是把它当成一段聊天输出。**

## 许可证

MIT，详见 [LICENSE](./LICENSE)。
