const state = {
  path: "workflow_review.md",
  absolutePath: "",
  loadedContent: "",
  remoteContentSnapshot: null,
  markdownDirty: false,
  markdownConflict: false,
  comments: [],
  contextContent: "",
  contextPath: "",
  contextUpdatedAt: null,
  activeCommentId: null,
  pendingAnchor: null,
  pendingReplyThreadId: null,
  pendingEditMessageId: null,
  dialogMode: "reply",
  commentsUpdatedAt: null,
  isSavingComments: false,
  lastLoadedCommentsSignature: "",
  notificationsEnabled: false,
  threadFilter: "all",
  showResolvedThreads: false,
  reviewState: null,
  suppressEditorEvents: false,
  viewMode: "edit",
  revisionBaseline: "",
};

const filePathInput = document.getElementById("filePath");
const loadBtn = document.getElementById("loadBtn");
const saveMdBtn = document.getElementById("saveMdBtn");
const addCommentBtn = document.getElementById("addCommentBtn");
const reloadRemoteBtn = document.getElementById("reloadRemoteBtn");
const saveCommentsBtn = document.getElementById("saveCommentsBtn");
const editContextBtn = document.getElementById("editContextBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportPdfWithCommentsBtn = document.getElementById("exportPdfWithCommentsBtn");
const approveCloseBtn = document.getElementById("approveCloseBtn");
const requestAllBtn = document.getElementById("requestAllBtn");
const copyPendingBtn = document.getElementById("copyPendingBtn");
const notifyBtn = document.getElementById("notifyBtn");
const statusText = document.getElementById("statusText");
const fileInfo = document.getElementById("fileInfo");
const editorModeInfo = document.getElementById("editorModeInfo");
const markdownStateInfo = document.getElementById("markdownStateInfo");
const commentCount = document.getElementById("commentCount");
const contextStateInfo = document.getElementById("contextStateInfo");
const reviewStateInfo = document.getElementById("reviewStateInfo");
const editorRoot = document.getElementById("editorRoot");
const modeEditBtn = document.getElementById("modeEditBtn");
const modeRevisionBtn = document.getElementById("modeRevisionBtn");
const viewModeHint = document.getElementById("viewModeHint");
const previewPanel = document.getElementById("previewPanel");
const previewSummary = document.getElementById("previewSummary");
const previewScroll = document.getElementById("previewScroll");
const revisionPreviewRoot = document.getElementById("revisionPreviewRoot");
const resetRevisionBtn = document.getElementById("resetRevisionBtn");
const commentList = document.getElementById("commentList");
const threadSummary = document.getElementById("threadSummary");
const filterAllBtn = document.getElementById("filterAllBtn");
const filterPendingBtn = document.getElementById("filterPendingBtn");
const filterOpenBtn = document.getElementById("filterOpenBtn");
const showResolvedBtn = document.getElementById("showResolvedBtn");
const hideResolvedBtn = document.getElementById("hideResolvedBtn");
const commentDialog = document.getElementById("commentDialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogQuote = document.getElementById("dialogQuote");
const commentAuthor = document.getElementById("commentAuthor");
const commentBody = document.getElementById("commentBody");
const replyDialog = document.getElementById("replyDialog");
const replyDialogTitle = document.getElementById("replyDialogTitle");
const replyDialogQuote = document.getElementById("replyDialogQuote");
const replyAuthor = document.getElementById("replyAuthor");
const replyBody = document.getElementById("replyBody");
const contextDialog = document.getElementById("contextDialog");
const contextDialogHint = document.getElementById("contextDialogHint");
const contextBody = document.getElementById("contextBody");
const printExportRoot = document.getElementById("printExportRoot");

const DEFAULT_USER_AUTHOR = "用户";
const DEFAULT_CONTEXT_TEMPLATE = `# 审阅上下文摘要

## 用户目标
- 

## 已确认约束
- 

## 已否决方案
- 

## 回复批注时的口径
- `;
let editorInstance = null;
let refreshTimer = null;
let editorReady = false;
let editorReadyPromise = null;
let editorScrollElement = null;
let revisionPreviewInstance = null;
let revisionBaselineEditor = null;
let revisionBaselineEditorHost = null;
let revisionBaselineEditorContent = null;
let revisionOverlayHost = null;
let pendingCommentLayout = 0;
let pendingRevisionRender = 0;
let revisionPmState = null;
let revisionPmView = null;
let revisionPluginKey = null;
let lastRevisionDecorationSignature = "";
let applyingRevisionDecorations = false;
let revisionPluginAvailable = true;
const pendingAssistantRequests = new Set();
const handleEditorViewportChange = () => {
  scheduleCommentLayout();
};

const REVISION_META_KEY = "review-revision-decorations";
const REVISION_DEBUG_ENABLED = false;
const REVISION_DEBUG_PREFIX = "[review-revision]";
let pendingStartupViewMode = null;
let pendingStartupPdfExport = null;
let pendingPrintCleanup = 0;

function logRevisionDebug(stage, payload) {
  if (!REVISION_DEBUG_ENABLED) return;
  console.debug(`${REVISION_DEBUG_PREFIX} ${stage}`, payload);
}

function getPathFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("path")?.trim() || "";
}

function getStartupViewModeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("view");
  return mode === "revision" || mode === "edit" ? mode : null;
}

function getStartupPdfExportOptionsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("export") !== "pdf") return null;
  return {
    includeComments: params.get("comments") === "1",
    autoPrint: params.get("autoprint") === "1",
  };
}

function syncUrlWithPath(path) {
  const url = new URL(window.location.href);
  url.searchParams.set("path", path || "workflow_review.md");
  window.history.replaceState({}, "", url);
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function showEditorBootError(error) {
  const message = error?.message || String(error);
  setStatus(`编辑器初始化失败：${message}`, true);
  editorRoot.innerHTML = `
    <div class="editor-error">
      <h3>编辑器初始化失败</h3>
      <p>${escapeHtml(message)}</p>
      <p>页面没有进入可编辑状态，所以正文不会自动加载。这个报错已经被直接显示出来，便于继续定位。</p>
    </div>
  `;
}

function formatReviewState(reviewState) {
  return reviewState?.status === "approved" ? "已通过" : "审阅中";
}

function updateMarkdownState() {
  let label = "正文已同步";
  markdownStateInfo.classList.remove("is-dirty", "is-conflict");
  if (state.markdownConflict) {
    label = "正文有外部更新";
    markdownStateInfo.classList.add("is-conflict");
  } else if (state.markdownDirty) {
    label = "正文未保存";
    markdownStateInfo.classList.add("is-dirty");
  }
  markdownStateInfo.textContent = label;
  reloadRemoteBtn.disabled = !state.remoteContentSnapshot;
}

function getLines(text) {
  return text.split("\n");
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function waitForAnimationFrames(count = 1) {
  return new Promise((resolve) => {
    const step = () => {
      if (count <= 0) {
        resolve();
        return;
      }
      count -= 1;
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeMdPosition(pos) {
  if (!Array.isArray(pos)) return [0, 0];
  return [Math.max(0, Number(pos[0] || 0)), Math.max(0, Number(pos[1] || 0))];
}

function normalizeMdRange(range) {
  if (!Array.isArray(range)) return [[0, 0], [0, 0]];
  return [
    normalizeMdPosition(range[0]),
    normalizeMdPosition(range[1] ?? range[0]),
  ];
}

function normalizeWysiwygRange(range) {
  if (!Array.isArray(range)) return [0, 0];
  return [Number(range[0] || 0), Number(range[1] ?? range[0] ?? 0)];
}

function internalMdPositionToToast(pos) {
  const [line, column] = normalizeMdPosition(pos);
  return [line + 1, column + 1];
}

function toastMdPositionToInternal(pos) {
  if (!Array.isArray(pos)) return [0, 0];
  return [
    Math.max(0, Number(pos[0] || 1) - 1),
    Math.max(0, Number(pos[1] || 1) - 1),
  ];
}

function internalMdRangeToToast(start, end = start) {
  return [
    internalMdPositionToToast(start),
    internalMdPositionToToast(end),
  ];
}

function toastMdRangeToInternal(range) {
  if (!Array.isArray(range)) return [[0, 0], [0, 0]];
  return [
    toastMdPositionToInternal(range[0]),
    toastMdPositionToInternal(range[1] ?? range[0]),
  ];
}

function markdownPosToOffset(text, pos) {
  const [lineIndex, column] = normalizeMdPosition(pos);
  const lines = getLines(text);
  const safeLine = clamp(lineIndex, 0, Math.max(lines.length - 1, 0));
  let offset = 0;
  for (let index = 0; index < safeLine; index += 1) {
    offset += lines[index].length + 1;
  }
  return offset + clamp(column, 0, lines[safeLine]?.length || 0);
}

function offsetToMarkdownPos(text, rawOffset) {
  const lines = getLines(text);
  const offset = clamp(rawOffset, 0, text.length);
  let walked = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineLength = lines[lineIndex].length;
    if (offset <= walked + lineLength) {
      return [lineIndex, offset - walked];
    }
    walked += lineLength + 1;
  }
  const lastLineIndex = Math.max(lines.length - 1, 0);
  return [lastLineIndex, lines[lastLineIndex]?.length || 0];
}

function buildAnchorFromMdRange(mdStart, mdEnd, markdown, mode = "selection") {
  const startPos = normalizeMdPosition(mdStart);
  const endPos = normalizeMdPosition(mdEnd);
  const start = markdownPosToOffset(markdown, startPos);
  const end = markdownPosToOffset(markdown, endPos);
  const safeStart = Math.min(start, end);
  const safeEnd = Math.max(start, end);
  const endLinePos = safeEnd > safeStart ? offsetToMarkdownPos(markdown, Math.max(safeEnd - 1, 0)) : startPos;

  return {
    mode,
    start: safeStart,
    end: safeEnd,
    lineStart: startPos[0] + 1,
    lineEnd: endLinePos[0] + 1,
    selectedText: markdown.slice(safeStart, safeEnd),
    contextBefore: markdown.slice(Math.max(0, safeStart - 40), safeStart),
    contextAfter: markdown.slice(safeEnd, Math.min(markdown.length, safeEnd + 40)),
    mdStart: startPos,
    mdEnd: endPos,
  };
}

function normalizeAnchor(anchor, markdown) {
  if (!anchor || typeof anchor !== "object") {
    return buildAnchorFromMdRange([0, 0], [0, 0], markdown, "line");
  }

  let normalized;
  if (Array.isArray(anchor.mdStart) && Array.isArray(anchor.mdEnd)) {
    normalized = buildAnchorFromMdRange(anchor.mdStart, anchor.mdEnd, markdown, anchor.mode || "selection");
  } else if (typeof anchor.start === "number" && typeof anchor.end === "number") {
    normalized = buildAnchorFromMdRange(
      offsetToMarkdownPos(markdown, anchor.start),
      offsetToMarkdownPos(markdown, anchor.end),
      markdown,
      anchor.mode || "selection"
    );
  } else if (typeof anchor.lineStart === "number") {
    const lines = getLines(markdown);
    const startLine = clamp(anchor.lineStart - 1, 0, Math.max(lines.length - 1, 0));
    const endLine = clamp((anchor.lineEnd || anchor.lineStart) - 1, startLine, Math.max(lines.length - 1, 0));
    normalized = buildAnchorFromMdRange(
      [startLine, 0],
      [endLine, lines[endLine]?.length || 0],
      markdown,
      anchor.mode || "line"
    );
  } else {
    normalized = buildAnchorFromMdRange([0, 0], [0, 0], markdown, "line");
  }

  return {
    ...normalized,
    ...anchor,
    mdStart: normalized.mdStart,
    mdEnd: normalized.mdEnd,
    start: normalized.start,
    end: normalized.end,
    lineStart: normalized.lineStart,
    lineEnd: normalized.lineEnd,
    selectedText: anchor.selectedText ?? normalized.selectedText,
    contextBefore: anchor.contextBefore ?? normalized.contextBefore,
    contextAfter: anchor.contextAfter ?? normalized.contextAfter,
  };
}

function formatLineRange(anchor) {
  return `L${anchor.lineStart}${anchor.lineEnd > anchor.lineStart ? `-L${anchor.lineEnd}` : ""}`;
}

function previewQuote(anchor) {
  return `${formatLineRange(anchor)}\n${anchor.selectedText || "(空行)"}`;
}

function clonePrintableEditorContent() {
  const source = editorRoot.querySelector(".toastui-editor-ww-container .ProseMirror")
    || editorRoot.querySelector(".toastui-editor-md-preview .toastui-editor-contents")
    || editorRoot.querySelector(".toastui-editor-contents");
  if (!source) return null;

  const container = document.createElement("div");
  container.className = "toastui-editor-contents print-document-body";
  container.innerHTML = source.innerHTML;
  container.querySelectorAll("[contenteditable]").forEach((element) => {
    element.removeAttribute("contenteditable");
  });
  container.querySelectorAll(".ProseMirror-separator, .toastui-editor-md-delimiter").forEach((element) => {
    element.remove();
  });
  return container;
}

function buildPrintableCommentsSection() {
  const section = document.createElement("section");
  section.className = "print-comments-section";

  const heading = document.createElement("h2");
  heading.textContent = "批注记录";
  section.appendChild(heading);

  if (!state.comments.length) {
    const empty = document.createElement("p");
    empty.className = "print-comments-empty";
    empty.textContent = "当前文档没有批注线程。";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "print-thread-list";
  const threads = [...state.comments].sort(compareThreadsByAnchor);

  for (const thread of threads) {
    const item = document.createElement("article");
    item.className = "print-thread-item";

    const meta = document.createElement("div");
    meta.className = "print-thread-meta";
    meta.innerHTML = `
      <span>${formatLineRange(thread.anchor)}</span>
      <span>${thread.status === "resolved" ? "已解决" : "进行中"}</span>
      <span>${thread.messages.length} 条消息</span>
      <span>${getAssistantBadge(thread).replace(/<[^>]+>/g, "")}</span>
    `;

    const quote = document.createElement("pre");
    quote.className = "print-thread-quote";
    quote.textContent = thread.anchor.selectedText || "(空行批注)";

    const messages = document.createElement("div");
    messages.className = "print-thread-messages";
    for (const message of thread.messages) {
      const messageItem = document.createElement("div");
      messageItem.className = `print-thread-message ${message.role === "assistant" ? "assistant" : "user"}`;

      const header = document.createElement("div");
      header.className = "print-thread-message-header";
      header.textContent = `${message.author} · ${new Date(message.updatedAt || message.createdAt).toLocaleString()}`;

      const body = document.createElement("p");
      body.className = "print-thread-message-body";
      body.textContent = message.body;

      messageItem.append(header, body);
      messages.appendChild(messageItem);
    }

    item.append(meta, quote, messages);
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

async function preparePdfExport(includeComments = false) {
  ensureEditor();
  if (editorReadyPromise) await editorReadyPromise;
  scheduleRevisionRender();
  scheduleCommentLayout();
  await waitForAnimationFrames(2);

  const documentBody = clonePrintableEditorContent();
  if (!documentBody) {
    throw new Error("当前没有可导出的正文内容。");
  }

  const shell = document.createElement("section");
  shell.className = "print-export-shell";

  const header = document.createElement("header");
  header.className = "print-export-header";

  const title = document.createElement("h1");
  title.textContent = state.path || "Markdown 审阅稿";

  const meta = document.createElement("div");
  meta.className = "print-export-meta";
  meta.innerHTML = `
    <span>导出时间：${new Date().toLocaleString()}</span>
    <span>正文模式：${state.viewMode === "revision" ? "编辑审阅" : "干净模式"}</span>
    <span>编辑器：${editorInstance?.isMarkdownMode?.() ? "Markdown" : "WYSIWYG"}</span>
    <span>批注：${includeComments ? `导出 ${state.comments.length} 个线程` : "不导出"}</span>
  `;

  header.append(title, meta);
  shell.append(header, documentBody);

  if (includeComments) {
    shell.appendChild(buildPrintableCommentsSection());
  }

  printExportRoot.innerHTML = "";
  printExportRoot.appendChild(shell);
  document.body.classList.add("print-export-active");
}

function cleanupPdfExport() {
  if (pendingPrintCleanup) {
    window.clearTimeout(pendingPrintCleanup);
    pendingPrintCleanup = 0;
  }
  document.body.classList.remove("print-export-active");
  printExportRoot.innerHTML = "";
}

async function exportPdf(includeComments = false) {
  try {
    setStatus(includeComments ? "正在准备 PDF（含批注）..." : "正在准备 PDF...");
    await preparePdfExport(includeComments);
    pendingPrintCleanup = window.setTimeout(() => {
      cleanupPdfExport();
    }, 4000);
    window.print();
    setStatus(includeComments
      ? "已打开打印对话框，可选择“另存为 PDF”，批注会一并导出。"
      : "已打开打印对话框，可选择“另存为 PDF”。");
  } catch (error) {
    cleanupPdfExport();
    setStatus(`PDF 导出准备失败：${error.message}`, true);
  }
}

function tokenizeForDiff(text) {
  return String(text).match(/[\u4e00-\u9fff]|[A-Za-z0-9_]+|\s+|[^\s]/g) || [];
}

function diffArrays(left, right) {
  const rows = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      rows[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex]
        ? rows[leftIndex + 1][rightIndex + 1] + 1
        : Math.max(rows[leftIndex + 1][rightIndex], rows[leftIndex][rightIndex + 1]);
    }
  }

  const ops = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      ops.push({ type: "equal", value: left[leftIndex], leftIndex, rightIndex });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    if (rows[leftIndex + 1][rightIndex] >= rows[leftIndex][rightIndex + 1]) {
      ops.push({ type: "delete", value: left[leftIndex], leftIndex, rightIndex });
      leftIndex += 1;
    } else {
      ops.push({ type: "insert", value: right[rightIndex], leftIndex, rightIndex });
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    ops.push({ type: "delete", value: left[leftIndex], leftIndex, rightIndex });
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    ops.push({ type: "insert", value: right[rightIndex], leftIndex, rightIndex });
    rightIndex += 1;
  }
  return ops;
}

function renderTokenDiff(beforeText, afterText) {
  const tokensBefore = tokenizeForDiff(beforeText);
  const tokensAfter = tokenizeForDiff(afterText);
  const ops = diffArrays(tokensBefore, tokensAfter);
  const mergedOps = [];

  for (const item of ops) {
    const previous = mergedOps[mergedOps.length - 1];
    if (previous && previous.type === item.type) {
      previous.value += item.value;
    } else {
      mergedOps.push({ ...item });
    }
  }

  return mergedOps.map((item) => {
    const text = escapeMarkdownInline(item.value);
    if (!item.value.trim()) return text;
    if (item.type === "delete") return `~~${text}~~`;
    if (item.type === "insert") return `**${text}**`;
    return text;
  }).join("");
}

function getMergedTokenOps(beforeText, afterText) {
  const tokensBefore = tokenizeForDiff(beforeText);
  const tokensAfter = tokenizeForDiff(afterText);
  const ops = diffArrays(tokensBefore, tokensAfter);
  const mergedOps = [];

  for (const item of ops) {
    const previous = mergedOps[mergedOps.length - 1];
    if (previous && previous.type === item.type) {
      previous.value += item.value;
    } else {
      mergedOps.push({ ...item });
    }
  }

  return mergedOps;
}

function escapeMarkdownInline(text) {
  return String(text).replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

function setRevisionBaseline(content) {
  state.revisionBaseline = content || "";
  scheduleRevisionRender();
}

function createEmptyRevisionDecorationSet(doc) {
  if (revisionPmView?.DecorationSet?.empty) return revisionPmView.DecorationSet.empty;
  return revisionPmView?.DecorationSet?.create ? revisionPmView.DecorationSet.create(doc, []) : null;
}

function buildRevisionDecorationSet(doc, payload) {
  if (!revisionPmView?.Decoration || !revisionPmView?.DecorationSet) return null;
  if (!payload?.enabled || !Array.isArray(payload.decorations) || !payload.decorations.length) {
    return createEmptyRevisionDecorationSet(doc);
  }

  const decorations = [];
  const maxPos = Math.max(0, doc.content.size);

  for (const item of payload.decorations) {
    if (item.type === "added") {
      const from = clamp(Number(item.from || 0), 0, maxPos);
      const to = clamp(Number(item.to || from), from, maxPos);
      if (to > from) {
        decorations.push(revisionPmView.Decoration.inline(from, to, { class: "revision-added-inline" }));
      }
      continue;
    }

    if (item.type === "deleted") {
      const pos = clamp(Number(item.pos || 0), 0, maxPos);
      const text = String(item.text || "").trim();
      if (!text) continue;
      decorations.push(revisionPmView.Decoration.widget(pos, () => {
        const node = document.createElement("span");
        node.className = "revision-deleted-inline";
        node.textContent = text;
        return node;
      }, {
        side: -1,
        key: `${item.key || text}-${pos}`,
      }));
    }
  }

  return revisionPmView.DecorationSet.create(doc, decorations);
}

function createRevisionDecorationPlugin() {
  return ({ pmState, pmView }) => {
    revisionPmState = pmState;
    revisionPmView = pmView;
    revisionPluginKey = new pmState.PluginKey("reviewRevisionDecorations");

    return {
      wysiwygPlugins: [
        () => new pmState.Plugin({
          key: revisionPluginKey,
          state: {
            init(_, stateDoc) {
              return createEmptyRevisionDecorationSet(stateDoc.doc || stateDoc);
            },
            apply(tr, oldDecorationSet, _oldState, newState) {
              const payload = tr.getMeta(revisionPluginKey) || tr.getMeta(REVISION_META_KEY);
              if (payload) {
                return buildRevisionDecorationSet(newState.doc, payload);
              }
              if (oldDecorationSet?.map) {
                return oldDecorationSet.map(tr.mapping, tr.doc);
              }
              return createEmptyRevisionDecorationSet(newState.doc);
            },
          },
          props: {
            decorations(stateDoc) {
              return this.getState(stateDoc);
            },
          },
        }),
      ],
    };
  };
}

const revisionDecorationPlugin = createRevisionDecorationPlugin();

function updateViewModeButtons() {
  const buttonMap = [
    [modeEditBtn, "edit"],
    [modeRevisionBtn, "revision"],
  ];
  for (const [button, mode] of buttonMap) {
    const active = state.viewMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function setViewMode(mode) {
  state.viewMode = mode;
  const isRevisionMode = mode === "revision";
  previewPanel.classList.add("is-hidden");
  addCommentBtn.disabled = false;
  updateViewModeButtons();
  if (isRevisionMode) {
    if (editorInstance?.isMarkdownMode?.()) {
      editorInstance.changeMode("wysiwyg", true);
      syncEditorModeInfo();
    }
    viewModeHint.textContent = "当前处于编辑审阅模式。修订痕迹会直接出现在正文里，正文仍可继续编辑和批注。";
  } else {
    viewModeHint.textContent = "当前处于干净模式，正文可直接修改和批注。";
    previewSummary.textContent = "当前不显示修订痕迹。";
  }
  scheduleRevisionRender();
  scheduleCommentLayout();
}

function splitMarkdownPrefix(line) {
  const patterns = [
    /^(\s*#{1,6}\s+)/,
    /^(\s*>\s+)/,
    /^(\s*[-*+]\s+\[[ xX]\]\s+)/,
    /^(\s*\d+\.\s+)/,
    /^(\s*[-*+]\s+)/,
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return { prefix: match[1], body: line.slice(match[1].length) };
    }
  }
  return { prefix: "", body: line };
}

function summarizeRevisionText(text, fallback = "") {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 24 ? `${clean.slice(0, 24)}...` : clean;
}

function extractInlineChangeByEdges(beforeText, afterText) {
  const before = String(beforeText || "");
  const after = String(afterText || "");
  let prefix = 0;
  const maxPrefix = Math.min(before.length, after.length);
  while (prefix < maxPrefix && before[prefix] === after[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  const maxSuffix = Math.min(before.length - prefix, after.length - prefix);
  while (
    suffix < maxSuffix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return {
    deleted: before.slice(prefix, before.length - suffix),
    added: after.slice(prefix, after.length - suffix),
    prefixLength: prefix,
    suffixLength: suffix,
  };
}

function extractRevisionFragments(beforeLine, afterLine) {
  const beforeParts = splitMarkdownPrefix(beforeLine);
  const afterParts = splitMarkdownPrefix(afterLine);
  const fragments = extractInlineChangeByEdges(beforeParts.body, afterParts.body);
  const added = fragments.added.trim();
  const deleted = fragments.deleted.trim();

  return {
    added: summarizeRevisionText(added, summarizeRevisionText(afterParts.body)),
    deleted: summarizeRevisionText(deleted, summarizeRevisionText(beforeParts.body)),
    rawAdded: added,
    rawDeleted: deleted,
    prefixLength: Math.max(0, fragments.prefixLength),
  };
}

function decorateRevisionBody(text, type) {
  const safe = escapeMarkdownInline(text);
  if (!text.trim()) return safe;
  return type === "deleted" ? `~~${safe}~~` : `**${safe}**`;
}

function formatWholeRevisionLine(line, type) {
  if (!line.trim()) return "";
  const { prefix, body } = splitMarkdownPrefix(line);
  return `${prefix}${decorateRevisionBody(body, type)}`;
}

function buildRevisionPreviewMarkdown(baseContent, currentContent) {
  const baseLines = getLines(baseContent);
  const currentLines = getLines(currentContent);
  const ops = diffArrays(baseLines, currentLines);
  const lines = [];
  const stats = { additions: 0, deletions: 0, modifications: 0 };

  let index = 0;
  while (index < ops.length) {
    const current = ops[index];
    if (current.type === "equal") {
      lines.push(current.value);
      index += 1;
      continue;
    }

    if (current.type === "delete") {
      const deletions = [];
      while (index < ops.length && ops[index].type === "delete") {
        deletions.push(ops[index]);
        index += 1;
      }
      const insertions = [];
      let probe = index;
      while (probe < ops.length && ops[probe].type === "insert") {
        insertions.push(ops[probe]);
        probe += 1;
      }

      if (insertions.length) {
        const pairCount = Math.min(deletions.length, insertions.length);
        for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
          const beforeLine = deletions[pairIndex].value;
          const afterLine = insertions[pairIndex].value;
          const beforeParts = splitMarkdownPrefix(beforeLine);
          const afterParts = splitMarkdownPrefix(afterLine);
          if (beforeParts.prefix === afterParts.prefix) {
            lines.push(`${afterParts.prefix}${renderTokenDiff(beforeParts.body, afterParts.body)}`);
          } else {
            lines.push(formatWholeRevisionLine(beforeLine, "deleted"));
            lines.push(formatWholeRevisionLine(afterLine, "added"));
          }
          stats.modifications += 1;
        }
        for (let extraIndex = pairCount; extraIndex < deletions.length; extraIndex += 1) {
          lines.push(formatWholeRevisionLine(deletions[extraIndex].value, "deleted"));
          stats.deletions += 1;
        }
        for (let extraIndex = pairCount; extraIndex < insertions.length; extraIndex += 1) {
          lines.push(formatWholeRevisionLine(insertions[extraIndex].value, "added"));
          stats.additions += 1;
        }
        index = probe;
        continue;
      }

      for (const deletion of deletions) {
        lines.push(formatWholeRevisionLine(deletion.value, "deleted"));
        stats.deletions += 1;
      }
      continue;
    }

    if (current.type === "insert") {
      while (index < ops.length && ops[index].type === "insert") {
        lines.push(formatWholeRevisionLine(ops[index].value, "added"));
        stats.additions += 1;
        index += 1;
      }
    }
  }

  return {
    markdown: lines.join("\n"),
    stats,
  };
}

function ensureRevisionBaselineEditor(markdown) {
  if (!window.toastui?.Editor) return null;

  if (!revisionBaselineEditorHost) {
    revisionBaselineEditorHost = document.createElement("div");
    revisionBaselineEditorHost.className = "revision-baseline-host";
    revisionBaselineEditorHost.style.cssText = [
      "position:fixed",
      "left:-100000px",
      "top:-100000px",
      "width:960px",
      "height:720px",
      "opacity:0",
      "pointer-events:none",
      "overflow:hidden",
      "z-index:-1",
    ].join(";");
    document.body.appendChild(revisionBaselineEditorHost);
  }

  if (!revisionBaselineEditor) {
    revisionBaselineEditor = new window.toastui.Editor({
      el: revisionBaselineEditorHost,
      initialValue: markdown || "",
      initialEditType: "wysiwyg",
      previewStyle: "vertical",
      usageStatistics: false,
      hideModeSwitch: true,
      toolbarItems: [],
    });
    revisionBaselineEditorContent = markdown || "";
    return revisionBaselineEditor;
  }

  if ((markdown || "") !== revisionBaselineEditorContent) {
    revisionBaselineEditor.setMarkdown(markdown || "", false);
    revisionBaselineEditorContent = markdown || "";
  }

  return revisionBaselineEditor;
}

function collectWysiwygTextBlocks(doc) {
  const blocks = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    blocks.push({
      node,
      pos,
      start: pos + 1,
      end: pos + 1 + node.content.size,
      text: node.textBetween(0, node.content.size, ""),
    });
  });
  return blocks;
}

function textOffsetToPmPos(block, rawOffset) {
  if (!block) return 0;
  const targetOffset = clamp(rawOffset, 0, block.text.length);
  if (targetOffset <= 0) return block.start;
  if (targetOffset >= block.text.length) return block.end;

  let walked = 0;
  let resolved = block.end;
  let matched = false;
  block.node.descendants((child, relPos) => {
    if (matched) return false;
    if (!child.isText) return;
    const nextWalked = walked + child.text.length;
    if (targetOffset <= nextWalked) {
      resolved = block.start + relPos + (targetOffset - walked);
      matched = true;
      return false;
    }
    walked = nextWalked;
    return undefined;
  });

  return resolved;
}

function buildWysiwygRevisionPayloadFromContent(baseContent, currentContent) {
  if (!editorInstance?.isWysiwygMode?.() || !editorInstance?.wwEditor?.view) {
    return {
      payload: { enabled: false, decorations: [] },
      stats: { additions: 0, deletions: 0, modifications: 0 },
    };
  }

  const baselineEditor = ensureRevisionBaselineEditor(baseContent);
  if (!baselineEditor?.wwEditor?.view) {
    return {
      payload: buildWysiwygRevisionPayload(buildRevisionDecorationPlan(baseContent, currentContent).decorations),
      stats: buildRevisionDecorationPlan(baseContent, currentContent).stats,
    };
  }

  const baselineBlocks = collectWysiwygTextBlocks(baselineEditor.wwEditor.view.state.doc);
  const currentBlocks = collectWysiwygTextBlocks(editorInstance.wwEditor.view.state.doc);
  const ops = diffArrays(
    baselineBlocks.map((block) => block.text),
    currentBlocks.map((block) => block.text)
  );
  const decorations = [];
  const stats = { additions: 0, deletions: 0, modifications: 0 };

  let currentBlockCursor = 0;
  let index = 0;
  while (index < ops.length) {
    const current = ops[index];
    if (current.type === "equal") {
      currentBlockCursor += 1;
      index += 1;
      continue;
    }

    if (current.type === "delete") {
      const deletions = [];
      while (index < ops.length && ops[index].type === "delete") {
        deletions.push(ops[index].value);
        index += 1;
      }

      const insertions = [];
      let probe = index;
      while (probe < ops.length && ops[probe].type === "insert") {
        insertions.push(ops[probe].value);
        probe += 1;
      }

      if (insertions.length) {
        const pairCount = Math.min(deletions.length, insertions.length);
        for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
          const block = currentBlocks[currentBlockCursor + pairIndex];
          if (!block) continue;
          const fragments = extractInlineChangeByEdges(deletions[pairIndex], insertions[pairIndex]);
          const addedFrom = textOffsetToPmPos(block, fragments.prefixLength);
          const addedTo = textOffsetToPmPos(block, fragments.prefixLength + fragments.added.length);
          const deletedPos = textOffsetToPmPos(block, fragments.prefixLength);
          if (fragments.added) {
            decorations.push({
              type: "added",
              from: addedFrom,
              to: addedTo,
            });
          }
          if (fragments.deleted) {
            decorations.push({
              type: "deleted",
              pos: deletedPos,
              text: fragments.deleted,
              key: `ww-mod-del-${currentBlockCursor + pairIndex}-${fragments.prefixLength}-${pairIndex}`,
            });
          }
          stats.modifications += 1;
        }

        for (let extraIndex = pairCount; extraIndex < deletions.length; extraIndex += 1) {
          const anchorBlock = currentBlocks[Math.min(currentBlockCursor + pairCount, currentBlocks.length - 1)] || currentBlocks[currentBlockCursor - 1];
          decorations.push({
            type: "deleted",
            pos: textOffsetToPmPos(anchorBlock, 0),
            text: deletions[extraIndex],
            key: `ww-del-${currentBlockCursor}-${extraIndex}`,
          });
          stats.deletions += 1;
        }

        for (let extraIndex = pairCount; extraIndex < insertions.length; extraIndex += 1) {
          const block = currentBlocks[currentBlockCursor + extraIndex];
          if (!block) continue;
          decorations.push({
            type: "added",
            from: block.start,
            to: block.end,
          });
          stats.additions += 1;
        }

        currentBlockCursor += insertions.length;
        index = probe;
        continue;
      }

      for (let deletionIndex = 0; deletionIndex < deletions.length; deletionIndex += 1) {
        const anchorBlock = currentBlocks[Math.min(currentBlockCursor, currentBlocks.length - 1)] || currentBlocks[currentBlockCursor - 1];
        decorations.push({
          type: "deleted",
          pos: textOffsetToPmPos(anchorBlock, 0),
          text: deletions[deletionIndex],
          key: `ww-del-${currentBlockCursor}-${deletionIndex}`,
        });
        stats.deletions += 1;
      }
      continue;
    }

    if (current.type === "insert") {
      while (index < ops.length && ops[index].type === "insert") {
        const block = currentBlocks[currentBlockCursor];
        if (block) {
          decorations.push({
            type: "added",
            from: block.start,
            to: block.end,
          });
        }
        currentBlockCursor += 1;
        stats.additions += 1;
        index += 1;
      }
    }
  }

  const payload = { enabled: state.viewMode === "revision", decorations };
  logRevisionDebug("wysiwyg-direct-payload", payload);
  return { payload, stats };
}

function buildRevisionDecorationPlan(baseContent, currentContent) {
  const baseLines = getLines(baseContent);
  const currentLines = getLines(currentContent);
  const ops = diffArrays(baseLines, currentLines);
  const decorations = [];
  const stats = { additions: 0, deletions: 0, modifications: 0 };
  let currentLineCursor = 1;
  let index = 0;

  while (index < ops.length) {
    const current = ops[index];
    if (current.type === "equal") {
      currentLineCursor += 1;
      index += 1;
      continue;
    }

    if (current.type === "delete") {
      const deletions = [];
      while (index < ops.length && ops[index].type === "delete") {
        deletions.push(ops[index].value);
        index += 1;
      }
      const insertions = [];
      let probe = index;
      while (probe < ops.length && ops[probe].type === "insert") {
        insertions.push(ops[probe].value);
        probe += 1;
      }

      if (insertions.length) {
        const pairCount = Math.min(deletions.length, insertions.length);
        for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
          const lineIndex = currentLineCursor + pairIndex - 1;
          const fragments = extractRevisionFragments(deletions[pairIndex], insertions[pairIndex]);
          const afterParts = splitMarkdownPrefix(insertions[pairIndex]);
          const bodyColumn = afterParts.prefix.length + fragments.prefixLength;
          if (fragments.rawAdded) {
            decorations.push({
              type: "added",
              mdStart: [lineIndex, bodyColumn],
              mdEnd: [lineIndex, bodyColumn + fragments.rawAdded.length],
            });
          }
          if (fragments.rawDeleted) {
            decorations.push({
              type: "deleted",
              mdPos: [lineIndex, bodyColumn],
              text: fragments.rawDeleted,
              key: `mod-del-${lineIndex}-${bodyColumn}-${pairIndex}`,
            });
          }
          stats.modifications += 1;
        }
        for (let extraIndex = pairCount; extraIndex < deletions.length; extraIndex += 1) {
          const anchorLine = Math.max(0, currentLineCursor + pairCount - 1);
          decorations.push({
            type: "deleted",
            mdPos: [anchorLine, 0],
            text: summarizeRevisionText(splitMarkdownPrefix(deletions[extraIndex]).body),
            key: `del-${anchorLine}-${extraIndex}`,
          });
          stats.deletions += 1;
        }
        for (let extraIndex = pairCount; extraIndex < insertions.length; extraIndex += 1) {
          const lineIndex = currentLineCursor + extraIndex - 1;
          const afterParts = splitMarkdownPrefix(insertions[extraIndex]);
          const bodyText = afterParts.body.trim();
          decorations.push({
            type: "added",
            mdStart: [lineIndex, afterParts.prefix.length],
            mdEnd: [lineIndex, afterParts.prefix.length + bodyText.length],
          });
          stats.additions += 1;
        }
        currentLineCursor += insertions.length;
        index = probe;
        continue;
      }

      for (const deletion of deletions) {
        const anchorLine = Math.max(0, currentLineCursor - 1);
        decorations.push({
          type: "deleted",
          mdPos: [anchorLine, 0],
          text: summarizeRevisionText(splitMarkdownPrefix(deletion).body),
          key: `del-${anchorLine}-${stats.deletions}`,
        });
        stats.deletions += 1;
      }
      continue;
    }

    if (current.type === "insert") {
      while (index < ops.length && ops[index].type === "insert") {
        const lineIndex = currentLineCursor - 1;
        const afterParts = splitMarkdownPrefix(ops[index].value);
        const bodyText = afterParts.body.trim();
        decorations.push({
          type: "added",
          mdStart: [lineIndex, afterParts.prefix.length],
          mdEnd: [lineIndex, afterParts.prefix.length + bodyText.length],
        });
        currentLineCursor += 1;
        stats.additions += 1;
        index += 1;
      }
    }
  }

  logRevisionDebug("markdown-decorations", {
    stats,
    decorations: decorations.map((item) => ({
      type: item.type,
      mdStart: item.mdStart || null,
      mdEnd: item.mdEnd || null,
      mdPos: item.mdPos || null,
      text: item.text || null,
      key: item.key || null,
    })),
  });

  return { decorations, stats };
}

function buildWysiwygRevisionPayload(markdownDecorations) {
  if (!editorInstance?.isWysiwygMode?.()) return { enabled: false, decorations: [] };
  const decorations = [];
  for (const item of markdownDecorations) {
    if (item.type === "added") {
      const [toastStart, toastEnd] = internalMdRangeToToast(item.mdStart, item.mdEnd);
      const converted = normalizeWysiwygRange(
        editorInstance.convertPosToMatchEditorMode(toastStart, toastEnd, "wysiwyg")
      );
      logRevisionDebug("convert-added", {
        markdown: {
          mdStart: item.mdStart,
          mdEnd: item.mdEnd,
        },
        toast: {
          start: toastStart,
          end: toastEnd,
        },
        converted,
      });
      if (converted[1] > converted[0]) {
        decorations.push({ type: "added", from: converted[0], to: converted[1] });
      }
      continue;
    }
    if (item.type === "deleted") {
      const [toastPos] = internalMdRangeToToast(item.mdPos, item.mdPos);
      const converted = normalizeWysiwygRange(
        editorInstance.convertPosToMatchEditorMode(toastPos, toastPos, "wysiwyg")
      );
      logRevisionDebug("convert-deleted", {
        markdown: {
          mdPos: item.mdPos,
          text: item.text,
          key: item.key,
        },
        toast: {
          pos: toastPos,
        },
        converted,
      });
      decorations.push({
        type: "deleted",
        pos: converted[0],
        text: item.text,
        key: item.key,
      });
    }
  }
  const payload = { enabled: state.viewMode === "revision", decorations };
  logRevisionDebug("wysiwyg-payload", payload);
  return payload;
}

function applyRevisionDecorations(payload) {
  if (!editorInstance?.wwEditor?.view || !revisionPluginKey) return;
  const view = editorInstance.wwEditor.view;
  const signature = JSON.stringify(payload);
  if (signature === lastRevisionDecorationSignature) return;
  lastRevisionDecorationSignature = signature;
  applyingRevisionDecorations = true;
  try {
    const tr = view.state.tr.setMeta(revisionPluginKey, payload).setMeta(REVISION_META_KEY, payload);
    view.dispatch(tr);
  } finally {
    applyingRevisionDecorations = false;
  }
}

function renderRevisionTrace() {
  if (!editorInstance) return;
  if (state.viewMode === "edit") {
    previewSummary.textContent = "当前不显示修订痕迹。";
    applyRevisionDecorations({ enabled: false, decorations: [] });
    return;
  }
  const baseline = state.revisionBaseline || "";
  const currentContent = getMarkdownContent();
  const { payload, stats } = buildWysiwygRevisionPayloadFromContent(baseline, currentContent);
  previewSummary.textContent = stats.modifications || stats.additions || stats.deletions
    ? `相对基线检测到 ${stats.modifications} 处修改、${stats.additions} 处新增、${stats.deletions} 处删除。`
    : "当前版本和基线一致，没有新增、删除或修改痕迹。";
  resetRevisionBtn.hidden = false;
  applyRevisionDecorations(payload);
}

function getRenderedBlockNodes() {
  if (editorInstance?.isMarkdownMode?.()) return [];
  const proseMirror = editorRoot.querySelector(".toastui-editor-ww-container .ProseMirror");
  if (!proseMirror) return [];
  return [...proseMirror.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr")]
    .filter((node) => {
      if (node.matches("p") && node.closest("li, blockquote, td, th")) return false;
      return node.getBoundingClientRect().height > 0;
    });
}

function getTextNodesUnder(node) {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      return textNode.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }
  return nodes;
}

function getRangeRectsAtOffset(containerNode, textNodes, targetOffset, length = 0) {
  let remaining = Math.max(0, targetOffset);
  for (const textNode of textNodes) {
    const value = textNode.nodeValue || "";
    if (remaining > value.length) {
      remaining -= value.length;
      continue;
    }

    const start = Math.min(remaining, value.length);
    const end = length > 0
      ? Math.min(value.length, start + length)
      : start;
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rects = [...range.getClientRects()];

    if (rects.length) return rects;

    // Collapsed ranges may report no rects at line edges; expand by one char when possible.
    if (length === 0 && value.length > 0) {
      const fallbackEnd = Math.min(value.length, start + 1);
      if (fallbackEnd > start) {
        range.setEnd(textNode, fallbackEnd);
        return [...range.getClientRects()];
      }
    }
    return [];
  }
  return [];
}

function getLineNodeForChange(renderedNodes, markdownBlocks, change) {
  const blockIndex = findBlockIndexForLine(markdownBlocks, change.lineStart);
  return renderedNodes[Math.min(Math.max(blockIndex, 0), renderedNodes.length - 1)] || null;
}

function renderRevisionInlineMarks(changes, markdown) {
  const source = getEditorScrollContainer();
  const renderedBlocks = getRenderedBlockMetrics(source);
  const renderedNodes = getRenderedBlockNodes();
  const markdownBlocks = parseMarkdownBlocks(markdown);

  if (!source || !renderedBlocks.length || !renderedNodes.length || !markdownBlocks.length) {
    revisionPreviewRoot.innerHTML = '<div class="revision-empty">当前无法稳定定位修订痕迹，请先保持在 WYSIWYG 模式再试一次。</div>';
    return;
  }

  revisionPreviewRoot.innerHTML = "";
  revisionPreviewRoot.style.height = `${Math.max(source.scrollHeight, source.clientHeight)}px`;
  const track = document.createElement("div");
  track.className = "revision-inline-track";
  const sourceRect = source.getBoundingClientRect();

  for (const change of changes) {
    const lineNode = getLineNodeForChange(renderedNodes, markdownBlocks, change);
    if (!lineNode) continue;
    const lineText = lineNode.textContent || "";
    const textNodes = getTextNodesUnder(lineNode);
    if (!textNodes.length) continue;

    if (change.rawAdded) {
      const additionIndex = Math.max(0, lineText.indexOf(change.rawAdded));
      if (additionIndex >= 0) {
        const rects = getRangeRectsAtOffset(lineNode, textNodes, additionIndex, change.rawAdded.length);
        for (const rect of rects) {
          const mark = document.createElement("span");
          mark.className = "revision-inline-mark is-added";
          mark.style.left = `${rect.left - sourceRect.left + source.scrollLeft}px`;
          mark.style.top = `${rect.top - sourceRect.top + source.scrollTop}px`;
          mark.style.width = `${rect.width}px`;
          mark.style.height = `${rect.height}px`;
          track.appendChild(mark);
        }
      }
    }

    if (change.rawDeleted) {
      const deleteOffset = Math.max(0, Math.min(change.prefixLength || 0, lineText.length));
      const rects = getRangeRectsAtOffset(lineNode, textNodes, deleteOffset, 0);
      const anchorRect = rects[0] || lineNode.getBoundingClientRect();
      const deleted = document.createElement("span");
      deleted.className = "revision-inline-deleted";
      deleted.textContent = change.rawDeleted;
      deleted.style.left = `${Math.max(0, anchorRect.left - sourceRect.left + source.scrollLeft)}px`;
      deleted.style.top = `${anchorRect.top - sourceRect.top + source.scrollTop}px`;
      track.appendChild(deleted);
    }
  }

  revisionPreviewRoot.appendChild(track);
}

function scheduleRevisionRender() {
  if (pendingRevisionRender) return;
  pendingRevisionRender = window.requestAnimationFrame(() => {
    pendingRevisionRender = 0;
    renderRevisionTrace();
  });
}

function normalizeRole(author, fallback = "user") {
  const normalized = (author || "").trim().toLowerCase();
  if (normalized === "助手" || normalized === "assistant") return "assistant";
  if (normalized === "用户" || normalized === "user") return "user";
  return fallback;
}

function createMessage(author, body) {
  const now = new Date().toISOString();
  const cleanAuthor = author.trim() || "未署名";
  return {
    id: `m-${crypto.randomUUID()}`,
    author: cleanAuthor,
    role: normalizeRole(cleanAuthor),
    body,
    createdAt: now,
    updatedAt: now,
  };
}

function ensureAssistantMeta(thread) {
  if (!thread.assistantRequest) {
    thread.assistantRequest = {
      requested: false,
      requestedAt: null,
      mode: null,
      note: null,
      respondedAt: null,
    };
  }
  return thread;
}

function normalizeThread(item, markdown) {
  const messages = Array.isArray(item.messages) && item.messages.length
    ? item.messages.map((message, index) => ({
        id: message.id || `m-legacy-${index}`,
        author: message.author || item.author || "用户",
        role: message.role || normalizeRole(message.author || item.author || "用户"),
        body: message.body || "",
        createdAt: message.createdAt || item.createdAt || new Date().toISOString(),
        updatedAt: message.updatedAt || item.updatedAt || item.createdAt || new Date().toISOString(),
      }))
    : [{
        id: `m-legacy-root-${item.id || crypto.randomUUID()}`,
        author: item.author || "用户",
        role: normalizeRole(item.author || "用户"),
        body: item.body || "",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      }];

  return ensureAssistantMeta({
    id: item.id || `t-${crypto.randomUUID()}`,
    status: item.status || "open",
    anchor: normalizeAnchor(item.anchor, markdown),
    messages,
    createdAt: item.createdAt || messages[0].createdAt,
    updatedAt: item.updatedAt || messages[messages.length - 1].updatedAt,
    assistantRequest: item.assistantRequest || null,
  });
}

function commentsSignature(comments) {
  return JSON.stringify(comments);
}

function isThreadPending(thread) {
  const req = ensureAssistantMeta(thread).assistantRequest;
  return Boolean(req.requested && !req.respondedAt);
}

function isThreadOpen(thread) {
  return thread.status !== "resolved";
}

function getThreadCounts() {
  return state.comments.reduce((acc, thread) => {
    if (isThreadPending(thread)) acc.pending += 1;
    if (isThreadOpen(thread) && !isThreadPending(thread)) acc.open += 1;
    if (!isThreadOpen(thread)) acc.resolved += 1;
    if (isThreadOpen(thread)) acc.unresolved += 1;
    return acc;
  }, { pending: 0, open: 0, resolved: 0, unresolved: 0 });
}

function compareThreads(left, right) {
  const leftRank = isThreadPending(left) ? 0 : (isThreadOpen(left) ? 1 : 2);
  const rightRank = isThreadPending(right) ? 0 : (isThreadOpen(right) ? 1 : 2);
  if (leftRank !== rightRank) return leftRank - rightRank;
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function compareThreadsByAnchor(left, right) {
  const lineDelta = (left.anchor?.lineStart || 0) - (right.anchor?.lineStart || 0);
  if (lineDelta !== 0) return lineDelta;
  return compareThreads(left, right);
}

function getVisibleThreads() {
  return [...state.comments]
    .sort(compareThreads)
    .filter((thread) => {
      if (!state.showResolvedThreads && thread.status === "resolved") return false;
      if (state.threadFilter === "pending") return isThreadPending(thread);
      if (state.threadFilter === "open") return isThreadOpen(thread) && !isThreadPending(thread);
      return true;
    });
}

function updateThreadFilterButtons() {
  const filterButtons = [
    [filterAllBtn, "all"],
    [filterPendingBtn, "pending"],
    [filterOpenBtn, "open"],
  ];
  for (const [button, filterName] of filterButtons) {
    const active = state.threadFilter === filterName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function updateResolvedVisibilityButtons() {
  showResolvedBtn.classList.toggle("is-active", state.showResolvedThreads);
  hideResolvedBtn.classList.toggle("is-active", !state.showResolvedThreads);
  showResolvedBtn.disabled = state.showResolvedThreads;
  hideResolvedBtn.disabled = !state.showResolvedThreads;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "readonly");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function buildPendingThreadsDigest(threads) {
  const header = [
    `文件: ${state.path}`,
    `绝对路径: ${state.absolutePath || "未加载"}`,
    `导出时间: ${new Date().toLocaleString()}`,
    `待处理线程数: ${threads.length}`,
    "",
  ];

  const sections = threads.map((thread, index) => [
    `## ${index + 1}. ${formatLineRange(thread.anchor)}`,
    `状态: ${thread.status === "resolved" ? "已解决" : "进行中"}`,
    "原文:",
    thread.anchor.selectedText || "(空行批注)",
    "",
    "线程消息:",
    ...thread.messages.map((message) => `- ${message.author}[${message.role}]: ${message.body}`),
  ].join("\n"));

  return [...header, ...sections].join("\n\n");
}

async function copyPendingThreads() {
  const pendingThreads = [...state.comments].sort(compareThreads).filter(isThreadPending);
  if (!pendingThreads.length) {
    setStatus("当前没有待处理线程可复制。", true);
    return;
  }
  try {
    await copyText(buildPendingThreadsDigest(pendingThreads));
    setStatus(`已复制 ${pendingThreads.length} 个待处理线程摘要。`);
  } catch (error) {
    setStatus(`复制失败：${error.message}`, true);
  }
}

function setComments(comments, updatedAt = null, markdown = getMarkdownContent()) {
  state.comments = comments.map((item) => normalizeThread(item, markdown));
  state.commentsUpdatedAt = updatedAt;
  state.lastLoadedCommentsSignature = commentsSignature(state.comments);
}

function setReviewState(reviewState) {
  state.reviewState = reviewState || null;
  reviewStateInfo.textContent = formatReviewState(state.reviewState);
  approveCloseBtn.disabled = state.reviewState?.status === "approved";
}

function updateContextState() {
  const hasContext = Boolean((state.contextContent || "").trim());
  contextStateInfo.textContent = hasContext ? "上下文已配置" : "上下文未配置";
  contextStateInfo.classList.toggle("is-context-ready", hasContext);
}

function setContextState(context) {
  state.contextContent = context?.content || "";
  state.contextPath = context?.relativePath || "";
  state.contextUpdatedAt = context?.updatedAt || null;
  updateContextState();
}

function getContextDraft() {
  return state.contextContent.trim() ? state.contextContent : DEFAULT_CONTEXT_TEMPLATE;
}

function getAssistantBadge(thread) {
  const req = ensureAssistantMeta(thread).assistantRequest;
  if (req.requested && !req.respondedAt) {
    return '<span class="assistant-pill waiting">待处理</span>';
  }
  if (req.respondedAt) {
    return '<span class="assistant-pill done">已回复</span>';
  }
  return '<span class="assistant-pill idle">未标记</span>';
}

function renderComments() {
  commentList.innerHTML = "";
  const counts = getThreadCounts();
  const visibleThreads = getVisibleThreads();

  threadSummary.textContent = `${counts.pending} 待处理 · ${counts.open} 进行中 · ${counts.resolved} 已解决`;
  commentCount.textContent = visibleThreads.length === state.comments.length
    ? `${state.comments.length} 个线程`
    : `${visibleThreads.length} / ${state.comments.length} 个线程`;
  reviewStateInfo.textContent = formatReviewState(state.reviewState);
  requestAllBtn.disabled = counts.unresolved === 0;
  copyPendingBtn.disabled = counts.pending === 0;
  updateThreadFilterButtons();
  updateResolvedVisibilityButtons();

  if (!visibleThreads.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.comments.length
      ? (state.showResolvedThreads ? "当前筛选条件下没有线程。" : "当前没有可见线程。已解决批注已隐藏，可点“展开所有标注”查看历史。")
      : "还没有批注线程。先在编辑器里选中文字，再点“批注当前选区”。";
    commentList.appendChild(empty);
    return;
  }

  const commentTrack = document.createElement("div");
  commentTrack.className = "comment-track";
  const positionedThreads = [...visibleThreads].sort(compareThreadsByAnchor);

  for (const thread of positionedThreads) {
    const card = document.createElement("article");
    card.className = "thread-card";
    card.dataset.lineStart = String(thread.anchor?.lineStart || 1);
    if (thread.id === state.activeCommentId) card.classList.add("active");
    if (isThreadPending(thread)) card.classList.add("pending");

    const header = document.createElement("div");
    header.className = "thread-header";

    const meta = document.createElement("div");
    meta.className = "thread-meta";
    meta.innerHTML = `
      <span>${formatLineRange(thread.anchor)}</span>
      <span>${thread.messages.length} 条消息</span>
      <span class="status-pill ${thread.status === "resolved" ? "resolved" : ""}">${thread.status === "resolved" ? "已解决" : "进行中"}</span>
      ${getAssistantBadge(thread)}
    `;

    const jumpBtn = document.createElement("button");
    jumpBtn.type = "button";
    jumpBtn.className = "ghost";
    jumpBtn.textContent = "定位";
    jumpBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      focusComment(thread.id);
    });

    header.append(meta, jumpBtn);

    const quote = document.createElement("pre");
    quote.className = "thread-quote";
    quote.textContent = thread.anchor.selectedText || "(空行批注)";

    const messages = document.createElement("div");
    messages.className = "thread-messages";
    for (const message of thread.messages) {
      const item = document.createElement("div");
      item.className = `message ${message.role === "assistant" ? "assistant" : "user"}`;

      const messageHeader = document.createElement("div");
      messageHeader.className = "message-header";

      const metaBlock = document.createElement("div");
      metaBlock.textContent = `${message.author} · ${new Date(message.updatedAt || message.createdAt).toLocaleString()}`;

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "ghost";
      editBtn.textContent = "编辑";
      editBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        openEditDialog(thread.id, message.id);
      });

      messageHeader.append(metaBlock, editBtn);

      const body = document.createElement("p");
      body.className = "message-body";
      body.textContent = message.body;

      item.append(messageHeader, body);
      messages.appendChild(item);
    }

    const actions = document.createElement("div");
    actions.className = "thread-actions";

    const requestBtn = document.createElement("button");
    requestBtn.type = "button";
    requestBtn.className = "secondary";
    requestBtn.textContent = pendingAssistantRequests.has(thread.id)
      ? "正在呼唤..."
      : (ensureAssistantMeta(thread).assistantRequest.requested && !thread.assistantRequest.respondedAt
          ? "处理中..."
          : "呼唤智能体");
    requestBtn.disabled = pendingAssistantRequests.has(thread.id)
      || (ensureAssistantMeta(thread).assistantRequest.requested && !thread.assistantRequest.respondedAt);
    requestBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await requestAssistantForThread(thread.id, "single");
    });

    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "secondary";
    replyBtn.textContent = "回复";
    replyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openReplyDialog(thread.id);
    });

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "ghost";
    toggleBtn.textContent = thread.status === "resolved" ? "重新打开" : "标记已解决";
    toggleBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await toggleThreadStatus(thread.id);
    });

    actions.append(requestBtn, replyBtn, toggleBtn);
    card.append(header, quote, messages, actions);
    card.addEventListener("click", () => focusComment(thread.id));
    commentTrack.appendChild(card);
  }

  commentList.appendChild(commentTrack);
  scheduleCommentLayout();
}

function findScrollableElement(startNode) {
  let node = startNode;
  while (node && node !== editorRoot) {
    if (node.scrollHeight > node.clientHeight + 4) return node;
    node = node.parentElement;
  }
  return null;
}

function getEditorScrollContainer() {
  const selectors = editorInstance?.isMarkdownMode?.()
    ? [
        ".toastui-editor-md-container .cm-scroller",
        ".toastui-editor-md-container .CodeMirror-scroll",
        ".toastui-editor-md-container .toastui-editor",
      ]
    : [
        ".toastui-editor-ww-container .toastui-editor-contents",
        ".toastui-editor-ww-container .ProseMirror",
        ".toastui-editor-ww-container .toastui-editor",
      ];

  for (const selector of selectors) {
    const node = editorRoot.querySelector(selector);
    const scrollable = node ? findScrollableElement(node) || node : null;
    if (scrollable) return scrollable;
  }

  const fallback = editorRoot.querySelector(".toastui-editor-main");
  return fallback || null;
}

function parseMarkdownBlocks(markdown) {
  const lines = getLines(markdown);
  const blocks = [];
  let paragraphStart = null;
  let codeFenceStart = null;
  let codeFenceToken = null;

  const pushParagraph = (endIndex) => {
    if (paragraphStart === null) return;
    blocks.push({ lineStart: paragraphStart + 1, lineEnd: endIndex + 1 });
    paragraphStart = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (codeFenceStart !== null) {
      if (trimmed.startsWith(codeFenceToken)) {
        blocks.push({ lineStart: codeFenceStart + 1, lineEnd: index + 1 });
        codeFenceStart = null;
        codeFenceToken = null;
      }
      continue;
    }

    if (!trimmed) {
      pushParagraph(index - 1);
      continue;
    }

    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      pushParagraph(index - 1);
      codeFenceStart = index;
      codeFenceToken = fenceMatch[1];
      continue;
    }

    if (/^#{1,6}\s/.test(trimmed) || /^([-*_])\1{2,}\s*$/.test(trimmed)) {
      pushParagraph(index - 1);
      blocks.push({ lineStart: index + 1, lineEnd: index + 1 });
      continue;
    }

    if (/^>\s?/.test(trimmed) || /^(\d+\.\s+|[-*+]\s+)/.test(trimmed)) {
      pushParagraph(index - 1);
      blocks.push({ lineStart: index + 1, lineEnd: index + 1 });
      continue;
    }

    if (paragraphStart === null) paragraphStart = index;
  }

  if (codeFenceStart !== null) {
    blocks.push({ lineStart: codeFenceStart + 1, lineEnd: lines.length });
  }
  pushParagraph(lines.length - 1);
  return blocks;
}

function findBlockIndexForLine(blocks, lineStart) {
  if (!blocks.length) return -1;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (lineStart >= block.lineStart && lineStart <= block.lineEnd) return index;
    if (lineStart < block.lineStart) return Math.max(0, index - 1);
  }
  return blocks.length - 1;
}

function getRenderedBlockMetrics(source) {
  if (!source) return [];

  if (editorInstance?.isMarkdownMode?.()) {
    const lineNodes = [...editorRoot.querySelectorAll(".toastui-editor-md-container .cm-line, .toastui-editor-md-container .CodeMirror-line")];
    const sourceRect = source.getBoundingClientRect();
    return lineNodes
      .filter((node) => node.getBoundingClientRect().height > 0)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top - sourceRect.top + source.scrollTop,
          height: rect.height,
        };
      });
  }

  const proseMirror = editorRoot.querySelector(".toastui-editor-ww-container .ProseMirror");
  if (!proseMirror) return [];
  const sourceRect = source.getBoundingClientRect();
  const nodes = [...proseMirror.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr")];
  return nodes
    .filter((node) => {
      if (node.matches("p") && node.closest("li, blockquote, td, th")) return false;
      return true;
    })
    .filter((node) => node.getBoundingClientRect().height > 0)
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top - sourceRect.top + source.scrollTop,
        height: rect.height,
      };
    });
}

function attachEditorScrollSync() {
  const nextScrollElement = getEditorScrollContainer();
  if (editorScrollElement === nextScrollElement) return;
  if (editorScrollElement) {
    editorScrollElement.removeEventListener("scroll", handleEditorViewportChange);
  }
  editorScrollElement = nextScrollElement;
  if (editorScrollElement) {
    editorScrollElement.addEventListener("scroll", handleEditorViewportChange, { passive: true });
  }
}

function scheduleCommentLayout() {
  if (pendingCommentLayout) return;
  pendingCommentLayout = window.requestAnimationFrame(() => {
    pendingCommentLayout = 0;
    syncCommentLayoutWithEditor();
  });
}

function syncCommentLayoutWithEditor() {
  const commentTrack = commentList.querySelector(".comment-track");
  if (!commentTrack) return;

  attachEditorScrollSync();
  const cards = [...commentTrack.querySelectorAll(".thread-card")];
  if (!cards.length) return;

  const markdown = getMarkdownContent();
  const markdownLines = Math.max(getLines(markdown).length, 1);
  const markdownBlocks = parseMarkdownBlocks(markdown);
  const source = editorScrollElement;
  const renderedBlocks = getRenderedBlockMetrics(source);
  const sourceClientHeight = source?.clientHeight || commentList.clientHeight;
  const baseHeight = Math.max(sourceClientHeight, commentList.clientHeight);
  const gap = 12;
  const visibleMargin = 64;
  let lastBottom = -Infinity;
  const usingRenderedBlocks = renderedBlocks.length > 0 && markdownBlocks.length > 0;

  commentTrack.style.height = `${commentList.clientHeight}px`;

  for (const card of cards) {
    const lineStart = Number(card.dataset.lineStart || "1");
    let desiredTop;
    if (usingRenderedBlocks) {
      const blockIndex = findBlockIndexForLine(markdownBlocks, lineStart);
      const metric = renderedBlocks[Math.min(blockIndex, renderedBlocks.length - 1)];
      desiredTop = metric ? metric.top : 0;
    } else {
      const ratio = markdownLines <= 1 ? 0 : (lineStart - 1) / (markdownLines - 1);
      desiredTop = ratio * Math.max(baseHeight - card.offsetHeight, 0);
    }
    const viewportTop = source ? desiredTop - source.scrollTop : desiredTop;
    const offscreen = viewportTop + card.offsetHeight < -visibleMargin || viewportTop > commentList.clientHeight + visibleMargin;

    if (offscreen) {
      card.classList.add("is-offscreen");
      card.style.top = "-9999px";
      continue;
    }

    const top = Math.max(viewportTop, Number.isFinite(lastBottom) ? lastBottom + gap : viewportTop);
    card.classList.remove("is-offscreen");
    card.style.top = `${Math.max(top, 0)}px`;
    lastBottom = Math.max(top, 0) + card.offsetHeight;
  }
}

function ensureEditor() {
  if (editorInstance) return editorInstance;
  const Editor = window.toastui?.Editor;
  if (!Editor) {
    throw new Error("Toast UI Editor 未正确加载。");
  }

  editorReadyPromise = new Promise((resolve) => {
    const markReady = () => {
      if (editorReady) return;
      editorReady = true;
      resolve();
    };

    const createEditor = (plugins = []) => new Editor({
      el: editorRoot,
      initialValue: "",
      initialEditType: "wysiwyg",
      previewStyle: "tab",
      plugins,
      height: "100%",
      minHeight: "560px",
      autofocus: false,
      usageStatistics: false,
      events: {
        load: markReady,
      },
    });

    try {
      editorInstance = createEditor(revisionPluginAvailable ? [revisionDecorationPlugin] : []);
    } catch (error) {
      revisionPluginAvailable = false;
      revisionPmState = null;
      revisionPmView = null;
      revisionPluginKey = null;
      lastRevisionDecorationSignature = "";
      setStatus(`修订插件初始化失败，已自动降级为普通编辑：${error?.message || error}`, true);
      editorRoot.innerHTML = "";
      editorInstance = createEditor([]);
    }

    window.setTimeout(markReady, 300);
    window.requestAnimationFrame(() => {
      attachEditorScrollSync();
    });
  });

  if (typeof editorInstance?.on === "function") {
    editorInstance.on("change", () => {
      if (state.suppressEditorEvents || applyingRevisionDecorations) return;
      syncMarkdownDirtyState();
      syncEditorModeInfo();
      autosaveStatus();
      scheduleRevisionRender();
      scheduleCommentLayout();
    });
    editorInstance.on("focus", () => {
      syncEditorModeInfo();
      scheduleRevisionRender();
      scheduleCommentLayout();
    });
    editorInstance.on("blur", () => {
      syncEditorModeInfo();
    });
    editorInstance.on("caretChange", () => {
      syncEditorModeInfo();
      scheduleCommentLayout();
    });
  }

  editorRoot.addEventListener("click", () => {
    syncEditorModeInfo();
    scheduleCommentLayout();
  });
  editorRoot.addEventListener("keyup", () => {
    syncEditorModeInfo();
    scheduleCommentLayout();
  });
  editorRoot.addEventListener("mouseup", () => {
    syncEditorModeInfo();
    scheduleCommentLayout();
  });
  syncEditorModeInfo();
  attachEditorScrollSync();
  return editorInstance;
}

function getMarkdownContent() {
  return ensureEditor().getMarkdown();
}

function syncEditorModeInfo() {
  if (!editorInstance) return;
  editorModeInfo.textContent = editorInstance.isMarkdownMode() ? "Markdown 模式" : "WYSIWYG";
}

function applyLoadedMarkdown(content, options = {}) {
  const { resetRevisionBaseline = true } = options;
  ensureEditor();
  state.suppressEditorEvents = true;
  const nextContent = content || "";
  editorInstance.setMarkdown(nextContent, false);
  window.requestAnimationFrame(() => {
    editorInstance.setMarkdown(nextContent, false);
    state.suppressEditorEvents = false;
    state.loadedContent = nextContent;
    if (resetRevisionBaseline) {
      setRevisionBaseline(nextContent);
    }
    state.remoteContentSnapshot = null;
    state.markdownDirty = false;
    state.markdownConflict = false;
    syncEditorModeInfo();
    updateMarkdownState();
    attachEditorScrollSync();
    scheduleRevisionRender();
    scheduleCommentLayout();
  });
}

function syncMarkdownDirtyState() {
  state.markdownDirty = getMarkdownContent() !== state.loadedContent;
  if (!state.markdownDirty) {
    state.markdownConflict = false;
    state.remoteContentSnapshot = null;
  }
  updateMarkdownState();
}

function getCurrentSelectionMarkdownRange() {
  ensureEditor();
  const selection = editorInstance.getSelection();
  if (!selection) return null;
  if (editorInstance.isMarkdownMode()) return normalizeMdRange(selection);
  return toastMdRangeToInternal(
    editorInstance.convertPosToMatchEditorMode(selection[0], selection[1], "markdown")
  );
}

function getCurrentNodeMarkdownRange() {
  ensureEditor();
  const rangeInfo = editorInstance.getRangeInfoOfNode?.();
  if (!rangeInfo?.range) return null;
  if (editorInstance.isMarkdownMode()) return normalizeMdRange(rangeInfo.range);
  return toastMdRangeToInternal(
    editorInstance.convertPosToMatchEditorMode(rangeInfo.range[0], rangeInfo.range[1], "markdown")
  );
}

function buildLineAnchorFromPos(mdPos, markdown) {
  const lines = getLines(markdown);
  const lineIndex = clamp(mdPos[0], 0, Math.max(lines.length - 1, 0));
  return buildAnchorFromMdRange(
    [lineIndex, 0],
    [lineIndex, lines[lineIndex]?.length || 0],
    markdown,
    "line"
  );
}

function buildCurrentAnchorFromEditor() {
  const markdown = getMarkdownContent();
  let selectionRange = getCurrentSelectionMarkdownRange();
  if (!selectionRange) return null;

  let anchor = buildAnchorFromMdRange(selectionRange[0], selectionRange[1], markdown, "selection");
  const selectedText = editorInstance.getSelectedText?.();
  if (selectedText) {
    anchor.selectedText = selectedText;
  }
  if (!selectedText && anchor.start === anchor.end) {
    const nodeRange = getCurrentNodeMarkdownRange();
    if (nodeRange) {
      anchor = buildAnchorFromMdRange(nodeRange[0], nodeRange[1], markdown, "block");
    } else {
      anchor = buildLineAnchorFromPos(selectionRange[0], markdown);
    }
  }
  return anchor;
}

function focusAnchor(anchor) {
  ensureEditor();
  if (state.viewMode !== "edit") {
    setViewMode("edit");
  }
  state.activeCommentId = null;
  try {
    if (editorInstance.isMarkdownMode()) {
      const [toastStart, toastEnd] = internalMdRangeToToast(anchor.mdStart, anchor.mdEnd);
      editorInstance.setSelection(toastStart, toastEnd);
    } else {
      const [toastStart, toastEnd] = internalMdRangeToToast(anchor.mdStart, anchor.mdEnd);
      const converted = normalizeWysiwygRange(
        editorInstance.convertPosToMatchEditorMode(toastStart, toastEnd, "wysiwyg")
      );
      editorInstance.setSelection(converted[0], converted[1]);
    }
  } catch {
    editorInstance.changeMode("markdown", true);
    const [toastStart, toastEnd] = internalMdRangeToToast(anchor.mdStart, anchor.mdEnd);
    editorInstance.setSelection(toastStart, toastEnd);
  }
  editorInstance.focus();
  syncEditorModeInfo();
  scheduleCommentLayout();
}

function focusComment(commentId) {
  const thread = state.comments.find((item) => item.id === commentId);
  if (!thread) return;
  state.activeCommentId = commentId;
  focusAnchor(thread.anchor);
  setStatus(`已定位到 ${formatLineRange(thread.anchor)}。`);
  renderComments();
}

function openCommentDialog(anchor) {
  state.pendingAnchor = anchor;
  dialogTitle.textContent = anchor.mode === "selection" ? "添加选区批注" : "添加块级批注";
  dialogQuote.textContent = previewQuote(anchor);
  commentAuthor.value = DEFAULT_USER_AUTHOR;
  commentBody.value = "";
  commentDialog.showModal();
  window.setTimeout(() => commentBody.focus(), 0);
}

async function submitComment() {
  if (!state.pendingAnchor) return;
  const body = commentBody.value.trim();
  if (!body) {
    setStatus("批注内容不能为空。", true);
    return;
  }

  const message = createMessage(commentAuthor.value, body);
  const thread = ensureAssistantMeta({
    id: `t-${crypto.randomUUID()}`,
    status: "open",
    anchor: state.pendingAnchor,
    messages: [message],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    assistantRequest: null,
  });

  state.comments.push(thread);
  state.activeCommentId = thread.id;
  renderComments();
  await persistComments("批注线程已自动保存。");
  state.pendingAnchor = null;
}

function openReplyDialog(threadId) {
  const thread = state.comments.find((item) => item.id === threadId);
  if (!thread) return;
  state.pendingReplyThreadId = threadId;
  state.pendingEditMessageId = null;
  state.dialogMode = "reply";
  replyDialogTitle.textContent = thread.status === "resolved" ? "追加回复并重新讨论" : "回复线程";
  replyDialogQuote.textContent = previewQuote(thread.anchor);
  replyAuthor.value = DEFAULT_USER_AUTHOR;
  replyBody.value = "";
  replyDialog.showModal();
  window.setTimeout(() => replyBody.focus(), 0);
}

function openEditDialog(threadId, messageId) {
  const thread = state.comments.find((item) => item.id === threadId);
  const message = thread?.messages.find((item) => item.id === messageId);
  if (!thread || !message) return;
  state.pendingReplyThreadId = threadId;
  state.pendingEditMessageId = messageId;
  state.dialogMode = "edit";
  replyDialogTitle.textContent = "编辑消息";
  replyDialogQuote.textContent = previewQuote(thread.anchor);
  replyAuthor.value = message.author;
  replyBody.value = message.body;
  replyDialog.showModal();
  window.setTimeout(() => replyBody.focus(), 0);
}

function openContextDialog() {
  contextDialogHint.textContent = state.contextPath
    ? `当前会保存到 ${state.contextPath}，供“呼唤智能体”时作为文档级背景摘要。`
    : "这份摘要会保存到同名 .context.md，并在“呼唤智能体”回复单条批注时一并注入。";
  contextBody.value = getContextDraft();
  contextDialog.showModal();
  window.setTimeout(() => contextBody.focus(), 0);
}

async function saveContext() {
  try {
    setStatus("正在保存上下文摘要...");
    const data = await apiPost("/api/context", {
      path: filePathInput.value.trim(),
      content: contextBody.value,
    });
    setContextState(data.context || null);
    setStatus("上下文摘要已保存。后续呼唤智能体会自动带上这份背景。");
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function submitReplyOrEdit() {
  const thread = state.comments.find((item) => item.id === state.pendingReplyThreadId);
  if (!thread) return;

  const body = replyBody.value.trim();
  if (!body) {
    setStatus(state.dialogMode === "edit" ? "消息内容不能为空。" : "回复内容不能为空。", true);
    return;
  }

  const author = replyAuthor.value.trim() || "未署名";
  if (state.dialogMode === "edit") {
    const message = thread.messages.find((item) => item.id === state.pendingEditMessageId);
    if (!message) return;
    message.author = author;
    message.role = normalizeRole(author, message.role);
    message.body = body;
    message.updatedAt = new Date().toISOString();
    thread.updatedAt = message.updatedAt;
    renderComments();
    await persistComments("消息修改已自动保存。");
    return;
  }

  const message = createMessage(author, body);
  thread.messages.push(message);
  thread.updatedAt = message.updatedAt;
  if (thread.status === "resolved") thread.status = "open";
  if (message.role === "assistant") {
    thread.assistantRequest.respondedAt = message.updatedAt;
    thread.assistantRequest.requested = false;
  }
  state.activeCommentId = thread.id;
  renderComments();
  await persistComments("线程回复已自动保存。");
}

async function toggleThreadStatus(threadId) {
  const thread = state.comments.find((item) => item.id === threadId);
  if (!thread) return;
  const nextStatus = thread.status === "resolved" ? "open" : "resolved";
  thread.status = nextStatus;
  if (nextStatus === "resolved") {
    thread.assistantRequest.requested = false;
    thread.assistantRequest.requestedAt = null;
    thread.assistantRequest.mode = null;
    thread.assistantRequest.note = null;
    if (state.activeCommentId === thread.id && !state.showResolvedThreads) {
      state.activeCommentId = null;
    }
  }
  thread.updatedAt = new Date().toISOString();
  renderComments();
  await persistComments(
    thread.status === "resolved"
      ? (state.showResolvedThreads ? "线程已标记为已解决并自动保存。" : "线程已标记为已解决并自动隐藏。")
      : "线程已重新打开并自动保存。"
  );
}

async function requestAssistantForThread(threadId, mode = "single") {
  const thread = state.comments.find((item) => item.id === threadId);
  if (!thread) return;
  if (mode !== "single") {
    ensureAssistantMeta(thread).assistantRequest = {
      requested: true,
      requestedAt: new Date().toISOString(),
      mode,
      note: "用户批量请求处理未解决线程",
      respondedAt: null,
    };
    renderComments();
    await persistComments("线程已标记为待处理。");
    return;
  }

  if (state.markdownDirty) {
    await saveMarkdown();
    if (state.markdownDirty) {
      setStatus("正文保存失败，已取消本次智能体调用。", true);
      return;
    }
  }

  pendingAssistantRequests.add(threadId);
  ensureAssistantMeta(thread).assistantRequest = {
    requested: true,
    requestedAt: new Date().toISOString(),
    mode,
    note: "正在通过 Review App 呼唤单线程智能体。",
    respondedAt: null,
  };
  renderComments();
  setStatus("正在呼唤智能体处理当前线程...");
  try {
    const data = await apiPost("/api/assistant-reply", {
      path: filePathInput.value.trim(),
      threadId,
    });
    if (data.contentChanged && typeof data.content === "string") {
      applyLoadedMarkdown(data.content, { resetRevisionBaseline: false });
    }
    setComments(data.comments.comments || [], data.comments.updatedAt || data.savedAt || null, getMarkdownContent());
    state.activeCommentId = threadId;
    renderComments();
    setStatus(
      data.contentChanged
        ? "智能体已回复当前线程，并已直接修改正文后写回批注。"
        : "智能体已回复当前线程，并已自动写回批注。"
    );
  } catch (error) {
    await refreshCommentsFromServer();
    setStatus(error.message, true);
  } finally {
    pendingAssistantRequests.delete(threadId);
    renderComments();
  }
}

async function requestAllUnresolved() {
  const targets = state.comments.filter((thread) => thread.status !== "resolved");
  if (!targets.length) {
    setStatus("没有可请求的未解决线程。", true);
    return;
  }
  for (const thread of targets) {
    ensureAssistantMeta(thread).assistantRequest = {
      requested: true,
      requestedAt: new Date().toISOString(),
      mode: "batch",
      note: "用户批量请求处理未解决线程",
      respondedAt: null,
    };
  }
  renderComments();
  await persistComments(`已批量标记 ${targets.length} 个未解决线程为待处理。需要我在对话中读取后才会回复。`);
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    setStatus("当前浏览器不支持桌面提醒。", true);
    return;
  }
  const result = await Notification.requestPermission();
  state.notificationsEnabled = result === "granted";
  notifyBtn.textContent = state.notificationsEnabled ? "提醒已开启" : "开启提醒";
  setStatus(state.notificationsEnabled ? "桌面提醒已开启。" : "桌面提醒未授权。", !state.notificationsEnabled);
}

function maybeNotifyAboutAssistantReplies(previousComments, nextComments) {
  const previousIds = new Set(previousComments.flatMap((thread) => thread.messages.map((message) => message.id)));
  const newAssistantMessages = nextComments
    .flatMap((thread) => thread.messages.map((message) => ({ thread, message })))
    .filter(({ message }) => message.role === "assistant" && !previousIds.has(message.id));

  if (!newAssistantMessages.length) return;
  if (state.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
    const latest = newAssistantMessages.at(-1);
    const snippet = latest.message.body.slice(0, 80);
    new Notification("批注线程有新回复", {
      body: `${formatLineRange(latest.thread.anchor)} · ${snippet}`,
      tag: latest.thread.id,
    });
  }
}

async function apiGet(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error((await response.json()).error || `Request failed: ${response.status}`);
  return response.json();
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

async function persistComments(successMessage = "批注线程已保存。") {
  try {
    state.isSavingComments = true;
    setStatus("正在自动保存批注...");
    const data = await apiPost("/api/comments", {
      path: filePathInput.value.trim(),
      comments: state.comments,
    });
    state.commentsUpdatedAt = data.savedAt;
    state.lastLoadedCommentsSignature = commentsSignature(state.comments);
    setStatus(successMessage);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.isSavingComments = false;
  }
}

async function loadFile() {
  try {
    ensureEditor();
    if (editorReadyPromise) await editorReadyPromise;
    setStatus("正在加载...");
    const path = filePathInput.value.trim() || getPathFromUrl() || "workflow_review.md";
    const data = await apiGet(`/api/file?path=${encodeURIComponent(path)}`);
    state.path = data.path;
    state.absolutePath = data.absolutePath;
    applyLoadedMarkdown(data.content);
    setComments(data.comments.comments || [], data.comments.updatedAt || null, data.content);
    setContextState(data.context || null);
    setReviewState(data.reviewState || null);
    state.activeCommentId = null;
    filePathInput.value = data.path;
    fileInfo.textContent = data.path;
    syncUrlWithPath(data.path);
    renderComments();
    if (pendingStartupViewMode) {
      setViewMode(pendingStartupViewMode);
      pendingStartupViewMode = null;
    }
    scheduleRevisionRender();
    if (pendingStartupPdfExport) {
      const options = pendingStartupPdfExport;
      pendingStartupPdfExport = null;
      await waitForAnimationFrames(2);
      await preparePdfExport(options.includeComments);
      if (options.autoPrint) {
        window.print();
      }
    }
    setStatus(`已加载 ${data.path}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function refreshCommentsFromServer() {
  if (!editorInstance || state.isSavingComments || commentDialog.open || replyDialog.open || pendingAssistantRequests.size) return;
  try {
    const path = filePathInput.value.trim() || "workflow_review.md";
    const data = await apiGet(`/api/file?path=${encodeURIComponent(path)}`);
    const currentMarkdown = getMarkdownContent();
    const previousComments = state.comments.map((thread) => JSON.parse(JSON.stringify(thread)));
    const remoteComments = (data.comments.comments || []).map((item) => normalizeThread(item, data.content));
    const remoteSignature = commentsSignature(remoteComments);
    const remoteReviewState = data.reviewState || null;
    const reviewStateChanged = JSON.stringify(remoteReviewState) !== JSON.stringify(state.reviewState);
    const remoteContext = data.context || null;
    const contextChanged = JSON.stringify(remoteContext || {}) !== JSON.stringify({
      content: state.contextContent,
      relativePath: state.contextPath,
      updatedAt: state.contextUpdatedAt,
    });
    const remoteContent = data.content;
    const remoteContentChanged = remoteContent !== state.loadedContent;

    if (remoteContentChanged) {
      if (!state.markdownDirty) {
        applyLoadedMarkdown(remoteContent);
        setStatus("检测到正文更新，页面已自动同步。");
      } else if (remoteContent === currentMarkdown) {
        state.loadedContent = remoteContent;
        state.remoteContentSnapshot = null;
        state.markdownDirty = false;
        state.markdownConflict = false;
        updateMarkdownState();
      } else {
        state.remoteContentSnapshot = remoteContent;
        state.markdownConflict = true;
        updateMarkdownState();
        setStatus("检测到正文在外部被修改。当前编辑器保留你的本地内容，可点击“加载远端正文”查看最新版本。", true);
      }
    }

    if (remoteSignature !== state.lastLoadedCommentsSignature || reviewStateChanged) {
      maybeNotifyAboutAssistantReplies(previousComments, remoteComments);
      state.comments = remoteComments;
      state.commentsUpdatedAt = data.comments.updatedAt || null;
      state.lastLoadedCommentsSignature = remoteSignature;
      setReviewState(remoteReviewState);
      renderComments();
      if (!remoteContentChanged) {
        setStatus("检测到批注更新，页面已自动同步。");
      }
    }

    if (contextChanged && !contextDialog.open) {
      setContextState(remoteContext);
      if (!remoteContentChanged && remoteSignature === state.lastLoadedCommentsSignature && !reviewStateChanged) {
        setStatus("检测到上下文摘要更新，页面已自动同步。");
      }
    }
  } catch {
  }
}

const autosaveStatus = debounce(() => {
  setStatus("内容已变更，尚未保存 Markdown。批注会自动保存。");
}, 180);

async function saveMarkdown() {
  try {
    ensureEditor();
    setStatus("正在保存 Markdown...");
    const content = getMarkdownContent();
    const data = await apiPost("/api/file", {
      path: filePathInput.value.trim(),
      content,
    });
    state.loadedContent = content;
    setRevisionBaseline(content);
    state.remoteContentSnapshot = null;
    state.markdownDirty = false;
    state.markdownConflict = false;
    fileInfo.textContent = data.path;
    syncUrlWithPath(data.path);
    updateMarkdownState();
    setStatus(`Markdown 已保存 ${data.path}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function saveComments() {
  await persistComments("批注线程已手动保存。");
}

function reloadRemoteMarkdown() {
  if (!state.remoteContentSnapshot) {
    setStatus("当前没有可加载的远端正文。");
    return;
  }
  const shouldReplace = state.markdownDirty
    ? window.confirm("加载远端正文会覆盖当前页面里未保存的本地修改。确认继续吗？")
    : true;
  if (!shouldReplace) return;
  applyLoadedMarkdown(state.remoteContentSnapshot);
  setStatus("已加载最新远端正文。");
}

async function completeReviewAndClose() {
  const hasPending = state.comments.some((thread) => isThreadPending(thread));
  const confirmed = window.confirm(
    hasPending
      ? "仍有待处理线程。确认要标记为“已通过”并关闭服务吗？"
      : "确认要标记为“已通过”并关闭服务吗？"
  );
  if (!confirmed) return;

  try {
    await saveMarkdown();
    await persistComments("批注线程已保存。");
    const counts = getThreadCounts();
    const closedAt = new Date().toISOString();
    const note = "用户在网页端点击“确认通过并关闭”。";
    const data = await apiPost("/api/review-complete", {
      path: filePathInput.value.trim(),
      closedAt,
      closedBy: DEFAULT_USER_AUTHOR,
      note,
      threadCounts: counts,
    });
    setReviewState({
      status: "approved",
      closedAt,
      closedBy: DEFAULT_USER_AUTHOR,
      updatedAt: data.savedAt,
      note,
      threadCounts: counts,
    });
    approveCloseBtn.disabled = true;
    setStatus("已记录最终通过状态并关闭服务。这个状态会保存在 .review.json 文件里。");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function handleAddComment() {
  try {
    const anchor = buildCurrentAnchorFromEditor();
    if (!anchor) {
      setStatus("当前没有可批注的位置。", true);
      return;
    }
    openCommentDialog(anchor);
  } catch (error) {
    setStatus(error.message, true);
  }
}

commentDialog.addEventListener("close", async () => {
  if (commentDialog.returnValue === "confirm") await submitComment();
  state.pendingAnchor = null;
});

replyDialog.addEventListener("close", async () => {
  if (replyDialog.returnValue === "confirm") await submitReplyOrEdit();
  state.pendingReplyThreadId = null;
  state.pendingEditMessageId = null;
  state.dialogMode = "reply";
});

contextDialog.addEventListener("close", async () => {
  if (contextDialog.returnValue === "confirm") await saveContext();
});

loadBtn.addEventListener("click", loadFile);
saveMdBtn.addEventListener("click", saveMarkdown);
addCommentBtn.addEventListener("click", handleAddComment);
reloadRemoteBtn.addEventListener("click", reloadRemoteMarkdown);
saveCommentsBtn.addEventListener("click", saveComments);
editContextBtn.addEventListener("click", openContextDialog);
exportPdfBtn.addEventListener("click", () => { exportPdf(false); });
exportPdfWithCommentsBtn.addEventListener("click", () => { exportPdf(true); });
approveCloseBtn.addEventListener("click", completeReviewAndClose);
modeEditBtn.addEventListener("click", () => {
  setViewMode("edit");
  setStatus("已切到干净模式。");
});
modeRevisionBtn.addEventListener("click", () => {
  setViewMode("revision");
  setStatus("已切到编辑审阅模式。修订痕迹会叠在当前编辑区上。");
});
resetRevisionBtn.addEventListener("click", () => {
  setRevisionBaseline(getMarkdownContent());
  setStatus("已把当前正文设为修订基线。后续改动会从这一版继续记录。");
});
requestAllBtn.addEventListener("click", requestAllUnresolved);
copyPendingBtn.addEventListener("click", copyPendingThreads);
notifyBtn.addEventListener("click", enableNotifications);
filterAllBtn.addEventListener("click", () => { state.threadFilter = "all"; renderComments(); });
filterPendingBtn.addEventListener("click", () => { state.threadFilter = "pending"; renderComments(); });
filterOpenBtn.addEventListener("click", () => { state.threadFilter = "open"; renderComments(); });
showResolvedBtn.addEventListener("click", () => {
  state.showResolvedThreads = true;
  state.threadFilter = "all";
  renderComments();
  setStatus("已展开所有标注，包含已解决线程。");
});
hideResolvedBtn.addEventListener("click", () => {
  state.showResolvedThreads = false;
  state.threadFilter = "all";
  renderComments();
  setStatus("已隐藏所有已解决批注。");
});

const initialPath = getPathFromUrl();
if (initialPath) {
  filePathInput.value = initialPath;
}
pendingStartupViewMode = getStartupViewModeFromUrl();
pendingStartupPdfExport = getStartupPdfExportOptionsFromUrl();
updateContextState();

try {
  ensureEditor();
  setViewMode(pendingStartupViewMode || "edit");
  loadFile();
  refreshTimer = window.setInterval(refreshCommentsFromServer, 2000);
} catch (error) {
  showEditorBootError(error);
  console.error(error);
}

window.addEventListener("resize", scheduleCommentLayout);
window.addEventListener("afterprint", cleanupPdfExport);
window.__reviewAppExports = {
  preparePdfExport,
  cleanupPdfExport,
};
