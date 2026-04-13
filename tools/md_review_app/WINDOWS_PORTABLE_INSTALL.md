# DocPilot Windows 绿色版安装说明

这份说明对应的是 **Windows 绿色便携版 DocPilot**。

安装完成后，用户可以获得两种体验：

1. 在桌面或任意文件夹里右键 `新建 -> DocPilot 文档`
2. 在任意位置双击 `.docpilot` 文件，直接打开 DocPilot 并进入编辑

注意：

- 当前版本仍然依赖本机 **Python**
- “呼唤智能体”功能仍然依赖本机 **Codex CLI**
- 纯文档编辑、批注、图片、导出 DocPilot 不依赖 Codex CLI

## 一、给智能体的安装指令

如果用户已经在用 Codex / Claude Code / Cloud Code 之类的智能体，可以直接把下面这段话发给智能体执行：

```text
请帮我在 Windows 上安装这个 DocPilot 绿色版，并完成文件关联与右键新建菜单注册。

要求：
1. 把整个 md_review_app 目录放到一个稳定位置，不要后续移动。
2. 确保系统里可用 Python；如果没有，请先安装 Python 3。
3. 进入 md_review_app/windows 目录。
4. 执行 Install-ReviewApp.ps1。
5. 安装完成后，请帮我验证两件事：
   - 双击 .docpilot 文件是否会自动打开 DocPilot
   - 桌面右键 -> 新建 中是否出现 “DocPilot 文档”
6. 如果没有 Codex CLI，请只说明“呼唤智能体”功能暂时不可用，但不要影响文档编辑功能。
```

智能体实际需要执行的关键命令通常只有：

```powershell
powershell -ExecutionPolicy Bypass -File .\windows\Install-ReviewApp.ps1
```

如果用户后面移动了软件目录，或者双击打开失效，直接再执行同一条命令即可修复。

## 二、手工安装步骤

### 1. 放置软件目录

把 `md_review_app` 整个目录放到一个稳定位置，例如：

```text
C:\Tools\md_review_app
```

建议不要把它放到临时下载目录，因为后续如果移动目录，Windows 里的文件关联会失效，需要重新安装一次。

### 2. 确认 Python 可用

打开 PowerShell，执行：

```powershell
py -3 --version
```

如果这个命令失败，再试：

```powershell
python --version
```

如果都失败，请先安装 Python 3，再继续。

### 3. 执行安装脚本

进入 `windows` 目录：

```powershell
cd C:\Tools\md_review_app\windows
```

执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\Install-ReviewApp.ps1
```

这个脚本会完成 3 件事：

1. 生成空白 `Blank.docpilot` 模板
2. 注册 `.docpilot` 的双击打开方式，同时兼容 `.reflow` / `.flow`
3. 注册桌面/文件夹空白处右键 `新建 -> DocPilot 文档`

如果以后软件目录变了，重新执行同一个脚本即可修复关联。

### 4. 验证安装是否成功

请验证下面两项：

#### A. 右键新建

在桌面空白处右键：

```text
新建 -> DocPilot 文档
```

如果出现这个菜单项，说明新建入口已经注册成功。

#### B. 双击打开

双击任意 `.docpilot` 文件，应该会：

1. 自动启动 DocPilot
2. 打开浏览器页面
3. 直接进入该文档的编辑界面

## 三、日常使用方式

### 方式 1：右键新建

在桌面或任意文件夹空白处：

```text
右键 -> 新建 -> DocPilot 文档
```

然后双击这个文件即可开始编辑。

### 方式 2：直接打开已有文档

双击任意 `.docpilot` 文件，DocPilot 会自动打开它。旧的 `.reflow` / `.flow` 也仍然兼容。

### 方式 3：从现有 Markdown 导出

如果你当前已经在 DocPilot 里打开了一份 `.md` 文档，可以在界面里选择：

```text
更多 -> 导出 DocPilot
```

把它导出为单文件 `.docpilot` 文档包，便于分发和双击打开。

## 四、保存逻辑

`.docpilot` 文档打开后的流程是：

1. DocPilot 先把单文件解包到临时目录
2. 在临时目录里完成编辑、批注、图片等操作
3. 关闭后自动重新打包写回原 `.docpilot`

因此用户侧的体验会接近：

- 双击文档
- 编辑
- 关闭
- 下次再双击继续编辑

## 五、Codex CLI 说明

当前版本中：

- 普通编辑、批注、图片、导出 DocPilot：可直接使用
- “呼唤智能体”：仍然需要本机存在 `codex` 命令

如果用户没有安装 Codex CLI，也不会影响文档本身的打开和编辑，只是智能体回复功能不可用。

## 六、如果以后移动了软件目录

如果你把 `md_review_app` 整个目录换了位置，Windows 里原来记录的启动器路径会失效。

这时只需要重新执行一次：

```powershell
powershell -ExecutionPolicy Bypass -File .\Install-ReviewApp.ps1
```

即可修复文件关联和右键新建菜单。

## 七、卸载说明

### 给智能体的卸载指令

可以直接把下面这段话发给智能体执行：

```text
请帮我卸载这个 DocPilot Windows 绿色版。

要求：
1. 进入 md_review_app/windows 目录。
2. 执行 Uninstall-ReviewApp.ps1，移除 .docpilot / .reflow / .flow 的文件关联和右键新建菜单。
3. 卸载后，告诉我是否还需要手动删除 md_review_app 目录。
```

智能体执行的关键命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\windows\Uninstall-ReviewApp.ps1
```

### 手工卸载步骤

进入 `windows` 目录：

```powershell
cd C:\Tools\md_review_app\windows
```

执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\Uninstall-ReviewApp.ps1
```

这个脚本会移除：

1. `.docpilot` / `.reflow` / `.flow` 文件关联
2. 桌面/文件夹右键 `新建 -> DocPilot 文档`

然后如果你不再需要这套软件，再手动删除整个 `md_review_app` 目录即可。

## 八、待上传 GitHub 的发布内容

仓库里已经补了一个打包脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\windows\Build-Windows-Portable.ps1
```

运行后会在仓库根目录生成：

- `dist/docpilot_windows_portable/`
- `dist/docpilot_windows_portable.zip`

其中 zip 包就是可以直接上传到 GitHub Releases 或仓库附件里的绿色版发布包。
