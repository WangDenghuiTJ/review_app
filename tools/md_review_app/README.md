# Markdown Review App

一个本地运行的 Markdown 审阅工具原型，目标是让用户在 `Markdown` 文档里获得接近 Word 的批注体验。

## 已实现

- 直接编辑 `.md` 正文
- 选中文字后点击 `Add Comment`
- 鼠标移动到行尾时显示行级 `+` 批注按钮
- 批注在右侧栏展示，并能回跳到对应原文
- 右侧栏按“待处理 -> 进行中 -> 已解决”优先级排序
- 可按“全部 / 待处理 / 进行中”筛选线程
- 可一键复制“待处理线程摘要”，方便批量回复
- 批注单独保存到同目录的 `.md.comments.json`

## 启动

```powershell
python .\tools\md_review_app\server.py
```

默认地址：

```text
http://127.0.0.1:8765
```

## 存储格式

- 主文档：`workflow_review.md`
- 批注文件：`workflow_review.md.comments.json`

批注不会混进 Markdown 正文，这样用户审阅体验和机器读取都更稳定。

## 协作规范

- `WSL + Review App` 固定操作流见 `WSL_REVIEW_APP_COLLAB_SPEC.md`
- 本地技能草案见 `skills/review-flow`
- 安装到全局技能目录可运行 `scripts/install-review-flow-global.sh`
