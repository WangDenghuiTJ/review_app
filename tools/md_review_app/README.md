# DocPilot

一个本地运行的文档审阅与 AI 协作工具。  
核心目标是让用户像用 Word 一样处理文档，同时保留 `Markdown + assets + comments + revisions` 的开放底层结构。

## 功能概览

- 文档模式 / 源码模式双视图
- 页边批注、回复、解决、删除
- 批注与正文联动高亮
- 图片插入、资源目录、未引用资源清理
- 修订痕迹查看与“接受修订”
- 自动保存正文、批注、修订侧车文件
- 导出 PDF、导出 PDF+批注
- 导出单文件 `DocPilot` 文档包
- Windows 右键 `新建 -> DocPilot 文档`
- Windows 双击 `.docpilot` 直接打开

## 安装

### 1. 开发模式启动

适合直接在仓库里运行：

```powershell
python .\tools\md_review_app\server.py
```

默认地址：

```text
http://127.0.0.1:8765
```

也可以指定工作区和默认文档：

```powershell
python .\tools\md_review_app\server.py --workspace C:\Docs\Review --default-md spec.md
```

### 2. Windows 绿色版安装

仓库内已经提供 Windows 便携启动链：

- `windows/ReviewApp.vbs`
- `windows/ReviewApp.ps1`
- `windows/ReviewApp.cmd`
- `windows/Install-ReviewApp.ps1`
- `windows/Install-ReviewApp-Compat.ps1`
- `windows/Uninstall-ReviewApp.ps1`
- `windows/Build-Windows-Portable.ps1`

首次安装或修复关联，执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\md_review_app\windows\Install-ReviewApp-Compat.ps1
```

Windows note:
- Prefer `Install-ReviewApp-Compat.ps1` on Windows PowerShell 5.1.
- If `New -> DocPilot Document` does not appear immediately after install, restart Explorer once and test again.

这一步会完成：

- 注册 `.docpilot` 文件双击打开
- 兼容 `.reflow` / `.flow` 双击打开
- 注册右键 `新建 -> DocPilot 文档`
- 生成空白模板 `Blank.docpilot`

如果需要卸载文件关联：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\md_review_app\windows\Uninstall-ReviewApp.ps1
```

如果要生成可直接上传 GitHub 的 Windows 发布包：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\md_review_app\windows\Build-Windows-Portable.ps1
```

默认输出：

- `dist/docpilot_windows_portable/`
- `dist/docpilot_windows_portable.zip`

See [WINDOWS_PORTABLE_INSTALL.md](./WINDOWS_PORTABLE_INSTALL.md) for the detailed Windows install guide.

更详细的 Windows 安装说明见 [WINDOWS_PORTABLE_INSTALL.md](/home/wangdh/review_app/tools/md_review_app/WINDOWS_PORTABLE_INSTALL.md)。

## 使用方法

### 1. 打开文档

有 4 种常见方式：

- 双击 `.docpilot`
- 右键空白处 `新建 -> DocPilot 文档`，再双击打开
- 启动绿色版后点击 `打开`
- 开发模式下直接访问：
  `http://127.0.0.1:8765/?path=xxx.md`

### 2. 编辑正文

- 在 `文档` 模式下直接编辑正文
- 切到 `源码` 模式可查看和编辑原始 Markdown
- 正文默认自动保存
- 刷新页面或重新打开后，正文内容会从磁盘恢复

### 3. 批注与回复

- 选中文字后点击 `添加批注`
- 或在正文右键后选择批注动作
- 右侧批注卡片支持直接编辑正文消息
- `呼唤智能体` 会调用本机 `codex` 命令回复当前线程

注意：

- 如果机器上没有 Codex CLI，文档编辑和批注仍可用
- 但“呼唤智能体”会失败

### 4. 图片

- 顶栏 `插图`
- 或正文右键 `在此插入图片`

插图后：

- 图片会自动写入同名 `.assets/` 目录
- Markdown 会自动写入相对路径引用
- 左侧 `资源目录` 会同步显示

### 5. 公式

- 顶栏 `公式`
- 或正文右键 `在此插入公式`

用法：

- 在弹窗中直接输入 LaTeX
- 不需要手写 `$$`
- 保存后会以块级公式形式插入并渲染
- 点击已渲染的块级公式，可再次打开编辑窗口

### 6. 修订

- 切到 `审阅` 模式可查看修订痕迹
- `干净` 模式只隐藏痕迹，不会删除痕迹
- 只有点击 `接受修订`，当前修订才会被正式吸收进基线

### 7. 导出

`更多` 菜单下提供：

- `导出 DocPilot`
- `导出 PDF`
- `导出 PDF+批注`

## 文档存储结构

如果你打开的是普通 Markdown 文件，例如：

```text
docs/spec.md
```

编辑过程中会在同级目录生成配套文件：

```text
docs/spec.md
docs/spec.assets/
docs/spec.md.comments.json
docs/spec.md.context.md
docs/spec.md.review.json
docs/spec.md.revisions.json
```

说明：

- 正文直接写回原始 `spec.md`
- 图片写入 `spec.assets/`
- 批注、上下文、审阅状态、修订基线写入侧车文件

## `.docpilot` 文档包

`.docpilot` 是主扩展名，`.reflow` / `.flow` 仍兼容打开。  
本质上它是一个单文件容器，里面打包了一整套文档文件。

典型包内结构：

- `doc.md`
- `doc.assets/`
- `doc.md.comments.json`
- `doc.md.context.md`
- `doc.md.review.json`
- `doc.md.revisions.json`
- `manifest.json`

网页端可直接用 `更多 -> 导出 DocPilot` 导出。  
也可以用 CLI 打包：

```powershell
python .\tools\md_review_app\portable\reflow_package_cli.py pack C:\Docs\spec.md
```

解包查看：

```powershell
python .\tools\md_review_app\portable\reflow_package_cli.py unpack C:\Docs\spec.docpilot C:\Temp\spec_unpacked
```

## 协作规范

- `WSL + Review App` 固定协作流见 `WSL_REVIEW_APP_COLLAB_SPEC.md`
- 安装说明见 `WINDOWS_PORTABLE_INSTALL.md`
