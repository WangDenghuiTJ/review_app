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
  floatingCommentId: null,
  expandedCommentId: null,
  pendingAnchor: null,
  pendingReplyThreadId: null,
  pendingEditMessageId: null,
  dialogMode: "reply",
  commentsUpdatedAt: null,
  isSavingComments: false,
  lastLoadedCommentsSignature: "",
  notificationsEnabled: false,
  showResolvedThreads: false,
  reviewState: null,
  suppressEditorEvents: false,
  viewMode: "edit",
  surfaceMode: "document",
  revisionBaseline: "",
  outline: [],
  activeHeadingId: null,
  resources: [],
  assetDir: "",
  selectedImagePath: null,
  pendingImageAnchor: null,
  pendingFormulaAnchor: null,
  editingFormulaRange: null,
  isInsertingImage: false,
  imageDeleteUndoStack: [],
  pendingKeyboardImageDeletionCheck: 0,
  isReconcilingKeyboardImageDeletion: false,
  isSavingMarkdown: false,
  pendingAutosaveTimer: 0,
  hasQueuedAutosave: false,
  suppressCommentLayoutUntil: 0,
  isComposing: false,
  localEditLockUntil: 0,
  layout: {
    outlineWidth: 260,
    outlinePaneSize: 58,
    commentWidth: 360,
    outlineCollapsed: false,
  },
};

const filePathInput = document.getElementById("filePath");
const loadBtn = document.getElementById("loadBtn");
const openMenu = document.getElementById("openMenu");
const recentFilesList = document.getElementById("recentFilesList");
const browseFilesBtn = document.getElementById("browseFilesBtn");
const clearRecentFilesBtn = document.getElementById("clearRecentFilesBtn");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const surfaceDocumentBtn = document.getElementById("surfaceDocumentBtn");
const surfaceMarkdownBtn = document.getElementById("surfaceMarkdownBtn");
const fontDecreaseBtn = document.getElementById("fontDecreaseBtn");
const fontIncreaseBtn = document.getElementById("fontIncreaseBtn");
const fontScaleLabel = document.getElementById("fontScaleLabel");
const saveMenuBtn = document.getElementById("saveMenuBtn");
const saveMenu = document.getElementById("saveMenu");
const moreMenuBtn = document.getElementById("moreMenuBtn");
const moreMenu = document.getElementById("moreMenu");
const saveMdBtn = document.getElementById("saveMdBtn");
const insertImageBtn = document.getElementById("insertImageBtn");
const insertFormulaBtn = document.getElementById("insertFormulaBtn");
const addCommentBtn = document.getElementById("addCommentBtn");
const reloadRemoteBtn = document.getElementById("reloadRemoteBtn");
const editContextBtn = document.getElementById("editContextBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportPdfWithCommentsBtn = document.getElementById("exportPdfWithCommentsBtn");
const exportReflowBtn = document.getElementById("exportReflowBtn");
const approveCloseBtn = document.getElementById("approveCloseBtn");
const requestAllBtn = document.getElementById("requestAllBtn");
const copyPendingBtn = document.getElementById("copyPendingBtn");
const notifyBtn = document.getElementById("notifyBtn");
const statusText = document.getElementById("statusText");
const statusMessageText = document.getElementById("statusMessageText");
const fileInfo = document.getElementById("fileInfo");
const editorModeInfo = document.getElementById("editorModeInfo");
const markdownStateInfo = document.getElementById("markdownStateInfo");
const commentCount = document.getElementById("commentCount");
const contextStateInfo = document.getElementById("contextStateInfo");
const reviewStateInfo = document.getElementById("reviewStateInfo");
const editorRoot = document.getElementById("editorRoot");
const modeEditBtn = document.getElementById("modeEditBtn");
const modeRevisionBtn = document.getElementById("modeRevisionBtn");
const previewPanel = document.getElementById("previewPanel");
const previewScroll = document.getElementById("previewScroll");
const revisionPreviewRoot = document.getElementById("revisionPreviewRoot");
const acceptRevisionsBtn = document.getElementById("acceptRevisionsBtn");
const outlineList = document.getElementById("outlineList");
const resourceList = document.getElementById("resourceList");
const cleanupAssetsBtn = document.getElementById("cleanupAssetsBtn");
const reviewStage = document.querySelector(".review-stage");
const outlineResizeHandle = document.getElementById("outlineResizeHandle");
const outlineSectionResizeHandle = document.getElementById("outlineSectionResizeHandle");
const commentResizeHandle = document.getElementById("commentResizeHandle");
const commentList = document.getElementById("commentList");
const commentConnectorLayer = document.getElementById("commentConnectorLayer");
const floatingCommentOverlay = document.getElementById("floatingCommentOverlay");
const floatingCommentCardHost = document.getElementById("floatingCommentCardHost");
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
const fileBrowserDialog = document.getElementById("fileBrowserDialog");
const fileBrowserSearch = document.getElementById("fileBrowserSearch");
const fileBrowserList = document.getElementById("fileBrowserList");
const imageUploadInput = document.getElementById("imageUploadInput");
const printExportRoot = document.getElementById("printExportRoot");
const editorContextMenu = document.getElementById("editorContextMenu");
const contextInsertImageBtn = document.getElementById("contextInsertImageBtn");
const contextInsertFormulaBtn = document.getElementById("contextInsertFormulaBtn");
const contextAddCommentBtn = document.getElementById("contextAddCommentBtn");
const formulaDialog = document.getElementById("formulaDialog");
const formulaDialogTitle = document.getElementById("formulaDialogTitle");
const formulaDialogHint = document.getElementById("formulaDialogHint");
const formulaBody = document.getElementById("formulaBody");
const confirmFormulaBtn = document.getElementById("confirmFormulaBtn");

const DEFAULT_USER_AUTHOR = "用户";
const LAYOUT_STORAGE_KEY = "review-app-layout-v2";
const FONT_SCALE_STORAGE_KEY = "review-app-font-scale-v1";
const VIEW_MODE_STORAGE_KEY = "review-app-view-mode-v1";
const RECENT_FILES_STORAGE_KEY = "review-app-recent-files-v1";
const MARKDOWN_AUTOSAVE_DELAY = 700;
const MAX_RECENT_FILES = 12;
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
let pendingCommentScrollSettleTimer = 0;
let pendingRevisionRender = 0;
let pendingRenderedContentRefresh = 0;
let pendingMathRender = 0;
let pendingStickyLayoutRefresh = 0;
let revisionPmState = null;
let revisionPmView = null;
let revisionPluginKey = null;
let lastRevisionDecorationSignature = "";
let applyingRevisionDecorations = false;
let revisionPluginAvailable = true;
let editorDomObserver = null;
let topbarResizeObserver = null;
let viewModeResizeObserver = null;
let mathOverlayLayer = null;
const pendingAssistantRequests = new Set();
const handleEditorViewportChange = () => {
  updateCommentTrackViewportOffset();
  clearCommentAnchorsAndConnectors();
  scheduleMathRender();
  if (pendingCommentScrollSettleTimer) {
    window.clearTimeout(pendingCommentScrollSettleTimer);
  }
  pendingCommentScrollSettleTimer = window.setTimeout(() => {
    pendingCommentScrollSettleTimer = 0;
    scheduleCommentLayout();
  }, 120);
  syncActiveHeadingFromViewport();
};

const REVISION_META_KEY = "review-revision-decorations";
const REVISION_DEBUG_ENABLED = false;
const REVISION_DEBUG_PREFIX = "[review-revision]";
let pendingStartupViewMode = null;
let pendingStartupPdfExport = null;
let pendingPrintCleanup = 0;
let suppressNextPastedImage = false;
let currentFontScale = 1;
let toolbarEnhancementsAttached = false;
let pendingInlineCommentSave = 0;
let pendingCapturedCommentAnchor = null;
let latestSelectionAnchor = null;
let workspaceFileList = [];
let commentMessageScrollState = new Map();

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
  if (mode === "revision" || mode === "edit") return mode;
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === "revision" || stored === "edit" ? stored : null;
  } catch {
    return null;
  }
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
  if (statusMessageText) {
    statusMessageText.textContent = message;
  } else {
    statusText.textContent = message;
  }
  statusText.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function clearMarkdownAutosaveTimer() {
  if (!state.pendingAutosaveTimer) return;
  window.clearTimeout(state.pendingAutosaveTimer);
  state.pendingAutosaveTimer = 0;
}

function clearInlineCommentSaveTimer() {
  if (!pendingInlineCommentSave) return;
  window.clearTimeout(pendingInlineCommentSave);
  pendingInlineCommentSave = 0;
}

function scheduleInlineCommentSave(successMessage = "批注修改已自动保存。") {
  clearInlineCommentSaveTimer();
  pendingInlineCommentSave = window.setTimeout(async () => {
    pendingInlineCommentSave = 0;
    await persistComments(successMessage);
  }, 450);
}

function loadFontScale() {
  try {
    return clamp(Number(localStorage.getItem(FONT_SCALE_STORAGE_KEY) || 1), 0.85, 1.4);
  } catch {
    return 1;
  }
}

function updateFontScaleButtons() {
  const percentage = Math.round(currentFontScale * 100);
  if (fontScaleLabel) fontScaleLabel.textContent = `${percentage}%`;
  if (fontDecreaseBtn) fontDecreaseBtn.disabled = currentFontScale <= 0.85;
  if (fontIncreaseBtn) fontIncreaseBtn.disabled = currentFontScale >= 1.4;
}

function applyFontScale(scale, options = {}) {
  currentFontScale = clamp(Number(scale || 1), 0.85, 1.4);
  document.documentElement.style.setProperty("--ui-scale", String(currentFontScale));
  document.documentElement.style.setProperty("--content-font-scale", String(currentFontScale));
  updateFontScaleButtons();
  if (!options.skipPersist) {
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(currentFontScale));
  }
  scheduleCommentLayout();
  scheduleRenderedContentRefresh();
}

function getLayoutStorageKey(path = state.path) {
  return `${LAYOUT_STORAGE_KEY}:${normalizeRelativePath(path) || "workflow_review.md"}`;
}

function loadSavedLayout(path = state.path) {
  const fallback = { outlineWidth: 260, outlinePaneSize: 58, commentWidth: 360, outlineCollapsed: false };
  try {
    const raw = localStorage.getItem(getLayoutStorageKey(path)) || localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      outlineWidth: clamp(Number(parsed.outlineWidth || fallback.outlineWidth), 220, 460),
      outlinePaneSize: clamp(Number(parsed.outlinePaneSize || fallback.outlinePaneSize), 30, 70),
      commentWidth: clamp(Number(parsed.commentWidth || fallback.commentWidth), 300, 520),
      outlineCollapsed: Boolean(parsed.outlineCollapsed),
    };
  } catch {
    return fallback;
  }
}

function persistLayout() {
  const payload = {
    outlineWidth: state.layout.outlineWidth,
    outlinePaneSize: state.layout.outlinePaneSize,
    commentWidth: state.layout.commentWidth,
    outlineCollapsed: state.layout.outlineCollapsed,
  };
  localStorage.setItem(getLayoutStorageKey(), JSON.stringify(payload));
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
}

function applyLayout() {
  document.documentElement.style.setProperty("--outline-width", `${state.layout.outlineWidth}px`);
  document.documentElement.style.setProperty("--outline-pane-size", `${state.layout.outlinePaneSize}%`);
  document.documentElement.style.setProperty("--comment-width", `${state.layout.commentWidth}px`);
  reviewStage?.classList.toggle("is-outline-collapsed", Boolean(state.layout.outlineCollapsed));
  if (toggleSidebarBtn) {
    const expanded = !state.layout.outlineCollapsed;
    toggleSidebarBtn.setAttribute("aria-pressed", expanded ? "true" : "false");
    toggleSidebarBtn.textContent = expanded ? "隐藏侧栏" : "显示侧栏";
  }
}

function setToolbarMenuExpanded(button, expanded) {
  if (!button) return;
  button.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function hideToolbarMenus() {
  if (openMenu) openMenu.hidden = true;
  if (saveMenu) saveMenu.hidden = true;
  if (moreMenu) moreMenu.hidden = true;
  setToolbarMenuExpanded(loadBtn, false);
  setToolbarMenuExpanded(saveMenuBtn, false);
  setToolbarMenuExpanded(moreMenuBtn, false);
}

function toggleToolbarMenu(menuName) {
  if (menuName === "open") {
    if (!openMenu || !loadBtn) return;
    const nextHidden = !openMenu.hidden;
    if (saveMenu) saveMenu.hidden = true;
    if (moreMenu) moreMenu.hidden = true;
    setToolbarMenuExpanded(saveMenuBtn, false);
    setToolbarMenuExpanded(moreMenuBtn, false);
    if (nextHidden) renderRecentFilesMenu();
    openMenu.hidden = nextHidden;
    setToolbarMenuExpanded(loadBtn, !nextHidden);
    return;
  }
  const isSaveMenu = menuName === "save";
  const menu = isSaveMenu ? saveMenu : moreMenu;
  const button = isSaveMenu ? saveMenuBtn : moreMenuBtn;
  const otherMenu = isSaveMenu ? moreMenu : saveMenu;
  const otherButton = isSaveMenu ? moreMenuBtn : saveMenuBtn;
  if (!menu || !button) return;
  const nextHidden = !menu.hidden;
  if (openMenu) openMenu.hidden = true;
  setToolbarMenuExpanded(loadBtn, false);
  if (otherMenu) otherMenu.hidden = true;
  setToolbarMenuExpanded(otherButton, false);
  menu.hidden = nextHidden;
  setToolbarMenuExpanded(button, !nextHidden);
}

function basename(path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts.at(-1) || normalized || "未命名文件";
}

function loadRecentFiles() {
  try {
    const raw = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeRelativePath(String(item || "")))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function persistRecentFiles(paths) {
  localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(paths.slice(0, MAX_RECENT_FILES)));
}

function pushRecentFile(path) {
  const normalized = normalizeRelativePath(path);
  if (!normalized) return;
  const next = [normalized, ...loadRecentFiles().filter((item) => item !== normalized)].slice(0, MAX_RECENT_FILES);
  persistRecentFiles(next);
}

function clearRecentFiles() {
  localStorage.removeItem(RECENT_FILES_STORAGE_KEY);
  renderRecentFilesMenu();
}

function renderRecentFilesMenu() {
  if (!recentFilesList) return;
  const currentPath = normalizeRelativePath(state.path || filePathInput.value.trim());
  const recentFiles = loadRecentFiles();
  if (!recentFiles.length) {
    recentFilesList.innerHTML = `<div class="recent-file-empty">还没有最近文件记录。</div>`;
  } else {
    recentFilesList.innerHTML = "";
    for (const path of recentFiles) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = `recent-file-item${path === currentPath ? " is-current" : ""}`;
      item.setAttribute("role", "menuitem");
      item.innerHTML = `
        <span class="recent-file-name">${escapeHtml(basename(path))}</span>
        <span class="recent-file-path">${escapeHtml(path)}</span>
      `;
      item.addEventListener("click", async () => {
        filePathInput.value = path;
        hideToolbarMenus();
        await loadFile();
      });
      recentFilesList.appendChild(item);
    }
  }
  if (clearRecentFilesBtn) {
    clearRecentFilesBtn.disabled = recentFiles.length === 0;
  }
}

async function loadWorkspaceFileList() {
  const data = await apiGet("/api/list");
  workspaceFileList = Array.isArray(data.files)
    ? data.files.map((item) => normalizeRelativePath(String(item || ""))).filter(Boolean)
    : [];
  return workspaceFileList;
}

function renderFileBrowserList(filter = "") {
  if (!fileBrowserList) return;
  const currentPath = normalizeRelativePath(state.path || filePathInput.value.trim());
  const keyword = String(filter || "").trim().toLowerCase();
  const files = workspaceFileList.filter((path) => !keyword || path.toLowerCase().includes(keyword));
  if (!files.length) {
    fileBrowserList.innerHTML = `<div class="file-browser-empty">${keyword ? "没有匹配的文档。" : "当前工作区里还没有 Markdown 文档。"}</div>`;
    return;
  }

  fileBrowserList.innerHTML = "";
  for (const path of files) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `file-browser-item${path === currentPath ? " is-current" : ""}`;
    item.innerHTML = `
      <span class="recent-file-name">${escapeHtml(basename(path))}</span>
      <span class="recent-file-path">${escapeHtml(path)}</span>
    `;
    item.addEventListener("click", async () => {
      filePathInput.value = path;
      fileBrowserDialog?.close("selected");
      hideToolbarMenus();
      await loadFile();
    });
    fileBrowserList.appendChild(item);
  }
}

async function openFileBrowserDialog() {
  try {
    hideToolbarMenus();
    setStatus("正在读取工作区文档列表...");
    await loadWorkspaceFileList();
    renderFileBrowserList(fileBrowserSearch?.value || "");
    fileBrowserDialog?.showModal();
    if (fileBrowserSearch) {
      window.setTimeout(() => fileBrowserSearch.focus(), 0);
    }
    setStatus("请选择要打开的文档。");
  } catch (error) {
    setStatus(`读取文档列表失败：${error.message}`, true);
  }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getAssetAltText(fileName) {
  const clean = String(fileName || "图片").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return clean || "图片";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("读取图片失败。"));
    reader.readAsDataURL(file);
  });
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
    label = "正文同步中";
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

function updateStickyLayoutMetrics() {
  const topbarHeight = document.querySelector(".topbar")?.offsetHeight || 0;
  document.documentElement.style.setProperty("--topbar-height", `${topbarHeight}px`);
  document.documentElement.style.setProperty("--view-mode-height", "0px");
}

function scheduleStickyLayoutRefresh() {
  if (pendingStickyLayoutRefresh) return;
  pendingStickyLayoutRefresh = window.requestAnimationFrame(() => {
    pendingStickyLayoutRefresh = 0;
    updateStickyLayoutMetrics();
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

function normalizeRelativePath(path) {
  const cleaned = String(path || "").replaceAll("\\", "/");
  const segments = [];
  for (const segment of cleaned.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!segments.length) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

function getDocumentDir(path = state.path) {
  const normalized = normalizeRelativePath(path);
  if (!normalized || !normalized.includes("/")) return "";
  return normalized.slice(0, normalized.lastIndexOf("/"));
}

function resolveAssetPath(rawSrc, mdPath = state.path) {
  const source = String(rawSrc || "").trim();
  if (!source || /^(?:[a-z]+:|\/\/|#)/i.test(source)) return null;
  if (source.startsWith("data:") || source.startsWith("blob:")) return null;
  const baseDir = source.startsWith("/") ? "" : getDocumentDir(mdPath);
  const joined = source.startsWith("/")
    ? source.slice(1)
    : [baseDir, source].filter(Boolean).join("/");
  return normalizeRelativePath(joined);
}

function buildAssetUrl(rawSrc, mdPath = state.path) {
  const resolvedPath = resolveAssetPath(rawSrc, mdPath);
  return resolvedPath ? `/api/asset?path=${encodeURIComponent(resolvedPath)}` : null;
}

function getRelativeAssetReference(assetPath, mdPath = state.path) {
  const target = normalizeRelativePath(assetPath);
  const source = normalizeRelativePath(mdPath);
  if (!target || !source) return assetPath;
  const sourceSegments = source.split("/");
  sourceSegments.pop();
  const targetSegments = target.split("/");
  while (sourceSegments.length && targetSegments.length && sourceSegments[0] === targetSegments[0]) {
    sourceSegments.shift();
    targetSegments.shift();
  }
  return [...Array(sourceSegments.length).fill(".."), ...targetSegments].join("/") || ".";
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

function parseImageSyntax(text) {
  const match = String(text || "").trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
  if (!match) return null;
  return {
    alt: match[1] || "",
    rawPath: match[2] || "",
    assetPath: resolveAssetPath(match[2] || ""),
  };
}

function normalizeBlockDisplayText(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line
      .replace(/^\s{0,3}(#{1,6}\s+|>\s?|(\d+\.\s+)|([-*+]\s+))/, "")
      .trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMarkdownBlockDisplayMapping(block) {
  const raw = String(block?.rawText || "");
  const lines = raw.split("\n");
  const positionMap = [0];
  let displayText = "";
  let rawCursor = 0;

  const appendDisplayChar = (char, rawOffsetAfterChar) => {
    displayText += char;
    positionMap.push(rawOffsetAfterChar);
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const prefixMatch = line.match(/^\s{0,3}(#{1,6}\s+|>\s?|(\d+\.\s+)|([-*+]\s+))/);
    let contentStart = prefixMatch ? prefixMatch[0].length : 0;
    while (contentStart < line.length && /\s/.test(line[contentStart])) contentStart += 1;
    let contentEnd = line.length;
    while (contentEnd > contentStart && /\s/.test(line[contentEnd - 1])) contentEnd -= 1;
    let previousWasSpace = false;

    for (let index = contentStart; index < contentEnd; index += 1) {
      const char = line[index];
      if (/\s/.test(char)) {
        if (!previousWasSpace && displayText) {
          appendDisplayChar(" ", rawCursor + index + 1);
          previousWasSpace = true;
        }
      } else {
        appendDisplayChar(char, rawCursor + index + 1);
        previousWasSpace = false;
      }
    }

    rawCursor += line.length;
    if (lineIndex < lines.length - 1) {
      if (displayText && !displayText.endsWith(" ")) {
        appendDisplayChar(" ", rawCursor + 1);
      }
      rawCursor += 1;
    }
  }

  return {
    text: displayText.trim(),
    positionMap,
  };
}

function findBestTextMatchMeta(fullText, target, beforeHint = "", afterHint = "", preferredIndex = null) {
  const normalizedText = String(fullText || "");
  const normalizedTarget = String(target || "").trim();
  if (!normalizedText || !normalizedTarget) return null;
  const matchIndexes = [];
  let searchIndex = normalizedText.indexOf(normalizedTarget);
  while (searchIndex >= 0) {
    matchIndexes.push(searchIndex);
    searchIndex = normalizedText.indexOf(normalizedTarget, searchIndex + Math.max(normalizedTarget.length, 1));
  }
  if (!matchIndexes.length) return null;
  const scored = matchIndexes.map((index, occurrence) => {
    let score = 0;
    const beforeSlice = normalizedText.slice(Math.max(0, index - beforeHint.length - 24), index);
    const afterSlice = normalizedText.slice(index + normalizedTarget.length, index + normalizedTarget.length + afterHint.length + 24);
    if (beforeHint) {
      score += beforeSlice.includes(beforeHint) ? 6 : 0;
      if (beforeSlice.endsWith(beforeHint)) score += 4;
    }
    if (afterHint) {
      score += afterSlice.includes(afterHint) ? 6 : 0;
      if (afterSlice.startsWith(afterHint)) score += 4;
    }
    if (typeof preferredIndex === "number") {
      score -= Math.abs(index - preferredIndex) * 0.05;
    } else {
      score -= index * 0.0001;
    }
    return { index, occurrence, score };
  }).sort((left, right) => right.score - left.score);
  return scored[0] || null;
}

function getNormalizedSelectionOffsetsWithinNode(node, range) {
  if (!(node instanceof HTMLElement) || !(range instanceof Range)) return null;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      return textNode.textContent?.length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const textNodes = [];
  let fullText = "";
  let textNode;
  while ((textNode = walker.nextNode())) {
    const raw = textNode.textContent || "";
    const normalized = raw.replace(/\s+/g, " ");
    textNodes.push({
      node: textNode,
      start: fullText.length,
      end: fullText.length + normalized.length,
      normalized,
    });
    fullText += normalized;
  }
  if (!textNodes.length) return null;

  const findAbsoluteOffset = (targetNode, targetOffset) => {
    const segment = textNodes.find((item) => item.node === targetNode);
    if (!segment) return null;
    const prefix = (targetNode.textContent || "").slice(0, targetOffset).replace(/\s+/g, " ");
    return segment.start + prefix.length;
  };

  const start = findAbsoluteOffset(range.startContainer, range.startOffset);
  const end = findAbsoluteOffset(range.endContainer, range.endOffset);
  if (typeof start !== "number" || typeof end !== "number") return null;
  return {
    fullText,
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function getSelectionBlockNodeFromRange(range) {
  const commonNode = range?.commonAncestorContainer;
  if (!(commonNode instanceof Node) || !editorRoot.contains(commonNode)) return null;
  const element = commonNode instanceof HTMLElement ? commonNode : commonNode.parentElement;
  if (!(element instanceof HTMLElement)) return null;
  const structuralBlock = element.closest("li, blockquote, td, th, pre, table, hr");
  if (structuralBlock instanceof HTMLElement) return structuralBlock;
  return element.closest("h1, h2, h3, h4, h5, h6, p");
}

function buildCurrentAnchorFromRenderedSelection(markdown) {
  if (editorInstance?.isMarkdownMode?.()) return null;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const commonNode = range.commonAncestorContainer;
  if (!(commonNode instanceof Node) || !editorRoot.contains(commonNode)) return null;
  const blockNode = getSelectionBlockNodeFromRange(range);
  if (!(blockNode instanceof HTMLElement)) return null;

  const proseMirror = getActiveProseMirrorRoot(blockNode);
  if (!proseMirror) return null;
  const renderedBlocks = [...proseMirror.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr, img")]
    .filter((node) => {
      if (node.matches("p") && node.closest("li, blockquote, td, th")) return false;
      return true;
    });
  const renderedBlockIndex = renderedBlocks.findIndex((node) => node === blockNode);
  if (renderedBlockIndex < 0) return null;

  const markdownBlocks = parseMarkdownBlocks(markdown);
  const markdownBlock = markdownBlocks[Math.min(renderedBlockIndex, markdownBlocks.length - 1)];
  if (!markdownBlock) return null;

  const selectionInfo = getNormalizedSelectionOffsetsWithinNode(blockNode, range);
  if (!selectionInfo) return null;
  const selectedText = selection.toString();
  const normalizedSelectedText = selectedText.replace(/\s+/g, " ").trim();
  if (!normalizedSelectedText) return null;

  const beforeHint = selectionInfo.fullText.slice(Math.max(0, selectionInfo.start - 40), selectionInfo.start).trim();
  const afterHint = selectionInfo.fullText.slice(selectionInfo.end, Math.min(selectionInfo.fullText.length, selectionInfo.end + 40)).trim();
  const mapping = buildMarkdownBlockDisplayMapping(markdownBlock);
  const matchMeta = findBestTextMatchMeta(mapping.text, normalizedSelectedText, beforeHint, afterHint, selectionInfo.start);
  if (!matchMeta) return null;

  const blockStartOffset = markdownPosToOffset(markdown, [markdownBlock.lineStart - 1, 0]);
  const rawStartOffset = mapping.positionMap[matchMeta.index] ?? 0;
  const rawEndOffset = mapping.positionMap[matchMeta.index + normalizedSelectedText.length] ?? rawStartOffset + normalizedSelectedText.length;
  const mdStart = offsetToMarkdownPos(markdown, blockStartOffset + rawStartOffset);
  const mdEnd = offsetToMarkdownPos(markdown, blockStartOffset + rawEndOffset);

  const anchor = buildAnchorFromMdRange(mdStart, mdEnd, markdown, "selection");
  anchor.selectedText = normalizedSelectedText;
  anchor.contextBefore = beforeHint;
  anchor.contextAfter = afterHint;
  return normalizeAnchor(anchor, markdown);
}

function buildCurrentInsertionAnchorFromRenderedCaret(markdown) {
  if (editorInstance?.isMarkdownMode?.()) return null;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const commonNode = range.commonAncestorContainer;
  if (!(commonNode instanceof Node) || !editorRoot.contains(commonNode)) return null;
  const blockNode = getSelectionBlockNodeFromRange(range);
  if (!(blockNode instanceof HTMLElement)) return null;

  const proseMirror = getActiveProseMirrorRoot(blockNode);
  if (!proseMirror) return null;
  const renderedBlocks = [...proseMirror.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr, img")]
    .filter((node) => {
      if (node.matches("p") && node.closest("li, blockquote, td, th")) return false;
      return true;
    });
  const renderedBlockIndex = renderedBlocks.findIndex((node) => node === blockNode);
  if (renderedBlockIndex < 0) return null;

  const markdownBlocks = parseMarkdownBlocks(markdown);
  const markdownBlock = markdownBlocks[Math.min(renderedBlockIndex, markdownBlocks.length - 1)];
  if (!markdownBlock) return null;

  const selectionInfo = getNormalizedSelectionOffsetsWithinNode(blockNode, range);
  if (!selectionInfo) return null;
  const mapping = buildMarkdownBlockDisplayMapping(markdownBlock);
  const rawOffsetInBlock = mapping.positionMap[Math.min(selectionInfo.start, mapping.positionMap.length - 1)] ?? 0;
  const blockStartOffset = markdownPosToOffset(markdown, [markdownBlock.lineStart - 1, 0]);
  const mdPos = offsetToMarkdownPos(markdown, blockStartOffset + rawOffsetInBlock);
  const anchor = buildAnchorFromMdRange(mdPos, mdPos, markdown, "line");
  anchor.insertionMdPos = normalizeMdPosition(mdPos);
  return normalizeAnchor(anchor, markdown);
}

function enrichAnchor(normalized, markdown) {
  const blocks = parseMarkdownBlocks(markdown);
  const blockIndex = blocks.findIndex((item) => normalized.lineStart >= item.lineStart && normalized.lineEnd <= item.lineEnd);
  const fallbackBlockIndex = blockIndex >= 0
    ? blockIndex
    : blocks.findIndex((item) => normalized.lineStart >= item.lineStart && normalized.lineStart <= item.lineEnd);
  const block = fallbackBlockIndex >= 0 ? blocks[fallbackBlockIndex] : null;
  const text = normalized.selectedText || markdown.slice(normalized.start, normalized.end) || "";
  const image = parseImageSyntax(text.trim()) || parseImageSyntax((block?.rawText || "").trim());
  const blockText = block ? normalizeBlockDisplayText(block.rawText) : (normalized.blockText || "");
  const selectionMeta = blockText
    ? findBestTextMatchMeta(
        blockText,
        String(normalized.selectedText || "").replace(/\s+/g, " ").trim(),
        String(normalized.contextBefore || "").replace(/\s+/g, " ").trim(),
        String(normalized.contextAfter || "").replace(/\s+/g, " ").trim(),
        typeof normalized.selectionIndexInBlock === "number" ? normalized.selectionIndexInBlock : null
      )
    : null;
  let heading = null;
  for (const item of state.outline) {
    if (item.lineStart <= normalized.lineStart) heading = item;
    else break;
  }

  return {
    ...normalized,
    mode: image ? "image" : normalized.mode,
    blockId: block?.id || normalized.blockId || null,
    blockType: image ? "image" : (block?.type || normalized.blockType || "text"),
    blockIndex: fallbackBlockIndex >= 0 ? fallbackBlockIndex : (normalized.blockIndex ?? null),
    blockText,
    selectionOccurrence: typeof selectionMeta?.occurrence === "number"
      ? selectionMeta.occurrence
      : (normalized.selectionOccurrence ?? null),
    selectionIndexInBlock: typeof selectionMeta?.index === "number"
      ? selectionMeta.index
      : (normalized.selectionIndexInBlock ?? null),
    assetPath: image?.assetPath || normalized.assetPath || null,
    headingId: heading?.id || normalized.headingId || null,
    selectedText: image && image.assetPath
      ? `[图片] ${image.alt || "未命名图片"}\n${image.assetPath}`
      : normalized.selectedText,
  };
}

function normalizeAnchor(anchor, markdown) {
  if (!anchor || typeof anchor !== "object") {
    return enrichAnchor(buildAnchorFromMdRange([0, 0], [0, 0], markdown, "line"), markdown);
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

  return enrichAnchor({
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
  }, markdown);
}

function formatLineRange(anchor) {
  return `L${anchor.lineStart}${anchor.lineEnd > anchor.lineStart ? `-L${anchor.lineEnd}` : ""}`;
}

function previewQuote(anchor) {
  if (anchor.assetPath) {
    return `${formatLineRange(anchor)}\n${anchor.selectedText || `[图片] ${anchor.assetPath}`}`;
  }
  return `${formatLineRange(anchor)}\n${anchor.selectedText || "(空行)"}`;
}

function rewriteRenderedAssetUrls(root = editorRoot) {
  const images = root.matches?.(".toastui-editor-contents")
    ? [...root.querySelectorAll("img")]
    : [...root.querySelectorAll(".toastui-editor-contents img")];
  images.forEach((image) => {
    const originalSrc = image.dataset.reviewAssetOriginal || image.getAttribute("src") || "";
    if (!image.dataset.reviewAssetOriginal) {
      image.dataset.reviewAssetOriginal = originalSrc;
    }
    const nextSrc = buildAssetUrl(originalSrc);
    if (!nextSrc) return;
    if (image.src !== new URL(nextSrc, window.location.href).href) {
      image.src = nextSrc;
    }
    image.addEventListener("load", () => image.classList.remove("is-broken"), { once: true });
    image.addEventListener("error", () => image.classList.add("is-broken"), { once: true });
  });
}

function renderMathInRoot(root) {
  if (!(root instanceof HTMLElement)) return;
  const renderMath = window.renderMathInElement;
  if (typeof renderMath !== "function") return;
  root.querySelectorAll(".revision-deleted-inline.ProseMirror-widget, .revision-deleted-inline, .revision-added-inline").forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (!element.dataset.docpilotMathSource) {
      const rawText = (element.textContent || "").trim();
      if (rawText) {
        element.dataset.docpilotMathSource = rawText;
      }
    }
  });
  renderMath(root, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
    ],
    throwOnError: false,
    strict: "ignore",
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
  });
}

function cleanupRenderedMath(root) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll("[data-docpilot-math-render]").forEach((element) => element.remove());
  root.querySelectorAll("[data-docpilot-math-source]").forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.dataset.docpilotMathRendered === "true") {
      element.textContent = element.dataset.docpilotMathSource || "";
      delete element.dataset.docpilotMathRendered;
    }
  });
  root.querySelectorAll(".docpilot-math-hidden, .docpilot-math-inline-source, .docpilot-math-display-source").forEach((element) => {
    element.classList.remove("docpilot-math-hidden");
    element.classList.remove("docpilot-math-inline-source");
    element.classList.remove("docpilot-math-display-source");
  });
  root.querySelectorAll(".docpilot-math-source-block").forEach((element) => {
    element.classList.remove("docpilot-math-source-block");
  });
}

function extractSourceText(node) {
  if (!(node instanceof HTMLElement)) return "";
  return (node.dataset.docpilotMathSource || node.textContent || "").trim();
}

function extractInlineMathLatex(sourceText) {
  if (!sourceText) return null;
  const inlineDollarMatch = sourceText.match(/^\$(?!\$)([\s\S]+?)\$(?!\$)$/);
  if (inlineDollarMatch) return inlineDollarMatch[1].trim();
  const inlineParenMatch = sourceText.match(/^\\\(([\s\S]+?)\\\)$/);
  if (inlineParenMatch) return inlineParenMatch[1].trim();
  return null;
}

function extractDisplayMathLatex(sourceText) {
  if (!sourceText) return null;
  const blockDollarMatch = sourceText.match(/^\$\$([\s\S]+)\$\$$/);
  if (blockDollarMatch) return blockDollarMatch[1].trim();
  const blockBracketMatch = sourceText.match(/^\\\[([\s\S]+)\\\]$/);
  if (blockBracketMatch) return blockBracketMatch[1].trim();
  return null;
}

function ensureMathOverlayLayer() {
  if (mathOverlayLayer?.isConnected) return mathOverlayLayer;
  mathOverlayLayer = document.createElement("div");
  mathOverlayLayer.className = "math-overlay-layer";
  reviewStage?.appendChild(mathOverlayLayer);
  return mathOverlayLayer;
}

function clearMathOverlays() {
  const layer = ensureMathOverlayLayer();
  if (layer) layer.innerHTML = "";
}

function appendMathOverlay({ rect, latex, displayMode }) {
  if (!reviewStage || !window.katex?.render || !latex) return;
  const stageRect = reviewStage.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return;
  const overlayRect = {
    left: rect.left - stageRect.left,
    top: rect.top - stageRect.top,
    width: rect.width,
    height: rect.height,
  };
  const layer = ensureMathOverlayLayer();
  if (!layer) return;

  const overlay = document.createElement("div");
  overlay.className = `math-overlay${displayMode ? " is-display" : " is-inline"}`;
  overlay.style.left = `${overlayRect.left}px`;
  overlay.style.top = `${overlayRect.top}px`;
  overlay.style.width = `${overlayRect.width}px`;
  overlay.style.minHeight = `${overlayRect.height}px`;

  const inner = document.createElement("div");
  inner.className = "math-overlay-inner";
  overlay.appendChild(inner);
  try {
    window.katex.render(latex, inner, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
    });
  } catch {
    inner.textContent = latex;
  }
  layer.appendChild(overlay);
  return overlay;
}

function renderMathOverlays() {
  clearMathOverlays();
  if (state.surfaceMode !== "document") return;
  const proseMirror = editorRoot.querySelector(".toastui-editor-ww-container .ProseMirror");
  if (!(proseMirror instanceof HTMLElement)) return;
  const displayFormulaBlocks = findDisplayFormulaBlocks(getMarkdownContent());
  let displayFormulaCursor = 0;

  const inlineSources = [...proseMirror.querySelectorAll(".revision-deleted-inline.ProseMirror-widget")];
  inlineSources.forEach((sourceNode) => {
    if (!(sourceNode instanceof HTMLElement)) return;
    const latex = extractInlineMathLatex(extractSourceText(sourceNode));
    if (!latex) return;
    const target = sourceNode.nextElementSibling instanceof HTMLElement
      && sourceNode.nextElementSibling.classList.contains("revision-added-inline")
      ? sourceNode.nextElementSibling
      : sourceNode;
    appendMathOverlay({
      rect: target.getBoundingClientRect(),
      latex,
      displayMode: false,
    });
  });

  proseMirror.querySelectorAll("p").forEach((block) => {
    if (!(block instanceof HTMLElement)) return;
    const deletedWidgets = [...block.querySelectorAll(":scope > .revision-deleted-inline.ProseMirror-widget")];
    if (deletedWidgets.length < 3) return;
    const chunks = deletedWidgets.map((node) => extractSourceText(node)).filter(Boolean);
    if (chunks.length < 3) return;
    const opening = chunks[0];
    const closing = chunks[chunks.length - 1];
    if (!((opening === "$$" && closing === "$$") || (opening === "\\[" && closing === "\\]"))) return;
    const latex = chunks.slice(1, -1).join("\n").trim();
    if (!latex) return;
    const overlay = appendMathOverlay({
      rect: block.getBoundingClientRect(),
      latex,
      displayMode: true,
    });
    if (overlay instanceof HTMLElement) {
      const matchIndex = displayFormulaBlocks.findIndex((item, index) => index >= displayFormulaCursor && item.latex === latex);
      const match = matchIndex >= 0 ? displayFormulaBlocks[matchIndex] : null;
      if (match) {
        displayFormulaCursor = matchIndex + 1;
        overlay.dataset.formulaStartLine = String(match.lineStart);
        overlay.dataset.formulaEndLine = String(match.lineEnd);
      }
    }
  });

  const children = [...proseMirror.children];
  for (let index = 0; index < children.length; index += 1) {
    const startBlock = children[index];
    const middleBlock = children[index + 1];
    const endBlock = children[index + 2];
    if (!(startBlock instanceof HTMLElement) || !(middleBlock instanceof HTMLElement) || !(endBlock instanceof HTMLElement)) continue;
    const opening = (startBlock.innerText || "").trim();
    const closing = (endBlock.innerText || "").trim();
    if (!((opening === "$$" && closing === "$$") || (opening === "\\[" && closing === "\\]"))) continue;
    const latex = (middleBlock.innerText || "").trim();
    if (!latex) continue;

    const startRect = startBlock.getBoundingClientRect();
    const middleRect = middleBlock.getBoundingClientRect();
    const endRect = endBlock.getBoundingClientRect();
    const unionRect = {
      left: Math.min(startRect.left, middleRect.left, endRect.left),
      top: Math.min(startRect.top, middleRect.top, endRect.top),
      right: Math.max(startRect.right, middleRect.right, endRect.right),
      bottom: Math.max(startRect.bottom, middleRect.bottom, endRect.bottom),
      width: Math.max(startRect.right, middleRect.right, endRect.right) - Math.min(startRect.left, middleRect.left, endRect.left),
      height: Math.max(startRect.bottom, middleRect.bottom, endRect.bottom) - Math.min(startRect.top, middleRect.top, endRect.top),
    };
    startBlock.classList.add("docpilot-math-source-block");
    middleBlock.classList.add("docpilot-math-source-block");
    endBlock.classList.add("docpilot-math-source-block");
    const overlay = appendMathOverlay({
      rect: unionRect,
      latex,
      displayMode: true,
    });
    if (overlay instanceof HTMLElement) {
      const matchIndex = displayFormulaBlocks.findIndex((item, itemIndex) => itemIndex >= displayFormulaCursor && item.latex === latex);
      const match = matchIndex >= 0 ? displayFormulaBlocks[matchIndex] : null;
      if (match) {
        displayFormulaCursor = matchIndex + 1;
        overlay.dataset.formulaStartLine = String(match.lineStart);
        overlay.dataset.formulaEndLine = String(match.lineEnd);
      }
    }
    index += 2;
  }
}

function hideAdjacentAddedMath(sourceNode) {
  if (!(sourceNode instanceof HTMLElement)) return;
  let probe = sourceNode.nextElementSibling;
  while (probe instanceof HTMLElement && probe.classList.contains("revision-added-inline")) {
    probe.classList.add("docpilot-math-hidden");
    break;
  }
}

function renderRevisionAwareMath(root) {
  if (!(root instanceof HTMLElement) || !window.katex?.render) return;
  cleanupRenderedMath(root);

  root.querySelectorAll(".revision-deleted-inline.ProseMirror-widget").forEach((sourceNode) => {
    if (!(sourceNode instanceof HTMLElement)) return;
    const latex = extractInlineMathLatex(extractSourceText(sourceNode)) || null;
    if (!latex) return;
    try {
      window.katex.render(latex, sourceNode, {
        displayMode: false,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      sourceNode.textContent = extractSourceText(sourceNode);
      return;
    }
    sourceNode.dataset.docpilotMathRendered = "true";
    sourceNode.classList.add("docpilot-math-inline-source");
    hideAdjacentAddedMath(sourceNode);
  });

  root.querySelectorAll("p").forEach((block) => {
    if (!(block instanceof HTMLElement)) return;
    const deletedWidgets = [...block.querySelectorAll(":scope > .revision-deleted-inline.ProseMirror-widget")];
    let latex = null;
    let targetNode = null;

    if (deletedWidgets.length >= 3) {
      const chunks = deletedWidgets.map((node) => extractSourceText(node)).filter(Boolean);
      if (chunks.length >= 3) {
        const opening = chunks[0];
        const closing = chunks[chunks.length - 1];
        if ((opening === "$$" && closing === "$$") || (opening === "\\[" && closing === "\\]")) {
          latex = chunks.slice(1, -1).join("\n").trim();
          targetNode = deletedWidgets[1] || null;
          deletedWidgets[0]?.classList.add("docpilot-math-hidden");
          deletedWidgets[chunks.length - 1]?.classList.add("docpilot-math-hidden");
          deletedWidgets.slice(2, -1).forEach((node) => node.classList.add("docpilot-math-hidden"));
        }
      }
    }

    if (!latex || !(targetNode instanceof HTMLElement)) return;
    try {
      window.katex.render(latex, targetNode, {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      targetNode.textContent = extractSourceText(targetNode);
      return;
    }
    targetNode.dataset.docpilotMathRendered = "true";
    targetNode.classList.add("docpilot-math-display-source");
    block.querySelectorAll(":scope > .revision-added-inline").forEach((node) => node.classList.add("docpilot-math-hidden"));
  });
}

function renderGenericDisplayMath(root, { reset = true } = {}) {
  if (!(root instanceof HTMLElement) || !window.katex?.render) return;
  if (reset) {
    cleanupRenderedMath(root);
  }
  renderMathInRoot(root);

  const blockCandidates = [
    ...root.querySelectorAll("p"),
    ...root.querySelectorAll("li > p"),
    ...root.querySelectorAll("blockquote > p"),
  ];

  blockCandidates.forEach((block) => {
    if (!(block instanceof HTMLElement)) return;
    const latex = extractDisplayMathLatex((block.textContent || "").trim());
    if (!latex) return;

    const rendered = document.createElement("div");
    rendered.className = "docpilot-math-block";
    rendered.dataset.docpilotMathRender = "block";
    rendered.setAttribute("contenteditable", "false");
    try {
      window.katex.render(latex, rendered, {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      rendered.textContent = latex;
    }

    block.classList.add("docpilot-math-hidden");
    block.after(rendered);
  });
}

function scheduleMathRender() {
  if (pendingMathRender) return;
  pendingMathRender = window.requestAnimationFrame(() => {
    pendingMathRender = 0;
    if (state.isComposing) return;
    const proseMirror = editorRoot.querySelector(".toastui-editor-ww-container .ProseMirror");
    const markdownPreview = editorRoot.querySelector(".toastui-editor-md-preview .toastui-editor-contents");
    if (proseMirror instanceof HTMLElement) {
      renderMathOverlays();
    }
    if (markdownPreview instanceof HTMLElement) {
      renderGenericDisplayMath(markdownPreview);
    }
    if (revisionPreviewRoot instanceof HTMLElement && revisionPreviewRoot.childElementCount) {
      renderGenericDisplayMath(revisionPreviewRoot);
    }
  });
}

function syncSelectedImageState() {
  const images = [...editorRoot.querySelectorAll(".toastui-editor-contents img")];
  images.forEach((image) => {
    const originalSrc = image.dataset.reviewAssetOriginal || image.getAttribute("src") || "";
    image.classList.toggle("is-selected-image", resolveAssetPath(originalSrc) === state.selectedImagePath);
  });
}

function scheduleRenderedContentRefresh() {
  if (pendingRenderedContentRefresh) return;
  pendingRenderedContentRefresh = window.requestAnimationFrame(() => {
    pendingRenderedContentRefresh = 0;
    rewriteRenderedAssetUrls();
    scheduleMathRender();
    syncSelectedImageState();
    syncActiveHeadingFromViewport();
  });
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
  rewriteRenderedAssetUrls(container);
  renderRevisionAwareMath(container);
  renderGenericDisplayMath(container, { reset: false });
  return container;
}

async function waitForPrintableImages(root, timeoutMs = 4000) {
  if (!(root instanceof HTMLElement)) return;
  const images = [...root.querySelectorAll("img")];
  if (!images.length) return;

  await Promise.all(images.map((image) => new Promise((resolve) => {
    if (image.complete && image.naturalWidth > 0) {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, timeoutMs);
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  })));
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
  await waitForPrintableImages(shell);
  await waitForAnimationFrames(2);
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

async function exportReflowPackage() {
  try {
    if (!state.path) {
      setStatus("当前还没有可导出的文档。", true);
      return;
    }
    if (state.markdownDirty) {
      await saveMarkdown({ auto: true });
    }
    setStatus("正在导出 DocPilot 文档包...");
    const response = await fetch(`/api/package-export?path=${encodeURIComponent(filePathInput.value.trim())}`);
    if (!response.ok) {
      let message = `导出失败：${response.status}`;
      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const fileName = `${(state.path || "document").replace(/\.md$/i, "")}.docpilot`.split("/").pop();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setStatus(`已导出 ${fileName}`);
  } catch (error) {
    setStatus(error.message, true);
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

function updateSurfaceModeButtons() {
  const buttonMap = [
    [surfaceDocumentBtn, "document"],
    [surfaceMarkdownBtn, "markdown"],
  ];
  for (const [button, mode] of buttonMap) {
    const active = state.surfaceMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function setSurfaceMode(mode) {
  ensureEditor();
  state.surfaceMode = mode;
  if (mode === "markdown") {
    if (!editorInstance.isMarkdownMode()) {
      editorInstance.changeMode("markdown", true);
    }
  } else {
    if (editorInstance.isMarkdownMode()) {
      editorInstance.changeMode("wysiwyg", true);
    }
  }
  updateSurfaceModeButtons();
  syncEditorModeInfo();
  scheduleCommentLayout();
  scheduleRenderedContentRefresh();
}

function setViewMode(mode) {
  state.viewMode = mode;
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
  }
  const isRevisionMode = mode === "revision";
  previewPanel.classList.add("is-hidden");
  editorRoot.classList.toggle("is-revision-mode", isRevisionMode);
  editorRoot.classList.toggle("is-clean-mode", !isRevisionMode);
  addCommentBtn.disabled = false;
  updateViewModeButtons();
  if (isRevisionMode) {
    if (state.surfaceMode === "document" && editorInstance?.isMarkdownMode?.()) {
      editorInstance.changeMode("wysiwyg", true);
      syncEditorModeInfo();
    }
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

  const payload = { enabled: true, decorations };
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
  const payload = { enabled: true, decorations };
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
  window.requestAnimationFrame(() => {
    scheduleRenderedContentRefresh();
  });
}

function renderRevisionTrace() {
  if (!editorInstance) return;
  const baseline = state.revisionBaseline || "";
  const currentContent = getMarkdownContent();
  const { payload, stats } = buildWysiwygRevisionPayloadFromContent(baseline, currentContent);
  applyRevisionDecorations(payload);
}

function getRenderedBlockNodes() {
  if (editorInstance?.isMarkdownMode?.()) return [];
  const proseMirror = editorRoot.querySelector(".toastui-editor-ww-container .ProseMirror");
  if (!proseMirror) return [];
  return [...proseMirror.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr, img")]
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
      return true;
    });
}

function updateResolvedVisibilityButtons() {
  showResolvedBtn.classList.toggle("is-active", state.showResolvedThreads);
  hideResolvedBtn.classList.toggle("is-active", !state.showResolvedThreads);
  showResolvedBtn.disabled = state.showResolvedThreads;
  hideResolvedBtn.disabled = !state.showResolvedThreads;
}

function getThreadById(threadId) {
  return state.comments.find((item) => item.id === threadId) || null;
}

function captureThreadMessageScrollState(root, targetMap) {
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll(".thread-card .thread-messages").forEach((node) => {
    const threadId = node.dataset.threadId;
    if (threadId) targetMap.set(threadId, node.scrollTop);
  });
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
  if (reviewStateInfo) {
    reviewStateInfo.textContent = formatReviewState(state.reviewState);
  }
  approveCloseBtn.disabled = state.reviewState?.status === "approved";
}

function updateContextState() {
  const hasContext = Boolean((state.contextContent || "").trim());
  if (contextStateInfo) {
    contextStateInfo.textContent = hasContext ? "上下文已配置" : "上下文未配置";
    contextStateInfo.classList.toggle("is-context-ready", hasContext);
  }
}

function setContextState(context) {
  state.contextContent = context?.content || "";
  state.contextPath = context?.relativePath || "";
  state.contextUpdatedAt = context?.updatedAt || null;
  updateContextState();
}

function markLocalEditActivity(duration = 1600) {
  state.localEditLockUntil = Math.max(state.localEditLockUntil, Date.now() + duration);
}

function hasFocusedInlineEditor() {
  const active = document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest(".message-body[contenteditable='true']"));
}

function hasFocusedMainEditor() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  if (editorRoot.contains(active)) return true;
  if (active.closest?.("#commentDialog, #replyDialog, #contextDialog")) return true;
  return false;
}

function isUserActivelyEditing() {
  return state.isComposing
    || Date.now() < state.localEditLockUntil
    || hasFocusedInlineEditor()
    || hasFocusedMainEditor();
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

function getThreadStatusLabel(thread) {
  return thread.status === "resolved" ? "已解决" : "进行中";
}

function getThreadToggleLabel(thread, options = {}) {
  if (thread.status === "resolved") {
    return options.floating ? "恢复" : "重新打开";
  }
  return options.floating ? "标注为已解决" : "标记已解决";
}

function buildThreadMetaMarkup(thread) {
  return `
    <span>${escapeHtml(formatLineRange(thread.anchor))}</span>
    <span class="status-pill${thread.status === "resolved" ? " resolved" : ""}">${getThreadStatusLabel(thread)}</span>
    <span>${thread.messages.length} 条消息</span>
    ${getAssistantBadge(thread)}
  `;
}

function findMessageIndex(messages, predicate, startIndex = messages.length - 1) {
  for (let index = Math.min(startIndex, messages.length - 1); index >= 0; index -= 1) {
    if (predicate(messages[index], index)) return index;
  }
  return -1;
}

function isSidebarPreviewLikelyTruncated(message) {
  const body = String(message?.body || "");
  const lineBreakCount = (body.match(/\n/g) || []).length;
  return body.length > 120 || lineBreakCount > 2;
}

function getSidebarPreviewMessages(thread) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  if (!messages.length) return [];

  const latestUserIndex = findMessageIndex(messages, (message) => message.role === "user");
  if (latestUserIndex >= 0) {
    const latestAssistantAfterUserIndex = findMessageIndex(
      messages,
      (message, index) => message.role === "assistant" && index > latestUserIndex
    );
    const previewMessages = [messages[latestUserIndex]];
    if (latestAssistantAfterUserIndex >= 0) {
      previewMessages.push(messages[latestAssistantAfterUserIndex]);
    }
    return previewMessages;
  }

  const latestAssistantIndex = findMessageIndex(messages, (message) => message.role === "assistant");
  if (latestAssistantIndex >= 0) {
    return [messages[latestAssistantIndex]];
  }

  return [messages.at(-1)];
}

function buildSidebarPreviewState(thread) {
  const previewMessages = getSidebarPreviewMessages(thread).filter(Boolean);
  const previewIds = new Set(previewMessages.map((message) => message.id));
  const hiddenCount = Math.max(0, thread.messages.length - previewIds.size);
  const hasHiddenContent = hiddenCount > 0 || previewMessages.some(isSidebarPreviewLikelyTruncated);
  return {
    previewMessages,
    hiddenCount,
    hasHiddenContent,
  };
}

function createThreadCard(thread, options = {}) {
  const floating = Boolean(options.floating);
  const isExpanded = floating || Boolean(options.isExpanded);
  const sidebarPreview = floating ? null : buildSidebarPreviewState(thread);
  const displayMessages = floating ? thread.messages : sidebarPreview.previewMessages;

  const card = document.createElement("article");
  card.className = `thread-card ${floating ? "is-floating" : "is-sidebar"}`;
  card.dataset.threadId = thread.id;
  card.dataset.lineStart = String(thread.anchor?.lineStart || 1);
  if (!floating && thread.id === state.activeCommentId) card.classList.add("active");
  if (isExpanded) card.classList.add("is-expanded");
  if (isThreadPending(thread)) card.classList.add("pending");
  if (!floating && sidebarPreview.hasHiddenContent) card.classList.add("has-hidden-content");

  const header = document.createElement("div");
  header.className = "thread-header";

  const meta = document.createElement("div");
  meta.className = "thread-meta";
  meta.innerHTML = buildThreadMetaMarkup(thread);

  const headerActions = document.createElement("div");
  headerActions.className = "thread-header-actions";

  if (floating) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "ghost";
    closeBtn.textContent = "收起";
    closeBtn.dataset.closeFloatingComment = "true";
    closeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeFloatingComment();
    });
    headerActions.append(closeBtn);
  } else {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "ghost";
    toggleBtn.textContent = getThreadToggleLabel(thread);
    toggleBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await toggleThreadStatus(thread.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost";
    deleteBtn.textContent = "删除";
    deleteBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await deleteThread(thread.id);
    });

    headerActions.append(toggleBtn, deleteBtn);
  }

  header.append(meta, headerActions);
  card.appendChild(header);

  if (floating) {
    const quote = document.createElement("div");
    quote.className = "quote-box";
    quote.innerHTML = `
      <div class="quote-label">原文定位</div>
      <pre>${escapeHtml(thread.anchor.selectedText || "(空行批注)")}</pre>
    `;
    card.appendChild(quote);
  }

  const messages = document.createElement("div");
  messages.className = "thread-messages";
  messages.dataset.threadId = thread.id;
  for (const message of displayMessages) {
    const item = document.createElement("div");
    item.className = `message ${message.role === "assistant" ? "assistant" : "user"}`;
    if (floating && message.role === "assistant" && !isExpanded) item.classList.add("is-collapsed");

    const messageHeader = document.createElement("div");
    messageHeader.className = "message-header";

    const metaBlock = document.createElement("div");
    metaBlock.textContent = `${message.author} · ${new Date(message.updatedAt || message.createdAt).toLocaleString()}`;

    messageHeader.append(metaBlock);

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = message.body;
    const editable = floating ? (message.role === "assistant" ? isExpanded : true) : false;
    body.contentEditable = String(editable);
    body.spellcheck = false;
    body.dataset.editable = body.contentEditable;
    if (!floating) {
      body.setAttribute("aria-label", "批注摘要，点击后在悬浮卡片中查看完整内容");
    } else if (message.role === "assistant" && !isExpanded) {
      body.setAttribute("aria-label", "助手回复已折叠，点击后可在悬浮卡片中查看完整内容");
    } else {
      body.setAttribute("aria-label", "批注内容，可直接编辑");
    }
    body.addEventListener("click", (event) => {
      if (!floating || (message.role === "assistant" && !isExpanded)) {
        event.stopPropagation();
        openFloatingComment(thread.id);
        return;
      }
      markLocalEditActivity();
      event.stopPropagation();
    });
    body.addEventListener("mousedown", (event) => {
      if (!floating || (message.role === "assistant" && !isExpanded)) {
        event.stopPropagation();
        return;
      }
      markLocalEditActivity();
      event.stopPropagation();
    });
    if (editable) {
      body.addEventListener("focus", () => {
        markLocalEditActivity(2400);
      });
      body.addEventListener("compositionstart", () => {
        state.isComposing = true;
        markLocalEditActivity(3000);
      });
      body.addEventListener("compositionend", () => {
        state.isComposing = false;
        markLocalEditActivity(1800);
      });
      body.addEventListener("input", () => {
        const nextText = body.textContent?.replace(/\u00a0/g, " ") || "";
        message.body = nextText;
        const now = new Date().toISOString();
        message.updatedAt = now;
        thread.updatedAt = now;
        markLocalEditActivity(2200);
        scheduleInlineCommentSave();
      });
      body.addEventListener("blur", async () => {
        const normalized = body.textContent?.replace(/\u00a0/g, " ").trimEnd() || "";
        body.textContent = normalized;
        message.body = normalized;
        const now = new Date().toISOString();
        message.updatedAt = now;
        thread.updatedAt = now;
        state.isComposing = false;
        markLocalEditActivity(1200);
        clearInlineCommentSaveTimer();
        await persistComments("批注修改已自动保存。");
      });
    }

    item.append(messageHeader, body);
    messages.appendChild(item);
  }

  card.appendChild(messages);

  if (!floating && sidebarPreview.hasHiddenContent) {
    const historyHint = document.createElement("div");
    historyHint.className = "thread-history-hint";
    historyHint.setAttribute("aria-hidden", "true");
    historyHint.innerHTML = "<span></span><span></span><span></span>";
    card.appendChild(historyHint);
  }

  const actions = document.createElement("div");
  actions.className = "thread-actions";

  if (floating) {
    const resolveBtn = document.createElement("button");
    resolveBtn.type = "button";
    resolveBtn.className = thread.status === "resolved" ? "ghost" : "secondary";
    resolveBtn.textContent = getThreadToggleLabel(thread, { floating: true });
    resolveBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await toggleThreadStatus(thread.id);
    });
    actions.appendChild(resolveBtn);
  }

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

  actions.append(requestBtn, replyBtn);
  card.appendChild(actions);

  if (floating) {
    card.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  } else {
    card.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest("button") || target.closest(".message-body[contenteditable='true']"))) {
        return;
      }
      openFloatingComment(thread.id);
    });
  }

  return { card, messages };
}

function closeFloatingComment() {
  if (state.floatingCommentId) {
    state.floatingCommentId = null;
  }
  renderFloatingComment();
}

function openFloatingComment(threadId) {
  const thread = getThreadById(threadId);
  if (!thread) return;
  state.activeCommentId = threadId;
  state.floatingCommentId = threadId;
  renderFloatingComment();
}

function renderFloatingComment() {
  if (!floatingCommentOverlay || !floatingCommentCardHost) return;
  const thread = getThreadById(state.floatingCommentId);
  if (!thread) {
    floatingCommentCardHost.innerHTML = "";
    floatingCommentOverlay.hidden = true;
    return;
  }
  floatingCommentCardHost.innerHTML = "";
  const { card, messages } = createThreadCard(thread, { floating: true, isExpanded: true });
  floatingCommentCardHost.appendChild(card);
  floatingCommentOverlay.hidden = false;
  const savedScrollTop = commentMessageScrollState.get(thread.id);
  if (typeof savedScrollTop === "number" && savedScrollTop > 0) {
    window.requestAnimationFrame(() => {
      messages.scrollTop = savedScrollTop;
    });
  }
}

function renderComments() {
  const nextScrollState = new Map();
  captureThreadMessageScrollState(commentList, nextScrollState);
  captureThreadMessageScrollState(floatingCommentCardHost, nextScrollState);
  commentMessageScrollState = nextScrollState;
  commentList.innerHTML = "";
  const counts = getThreadCounts();
  const visibleThreads = getVisibleThreads();

  commentCount.textContent = visibleThreads.length === state.comments.length
    ? `${state.comments.length} 个线程`
    : `${visibleThreads.length} / ${state.comments.length} 个线程`;
  if (reviewStateInfo) {
    reviewStateInfo.textContent = formatReviewState(state.reviewState);
  }
  if (requestAllBtn) requestAllBtn.disabled = counts.unresolved === 0;
  if (copyPendingBtn) copyPendingBtn.disabled = counts.pending === 0;
  showResolvedBtn.textContent = `展开所有标注 (${state.comments.length})`;
  hideResolvedBtn.textContent = `隐藏已解决批注 (${counts.resolved})`;
  updateResolvedVisibilityButtons();

  if (!visibleThreads.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.comments.length
      ? (state.showResolvedThreads ? "当前筛选条件下没有线程。" : "当前没有可见线程。已解决批注已隐藏，可点“展开所有标注”查看历史。")
      : "还没有批注线程。先在编辑器里选中文字，再点“批注当前选区”。";
    commentList.appendChild(empty);
    renderFloatingComment();
    return;
  }

  const commentTrack = document.createElement("div");
  commentTrack.className = "comment-track";
  const positionedThreads = [...visibleThreads].sort(compareThreadsByAnchor);

  for (const thread of positionedThreads) {
    const { card, messages } = createThreadCard(thread, { isExpanded: false, floating: false });
    commentTrack.appendChild(card);
    const savedScrollTop = commentMessageScrollState.get(thread.id);
    if (typeof savedScrollTop === "number" && savedScrollTop > 0) {
      window.requestAnimationFrame(() => {
        messages.scrollTop = savedScrollTop;
      });
    }
  }

  commentList.appendChild(commentTrack);
  scheduleCommentLayout();
  renderFloatingComment();
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

function getActiveProseMirrorRoot(preferredNode = null) {
  const preferredRoot = preferredNode instanceof Node
    ? preferredNode.parentElement?.closest(".ProseMirror") || (preferredNode instanceof HTMLElement ? preferredNode.closest(".ProseMirror") : null)
    : null;
  if (preferredRoot instanceof HTMLElement) return preferredRoot;

  const candidates = [...editorRoot.querySelectorAll(".toastui-editor-ww-container .ProseMirror")]
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        node,
        area: Math.max(rect.width, 0) * Math.max(rect.height, 0),
      };
    })
    .filter((item) => item.area > 0)
    .sort((left, right) => right.area - left.area);
  return candidates[0]?.node || null;
}

function parseMarkdownBlocks(markdown) {
  const lines = getLines(markdown);
  const blocks = [];
  let paragraphStart = null;
  let codeFenceStart = null;
  let codeFenceToken = null;

  const pushBlock = (type, startIndex, endIndex) => {
    const rawText = lines.slice(startIndex, endIndex + 1).join("\n");
    const image = type === "image" ? parseImageSyntax(rawText.trim()) : null;
    blocks.push({
      id: `block-${startIndex + 1}-${endIndex + 1}-${type}`,
      type,
      lineStart: startIndex + 1,
      lineEnd: endIndex + 1,
      rawText,
      assetPath: image?.assetPath || null,
    });
  };

  const pushParagraph = (endIndex) => {
    if (paragraphStart === null) return;
    const rawText = lines.slice(paragraphStart, endIndex + 1).join("\n").trim();
    if (parseImageSyntax(rawText)) {
      pushBlock("image", paragraphStart, endIndex);
    } else {
      pushBlock("paragraph", paragraphStart, endIndex);
    }
    paragraphStart = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (codeFenceStart !== null) {
      if (trimmed.startsWith(codeFenceToken)) {
        pushBlock("code", codeFenceStart, index);
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
      pushBlock(/^#{1,6}\s/.test(trimmed) ? "heading" : "rule", index, index);
      continue;
    }

    if (/^>\s?/.test(trimmed) || /^(\d+\.\s+|[-*+]\s+)/.test(trimmed)) {
      pushParagraph(index - 1);
      pushBlock(/^>\s?/.test(trimmed) ? "blockquote" : "list", index, index);
      continue;
    }

    if (paragraphStart === null) paragraphStart = index;
  }

  if (codeFenceStart !== null) {
    pushBlock("code", codeFenceStart, lines.length - 1);
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

function extractOutline(markdown) {
  const lines = getLines(markdown);
  const outline = [];
  let fenceToken = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      fenceToken = fenceToken ? null : fenceMatch[1];
      continue;
    }
    if (fenceToken) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!headingMatch) continue;

    outline.push({
      id: `heading-${index + 1}`,
      level: headingMatch[1].length,
      text: headingMatch[2].trim(),
      lineStart: index + 1,
    });
  }

  return outline;
}

function setOutline(markdown) {
  state.outline = extractOutline(markdown);
  if (!state.outline.some((item) => item.id === state.activeHeadingId)) {
    state.activeHeadingId = state.outline[0]?.id || null;
  }
  renderOutline();
}

function renderOutline() {
  outlineList.innerHTML = "";

  if (!state.outline.length) {
    const empty = document.createElement("div");
    empty.className = "outline-empty";
    empty.textContent = "当前文档还没有标题。";
    outlineList.appendChild(empty);
    return;
  }

  for (const item of state.outline) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `outline-item outline-item-level-${item.level}`;
    if (item.id === state.activeHeadingId) button.classList.add("is-active");
    button.textContent = item.text;
    button.addEventListener("click", () => focusOutlineHeading(item));
    outlineList.appendChild(button);
  }
}

function setResources(resources) {
  state.assetDir = resources?.assetDir || "";
  state.resources = Array.isArray(resources?.assets) ? resources.assets : [];
  renderResources();
}

function renderResources() {
  resourceList.innerHTML = "";
  const total = state.resources.length;
  cleanupAssetsBtn.disabled = !state.resources.some((item) => !item.referenced);

  if (!total) {
    const empty = document.createElement("div");
    empty.className = "resource-empty";
    empty.textContent = state.assetDir ? "这里会列出当前文档的图片资源。" : "当前文档还没有资源。";
    resourceList.appendChild(empty);
    return;
  }

  for (const item of state.resources) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "resource-item";
    row.addEventListener("click", () => focusResource(item));

    const main = document.createElement("span");
    main.className = "resource-item-main";
    main.innerHTML = `
      <span class="resource-item-name">${escapeHtml(item.name || "未命名资源")}</span>
      <span class="resource-item-path">${escapeHtml(item.relativePath || "")}</span>
    `;

    const meta = document.createElement("span");
    meta.className = "resource-item-meta";
    meta.innerHTML = `
      <span class="resource-pill ${item.referenced ? "" : "is-unused"}">${item.referenced ? "已引用" : "未引用"}</span>
      <span class="resource-pill">${formatBytes(item.size)}</span>
    `;

    row.append(main, meta);
    resourceList.appendChild(row);
  }
}

function updateImageInsertionButtons() {
  const disabled = state.isInsertingImage;
  insertImageBtn.disabled = disabled;
  contextInsertImageBtn.disabled = disabled;
  imageUploadInput.disabled = disabled;
}

function focusResource(resource) {
  if (!resource?.relativePath) return;
  const markdown = getMarkdownContent();
  const blocks = parseMarkdownBlocks(markdown);
  const block = blocks.find((item) => item.assetPath === resource.relativePath);
  if (block) {
    focusAnchor(normalizeAnchor({
      mdStart: [block.lineStart - 1, 0],
      mdEnd: [block.lineEnd - 1, block.rawText.length],
      mode: "image",
      assetPath: block.assetPath,
    }, markdown));
    setStatus(`已定位到资源 ${resource.name} 的正文引用位置。`);
    return;
  }
  setStatus(`资源 ${resource.name} 当前未在正文中引用。`);
}

function focusOutlineHeading(item) {
  if (state.viewMode !== "edit") {
    setViewMode("edit");
  }
  state.activeHeadingId = item.id;
  state.activeCommentId = null;
  renderOutline();
  window.requestAnimationFrame(() => {
    scrollToOutlineHeading(item, "smooth");
  });
}

function syncActiveHeadingFromViewport() {
  if (!state.outline.length) return;

  let nextHeading = null;
  const proseMirror = getActiveProseMirrorRoot();
  const headingNodes = proseMirror
    ? [...proseMirror.querySelectorAll(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6")]
    : [];
  if (headingNodes.length) {
    const source = editorScrollElement || getEditorScrollContainer();
    const sourceRect = source?.getBoundingClientRect();
    const threshold = (sourceRect?.top || 0) + 40;
    for (let index = 0; index < headingNodes.length; index += 1) {
      const rect = headingNodes[index].getBoundingClientRect();
      if (rect.top <= threshold) {
        nextHeading = state.outline[index] || nextHeading;
      } else {
        break;
      }
    }
    nextHeading ||= state.outline[0];
  } else {
    const selectionRange = getCurrentSelectionMarkdownRange();
    const currentLine = selectionRange ? selectionRange[0][0] + 1 : 1;
    for (const item of state.outline) {
      if (item.lineStart <= currentLine) nextHeading = item;
      else break;
    }
    nextHeading ||= state.outline[0];
  }

  if (nextHeading && nextHeading.id !== state.activeHeadingId) {
    state.activeHeadingId = nextHeading.id;
    renderOutline();
  }
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
          node,
          top: rect.top - sourceRect.top + source.scrollTop,
          height: rect.height,
        };
      });
  }

  const proseMirror = getActiveProseMirrorRoot();
  if (!proseMirror) return [];
  const sourceRect = source.getBoundingClientRect();
  const nodes = [...proseMirror.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, hr, img")];
  return nodes
    .filter((node) => {
      if (node.matches("p") && node.closest("li, blockquote, td, th")) return false;
      return true;
    })
    .filter((node) => node.getBoundingClientRect().height > 0)
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        node,
        top: rect.top - sourceRect.top + source.scrollTop,
        height: rect.height,
      };
    });
}

function scrollEditorToLine(lineStart, behavior = "smooth") {
  attachEditorScrollSync();
  const source = editorScrollElement || getEditorScrollContainer();
  if (!source) return false;

  const markdown = getMarkdownContent();
  const markdownBlocks = parseMarkdownBlocks(markdown);
  const renderedBlocks = getRenderedBlockMetrics(source);
  if (!markdownBlocks.length || !renderedBlocks.length) return false;

  const blockIndex = findBlockIndexForLine(markdownBlocks, lineStart);
  const metric = renderedBlocks[Math.min(blockIndex, renderedBlocks.length - 1)];
  if (!metric) return false;

  const targetTop = Math.max(metric.top - 28, 0);
  source.scrollTo({ top: targetTop, behavior });
  return true;
}

function getEditorSelectionScrollTarget() {
  const source = editorScrollElement || getEditorScrollContainer();
  if (!source) return null;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const commonNode = range.commonAncestorContainer;
  if (!(commonNode instanceof Node) || !editorRoot.contains(commonNode)) return null;
  const rect = range.getBoundingClientRect();
  if (!rect || rect.height <= 0) return null;
  const sourceRect = source.getBoundingClientRect();
  return Math.max(rect.top - sourceRect.top + source.scrollTop - 32, 0);
}

function scrollEditorToAnchor(anchor, behavior = "smooth", retries = 4, preferSelection = false) {
  attachEditorScrollSync();
  const source = editorScrollElement || getEditorScrollContainer();
  if (!source) {
    if (retries > 0) {
      window.requestAnimationFrame(() => scrollEditorToAnchor(anchor, behavior, retries - 1, preferSelection));
    }
    return;
  }

  const selectionTop = preferSelection ? getEditorSelectionScrollTarget() : null;
  if (selectionTop !== null) {
    source.scrollTo({ top: selectionTop, behavior });
    return;
  }

  const didScroll = scrollEditorToLine(anchor.lineStart || 1, behavior);
  if (!didScroll && retries > 0) {
    window.requestAnimationFrame(() => scrollEditorToAnchor(anchor, behavior, retries - 1, true));
  }
}

function scrollToOutlineHeading(item, behavior = "smooth") {
  attachEditorScrollSync();
  const source = editorScrollElement || getEditorScrollContainer();
  if (!source) {
    scrollEditorToAnchor(item, behavior);
    return;
  }
  const index = state.outline.findIndex((entry) => entry.id === item.id);
  const headingNodes = [...editorRoot.querySelectorAll(".toastui-editor-ww-container .ProseMirror > h1, .toastui-editor-ww-container .ProseMirror > h2, .toastui-editor-ww-container .ProseMirror > h3, .toastui-editor-ww-container .ProseMirror > h4, .toastui-editor-ww-container .ProseMirror > h5, .toastui-editor-ww-container .ProseMirror > h6")];
  const headingNode = index >= 0 ? headingNodes[index] : null;
  if (!headingNode) {
    scrollEditorToAnchor(item, behavior);
    return;
  }
  const rect = headingNode.getBoundingClientRect();
  const sourceRect = source.getBoundingClientRect();
  const targetTop = Math.max(rect.top - sourceRect.top + source.scrollTop - 24, 0);
  source.scrollTo({ top: targetTop, behavior });
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

function updateCommentTrackViewportOffset() {
  const commentTrack = commentList.querySelector(".comment-track");
  if (!commentTrack) return;
  const viewportOffset = editorScrollElement?.scrollTop || 0;
  commentTrack.style.transform = `translateY(${-viewportOffset}px)`;
}

function scheduleCommentLayout() {
  if (Date.now() < state.suppressCommentLayoutUntil) return;
  if (pendingCommentLayout) return;
  pendingCommentLayout = window.requestAnimationFrame(() => {
    pendingCommentLayout = 0;
    if (Date.now() < state.suppressCommentLayoutUntil) return;
    syncCommentLayoutWithEditor();
  });
}

function suppressCommentLayout(duration = 320) {
  state.suppressCommentLayoutUntil = Date.now() + duration;
}

function clearCommentAnchorsAndConnectors() {
  editorRoot.querySelectorAll(".has-comment-anchor, .is-active-comment-anchor").forEach((node) => {
    node.classList.remove("has-comment-anchor", "is-active-comment-anchor");
  });
  if (commentConnectorLayer) {
    commentConnectorLayer.innerHTML = "";
  }
}

function appendCommentAnchorHighlight(stageRect, nodeRect, active = false) {
  if (!commentConnectorLayer) return null;
  if (!stageRect || !nodeRect) return null;
  const highlight = document.createElement("div");
  highlight.className = `comment-anchor-highlight${active ? " is-active" : ""}`;
  const left = Math.max(nodeRect.left - stageRect.left - 8, 0);
  const top = Math.max(nodeRect.top - stageRect.top - 3, 0);
  const width = Math.max(nodeRect.width + 16, 16);
  const height = Math.max(nodeRect.height + 6, 16);
  highlight.style.left = `${left}px`;
  highlight.style.top = `${top}px`;
  highlight.style.width = `${width}px`;
  highlight.style.height = `${height}px`;

  if (active) {
    const dot = document.createElement("div");
    dot.className = "comment-anchor-highlight-dot";
    highlight.appendChild(dot);
  }

  commentConnectorLayer.appendChild(highlight);
  return {
    left,
    top,
    width,
    height,
    centerY: top + height / 2,
    endX: left + width,
  };
}

function buildRectBounds(rects) {
  if (!Array.isArray(rects) || !rects.length) return null;
  return {
    left: Math.min(...rects.map((rect) => rect.left)),
    top: Math.min(...rects.map((rect) => rect.top)),
    width: Math.max(...rects.map((rect) => rect.right)) - Math.min(...rects.map((rect) => rect.left)),
    height: Math.max(...rects.map((rect) => rect.bottom)) - Math.min(...rects.map((rect) => rect.top)),
  };
}

function isRectVisibleInViewport(rect, viewportRect) {
  if (!rect || !viewportRect) return false;
  return rect.bottom >= viewportRect.top && rect.top <= viewportRect.bottom;
}

function getRenderedTextRectsForAnchor(node, anchor) {
  if (!(node instanceof HTMLElement)) return [];
  const target = String(anchor?.selectedText || "").replace(/\s+/g, " ").trim();
  if (!target) return [];
  const beforeHint = String(anchor?.contextBefore || "").replace(/\s+/g, " ").trim();
  const afterHint = String(anchor?.contextAfter || "").replace(/\s+/g, " ").trim();
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      return textNode.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const textNodes = [];
  let fullText = "";
  let textNode;
  while ((textNode = walker.nextNode())) {
    const raw = textNode.textContent || "";
    const normalized = raw.replace(/\s+/g, " ");
    textNodes.push({
      node: textNode,
      raw,
      normalized,
      start: fullText.length,
      end: fullText.length + normalized.length,
    });
    fullText += normalized;
  }

  const matchIndexes = [];
  let searchIndex = fullText.indexOf(target);
  while (searchIndex >= 0) {
    matchIndexes.push(searchIndex);
    searchIndex = fullText.indexOf(target, searchIndex + Math.max(target.length, 1));
  }
  if (!matchIndexes.length) return [];
  let matchIndex = null;
  if (typeof anchor?.selectionOccurrence === "number" && matchIndexes[anchor.selectionOccurrence] !== undefined) {
    matchIndex = matchIndexes[anchor.selectionOccurrence];
  }
  if (typeof matchIndex !== "number") {
    const matchMeta = findBestTextMatchMeta(
      fullText,
      target,
      beforeHint,
      afterHint,
      typeof anchor?.selectionIndexInBlock === "number" ? anchor.selectionIndexInBlock : null
    );
    matchIndex = matchMeta?.index;
  }
  if (typeof matchIndex !== "number") return [];
  const matchEnd = matchIndex + target.length;
  const startSegment = textNodes.find((segment) => matchIndex >= segment.start && matchIndex < segment.end);
  const endSegment = textNodes.find((segment) => matchEnd > segment.start && matchEnd <= segment.end) || startSegment;
  if (!startSegment || !endSegment) return [];

  const startOffset = Math.max(matchIndex - startSegment.start, 0);
  const endOffset = Math.max(matchEnd - endSegment.start, 0);
  const range = document.createRange();
  range.setStart(startSegment.node, Math.min(startOffset, startSegment.node.textContent?.length || 0));
  range.setEnd(endSegment.node, Math.min(endOffset, endSegment.node.textContent?.length || 0));
  return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
}

function findRenderedMetricForAnchor(renderedBlocks, markdownBlocks, anchor) {
  if (!Array.isArray(renderedBlocks) || !renderedBlocks.length) return null;
  const normalizedTarget = String(anchor?.selectedText || "").replace(/\s+/g, " ").trim();
  const normalizedBefore = String(anchor?.contextBefore || "").replace(/\s+/g, " ").trim();
  const normalizedAfter = String(anchor?.contextAfter || "").replace(/\s+/g, " ").trim();
  const normalizedBlockText = normalizeBlockDisplayText(anchor?.blockText || "");
  const fallbackIndex = markdownBlocks?.length
    ? findBlockIndexForLine(markdownBlocks, Number(anchor?.lineStart || 1))
    : 0;

  const scoreRenderedBlockCandidate = (metric, index) => {
    const text = String(metric?.node?.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;
    const distance = Math.abs(index - fallbackIndex);
    const blockTextScore = normalizedBlockText
      ? (text === normalizedBlockText ? 16 : (text.includes(normalizedBlockText) || normalizedBlockText.includes(text) ? 10 : 0))
      : 0;
    if (!normalizedTarget) {
      return { metric, index, distance, textLength: text.length, contextScore: 0, blockTextScore };
    }
    if (!text.includes(normalizedTarget)) return null;
    const hitIndex = text.indexOf(normalizedTarget);
    const beforeSlice = text.slice(Math.max(0, hitIndex - normalizedBefore.length - 24), hitIndex);
    const afterSlice = text.slice(hitIndex + normalizedTarget.length, hitIndex + normalizedTarget.length + normalizedAfter.length + 24);
    let contextScore = 0;
    if (normalizedBefore) {
      contextScore += beforeSlice.includes(normalizedBefore) ? 6 : 0;
      if (beforeSlice.endsWith(normalizedBefore)) contextScore += 4;
    }
    if (normalizedAfter) {
      contextScore += afterSlice.includes(normalizedAfter) ? 6 : 0;
      if (afterSlice.startsWith(normalizedAfter)) contextScore += 4;
    }
    return { metric, index, distance, textLength: text.length, contextScore, blockTextScore };
  };

  const sortRenderedMetricCandidates = (left, right) => {
    if (left.blockTextScore !== right.blockTextScore) return right.blockTextScore - left.blockTextScore;
    if (left.contextScore !== right.contextScore) return right.contextScore - left.contextScore;
    if (left.distance !== right.distance) return left.distance - right.distance;
    return left.textLength - right.textLength;
  };

  if (typeof anchor?.blockIndex === "number") {
    const exactBlockMatches = renderedBlocks
      .map((metric, index) => ({ metric, index }))
      .filter(({ index }) => Math.abs(index - anchor.blockIndex) <= 1)
      .map(({ metric, index }) => scoreRenderedBlockCandidate(metric, index))
      .filter(Boolean)
      .sort(sortRenderedMetricCandidates);
    if (exactBlockMatches[0]?.metric) return exactBlockMatches[0].metric;
  }

  if (!normalizedTarget) {
    return renderedBlocks[Math.min(fallbackIndex, renderedBlocks.length - 1)] || null;
  }

  const localWindowMatches = renderedBlocks
    .map((metric, index) => ({ metric, index }))
    .filter(({ index }) => Math.abs(index - fallbackIndex) <= 2)
    .map(({ metric, index }) => scoreRenderedBlockCandidate(metric, index))
    .filter(Boolean)
    .sort(sortRenderedMetricCandidates);
  if (localWindowMatches[0]?.metric) return localWindowMatches[0].metric;

  const matches = renderedBlocks
    .map((metric, index) => scoreRenderedBlockCandidate(metric, index))
    .filter(Boolean)
    .sort(sortRenderedMetricCandidates);

  if (matches[0]?.metric) return matches[0].metric;

  const buildBigrams = (text) => {
    const normalized = String(text || "").replace(/\s+/g, "");
    if (normalized.length < 2) return [];
    const grams = [];
    for (let index = 0; index < normalized.length - 1; index += 1) {
      grams.push(normalized.slice(index, index + 2));
    }
    return grams;
  };
  const targetBigrams = buildBigrams(normalizedTarget);
  if (targetBigrams.length) {
    const fuzzyMatches = renderedBlocks
      .map((metric, index) => {
        const text = String(metric.node?.textContent || "").replace(/\s+/g, " ").trim();
        const candidateBigrams = buildBigrams(text);
        if (!candidateBigrams.length) return null;
        const candidateCounts = new Map();
        for (const gram of candidateBigrams) {
          candidateCounts.set(gram, (candidateCounts.get(gram) || 0) + 1);
        }
        let overlap = 0;
        for (const gram of targetBigrams) {
          const count = candidateCounts.get(gram) || 0;
          if (count > 0) {
            overlap += 1;
            candidateCounts.set(gram, count - 1);
          }
        }
        const score = (overlap * 2) / (targetBigrams.length + candidateBigrams.length);
        if (score < 0.12) return null;
        return { metric, index, distance: Math.abs(index - fallbackIndex), score };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (Math.abs(left.score - right.score) > 0.03) return right.score - left.score;
        return left.distance - right.distance;
      });
    if (fuzzyMatches[0]?.metric) return fuzzyMatches[0].metric;
  }

  return renderedBlocks[Math.min(fallbackIndex, renderedBlocks.length - 1)] || null;
}

function appendCommentConnector(stageRect, startX, startY, endX, endY, active = false) {
  if (!commentConnectorLayer) return;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 8) return;
  const line = document.createElement("div");
  line.className = `comment-connector${active ? " is-active" : ""}`;
  line.style.width = `${length}px`;
  line.style.left = `${startX}px`;
  line.style.top = `${startY}px`;
  line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  commentConnectorLayer.appendChild(line);
}

function syncCommentLayoutWithEditor() {
  const commentTrack = commentList.querySelector(".comment-track");
  clearCommentAnchorsAndConnectors();
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
  const sourceScrollHeight = source?.scrollHeight || baseHeight;
  const viewportOffset = source?.scrollTop || 0;
  const gap = 12;
  const usingRenderedBlocks = renderedBlocks.length > 0 && markdownBlocks.length > 0;
  let maxTrackBottom = commentList.clientHeight;
  const stageRect = document.querySelector(".review-stage")?.getBoundingClientRect() || null;
  const sourceRect = source?.getBoundingClientRect() || null;
  const commentListRect = commentList.getBoundingClientRect();
  const commentViewportHeight = commentList.clientHeight;
  const overflowBuffer = 48;
  const maxCardHeight = Math.max(220, commentViewportHeight - 20);
  commentTrack.style.transform = `translateY(${-viewportOffset}px)`;

  const layoutItems = [];
  for (const card of cards) {
    card.style.setProperty("--thread-card-max-height", `${maxCardHeight}px`);
    const lineStart = Number(card.dataset.lineStart || "1");
    const threadId = card.dataset.threadId || "";
    const thread = state.comments.find((item) => item.id === threadId) || null;
    let desiredTop;
    let metric = null;
    if (usingRenderedBlocks) {
      metric = findRenderedMetricForAnchor(renderedBlocks, markdownBlocks, thread?.anchor || {
        lineStart,
        selectedText: "",
      });
      desiredTop = metric ? metric.top : 0;
    } else {
      const ratio = markdownLines <= 1 ? 0 : (lineStart - 1) / (markdownLines - 1);
      desiredTop = ratio * Math.max(baseHeight - card.offsetHeight, 0);
    }
    layoutItems.push({
      card,
      lineStart,
      threadId,
      thread,
      metric,
      desiredTop: Math.max(desiredTop, 0),
      rawViewportTop: desiredTop - viewportOffset,
      height: card.offsetHeight,
    });
  }

  layoutItems.sort((left, right) => {
    if (left.desiredTop !== right.desiredTop) return left.desiredTop - right.desiredTop;
    return left.lineStart - right.lineStart;
  });
  const topByThreadId = new Map();
  let cursorBottom = 0;
  for (const item of layoutItems) {
    const top = Math.max(item.desiredTop, cursorBottom);
    topByThreadId.set(item.threadId, top);
    cursorBottom = top + item.height + gap;
  }

  for (const item of layoutItems) {
    const { card, threadId, thread, metric } = item;
    const top = Math.max(topByThreadId.get(threadId) ?? item.desiredTop, 0);
    const viewportTop = top - viewportOffset;
    const rawBottom = viewportTop + item.height;
    const isVisible = rawBottom > -overflowBuffer && viewportTop < commentViewportHeight + overflowBuffer;
    card.classList.toggle("is-offscreen", !isVisible);
    card.style.top = `${top}px`;
    maxTrackBottom = Math.max(maxTrackBottom, top + item.height + gap);

    if (metric?.node instanceof HTMLElement) {
      const isActive = threadId && threadId === state.activeCommentId;
      const preciseRects = getRenderedTextRectsForAnchor(metric.node, thread?.anchor);
      const preciseBounds = buildRectBounds(preciseRects);

      if (isActive && !preciseBounds) {
        metric.node.classList.add("is-active-comment-anchor");
      }

      if (stageRect && sourceRect) {
        const nodeRect = metric.node.getBoundingClientRect();
        const preferredRect = preciseBounds || nodeRect;
        const isAnchorVisible = isRectVisibleInViewport({
          top: preferredRect.top,
          bottom: preferredRect.top + preferredRect.height,
        }, sourceRect);
        const cardViewportTop = viewportTop + commentListRect.top - stageRect.top;
        const cardViewportBottom = cardViewportTop + card.offsetHeight;
        const isCardVisible = cardViewportBottom >= commentListRect.top - stageRect.top
          && cardViewportTop <= commentListRect.bottom - stageRect.top;
        if (!isCardVisible || !isAnchorVisible) {
          continue;
        }
        const overlayMetric = appendCommentAnchorHighlight(stageRect, preferredRect, isActive);
        const anchorY = overlayMetric
          ? overlayMetric.centerY
          : metric.top - (source?.scrollTop || 0) + sourceRect.top - stageRect.top + metric.height / 2;
        const cardY = cardViewportTop + Math.min(card.offsetHeight * 0.5, 28);
        const startX = overlayMetric ? overlayMetric.endX - 2 : (nodeRect.right - stageRect.left + 2);
        const endX = commentListRect.left - stageRect.left + 6;
        appendCommentConnector(stageRect, startX, anchorY, endX, cardY, isActive);
      }
    }
  }

  commentTrack.style.height = `${Math.max(commentList.clientHeight, sourceScrollHeight, maxTrackBottom)}px`;
}

function focusEditorWithoutScroll() {
  const windowX = window.scrollX;
  const windowY = window.scrollY;
  const editorScrollTop = editorScrollElement?.scrollTop ?? null;
  const editorScrollLeft = editorScrollElement?.scrollLeft ?? null;
  const focusTarget = editorRoot.querySelector(".toastui-editor-ww-container .ProseMirror")
    || editorRoot.querySelector(".toastui-editor-md-container .cm-content")
    || editorRoot.querySelector(".toastui-editor-md-container textarea");

  if (focusTarget instanceof HTMLElement) {
    try {
      focusTarget.focus({ preventScroll: true });
    } catch {
      focusTarget.focus();
    }
  }

  if (editorScrollElement && editorScrollTop !== null) {
    editorScrollElement.scrollTop = editorScrollTop;
    if (editorScrollLeft !== null) {
      editorScrollElement.scrollLeft = editorScrollLeft;
    }
  }
  if (window.scrollX !== windowX || window.scrollY !== windowY) {
    window.scrollTo(windowX, windowY);
  }
}

function updateActiveCommentCards() {
  const cards = [...commentList.querySelectorAll(".thread-card")];
  for (const card of cards) {
    card.classList.toggle("active", card.dataset.threadId === state.activeCommentId);
  }
}

function setEditorSelectionFromMarkdownRange(mdStart, mdEnd = mdStart) {
  ensureEditor();
  const [toastStart, toastEnd] = internalMdRangeToToast(mdStart, mdEnd);
  if (editorInstance.isMarkdownMode()) {
    editorInstance.setSelection(toastStart, toastEnd);
    return;
  }
  const converted = normalizeWysiwygRange(
    editorInstance.convertPosToMatchEditorMode(toastStart, toastEnd, "wysiwyg")
  );
  editorInstance.setSelection(converted[0], converted[1]);
}

function insertInlineCodeFromToolbar() {
  const range = getCurrentSelectionMarkdownRange();
  if (!range) return false;
  const current = getMarkdownContent();
  const start = markdownPosToOffset(current, range[0]);
  const end = markdownPosToOffset(current, range[1]);
  const safeStart = Math.min(start, end);
  const safeEnd = Math.max(start, end);
  const selectedText = current.slice(safeStart, safeEnd);

  if (safeStart !== safeEnd) return false;

  const nextContent = `${current.slice(0, safeStart)}\`\`${current.slice(safeEnd)}`;
  setMarkdownContent(nextContent);
  const cursorPos = offsetToMarkdownPos(nextContent, safeStart + 1);
  setEditorSelectionFromMarkdownRange(cursorPos, cursorPos);
  focusEditorWithoutScroll();
  setStatus("已插入行内代码标记。");
  return true;
}

function focusVisibleToolbarPopup() {
  const popup = [...document.querySelectorAll(".toastui-editor-popup")]
    .find((node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
  if (!(popup instanceof HTMLElement)) return;
  const input = popup.querySelector("input, textarea, button");
  if (input instanceof HTMLElement) {
    window.setTimeout(() => input.focus(), 0);
  }
}

function attachEditorToolbarEnhancements() {
  if (toolbarEnhancementsAttached) return;
  const toolbar = editorRoot.querySelector(".toastui-editor-defaultUI-toolbar");
  if (!(toolbar instanceof HTMLElement)) return;

  toolbar.addEventListener("click", (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const aria = button.getAttribute("aria-label") || "";
    if (aria === "Inline code") {
      if (insertInlineCodeFromToolbar()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (aria === "Insert table" || aria === "Insert link") {
      window.setTimeout(() => {
        focusVisibleToolbarPopup();
      }, 0);
      setStatus(aria === "Insert table" ? "已打开插入表格面板。" : "已打开插入链接面板。");
    }
  }, true);

  toolbarEnhancementsAttached = true;
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
      toolbarItems: [
        ["heading", "bold", "italic", "strike"],
        ["hr", "quote"],
        ["ul", "ol", "task"],
        ["table", "link"],
        ["code", "codeblock"],
      ],
      plugins,
      hooks: {
        addImageBlobHook: async (blob, _callback, source) => {
          if (!(blob instanceof Blob)) return false;
          if (source === "paste" || source === "drop" || source === "ui") {
            const extension = (blob.type || "image/png").split("/")[1] || "png";
            const file = blob instanceof File
              ? blob
              : new File([blob], `pasted-image.${extension}`, { type: blob.type || "image/png" });
            try {
              await handleNativePastedImage(file);
            } catch (error) {
              setStatus(`图片插入失败：${error.message}`, true);
            }
            return false;
          }
          return false;
        },
      },
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
      setOutline(getMarkdownContent());
      syncEditorModeInfo();
      autosaveStatus();
      queueMarkdownAutosave();
      scheduleRevisionRender();
      scheduleCommentLayout();
      scheduleRenderedContentRefresh();
    });
    editorInstance.on("focus", () => {
      syncEditorModeInfo();
      scheduleRevisionRender();
      scheduleCommentLayout();
      scheduleRenderedContentRefresh();
    });
    editorInstance.on("blur", () => {
      syncEditorModeInfo();
    });
    editorInstance.on("caretChange", () => {
      syncEditorModeInfo();
      refreshLatestSelectionAnchor();
      scheduleCommentLayout();
      scheduleRenderedContentRefresh();
    });
  }

  editorRoot.addEventListener("click", () => {
    hideEditorContextMenu();
    syncEditorModeInfo();
    refreshLatestSelectionAnchor();
    scheduleCommentLayout();
    scheduleRenderedContentRefresh();
  });
  editorRoot.addEventListener("click", (event) => {
    const image = event.target instanceof HTMLElement ? event.target.closest("img") : null;
    if (!image) {
      state.selectedImagePath = null;
      scheduleRenderedContentRefresh();
      return;
    }
    const rawSrc = image.dataset.reviewAssetOriginal || image.getAttribute("src") || "";
    state.selectedImagePath = resolveAssetPath(rawSrc);
    focusEditorWithoutScroll();
    scheduleRenderedContentRefresh();
  });
  editorRoot.addEventListener("keyup", () => {
    syncEditorModeInfo();
    refreshLatestSelectionAnchor();
    scheduleCommentLayout();
    scheduleRenderedContentRefresh();
  });
  editorRoot.addEventListener("keydown", (event) => {
    handleEditorDeleteKey(event);
  }, true);
  editorRoot.addEventListener("mouseup", () => {
    syncEditorModeInfo();
    scheduleCommentLayout();
    scheduleRenderedContentRefresh();
  });
  editorRoot.addEventListener("contextmenu", (event) => {
    if (!(event.target instanceof HTMLElement) || !event.target.closest(".toastui-editor-contents")) return;
    event.preventDefault();
    openEditorContextMenu(event);
  });
  editorRoot.addEventListener("paste", async (event) => {
    const items = [...(event.clipboardData?.items || [])];
    const imageItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    event.preventDefault();
    hideEditorContextMenu();
    try {
      await handleNativePastedImage(file);
    } catch (error) {
      setStatus(`图片粘贴失败：${error.message}`, true);
    }
  });
  if (!editorDomObserver) {
    editorDomObserver = new MutationObserver(() => {
      scheduleRenderedContentRefresh();
      scheduleStickyLayoutRefresh();
    });
    editorDomObserver.observe(editorRoot, { childList: true, subtree: true });
  }
  if (!topbarResizeObserver) {
    topbarResizeObserver = new ResizeObserver(() => scheduleStickyLayoutRefresh());
    const topbar = document.querySelector(".topbar");
    if (topbar) topbarResizeObserver.observe(topbar);
  }
  if (!viewModeResizeObserver) {
    viewModeResizeObserver = new ResizeObserver(() => scheduleStickyLayoutRefresh());
    const panel = document.querySelector(".panel-header");
    if (panel) viewModeResizeObserver.observe(panel);
  }
  syncEditorModeInfo();
  attachEditorScrollSync();
  attachEditorToolbarEnhancements();
  scheduleStickyLayoutRefresh();
  scheduleRenderedContentRefresh();
  return editorInstance;
}

function getMarkdownContent() {
  return ensureEditor().getMarkdown();
}

function syncEditorModeInfo() {
  if (!editorInstance) return;
  editorModeInfo.textContent = state.surfaceMode === "markdown" ? "源码" : "文档";
}

function applyLoadedMarkdown(content, options = {}) {
  const { resetRevisionBaseline = true } = options;
  ensureEditor();
  clearMarkdownAutosaveTimer();
  lastRevisionDecorationSignature = "";
  state.suppressEditorEvents = true;
  const nextContent = content || "";
  setOutline(nextContent);
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
    scheduleRenderedContentRefresh();
  });
}

function syncMarkdownDirtyState() {
  state.markdownDirty = getMarkdownContent() !== state.loadedContent;
  if (!state.markdownDirty) {
    state.markdownConflict = false;
    state.remoteContentSnapshot = null;
    clearMarkdownAutosaveTimer();
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
  const renderedSelectionAnchor = buildCurrentAnchorFromRenderedSelection(markdown);
  if (renderedSelectionAnchor) return renderedSelectionAnchor;
  const renderedCaretAnchor = buildCurrentInsertionAnchorFromRenderedCaret(markdown);
  if (renderedCaretAnchor) return renderedCaretAnchor;
  let selectionRange = getCurrentSelectionMarkdownRange();
  if (!selectionRange) return null;

  let anchor = buildAnchorFromMdRange(selectionRange[0], selectionRange[1], markdown, "selection");
  anchor.insertionMdPos = normalizeMdPosition(selectionRange[1]);
  const selectedText = editorInstance.getSelectedText?.();
  if (selectedText) {
    anchor.selectedText = selectedText;
  }
  if (!selectedText && anchor.start === anchor.end) {
    const nodeRange = getCurrentNodeMarkdownRange();
    if (nodeRange) {
      anchor = buildAnchorFromMdRange(nodeRange[0], nodeRange[1], markdown, "block");
      anchor.insertionMdPos = normalizeMdPosition(selectionRange[1]);
    } else {
      anchor = buildLineAnchorFromPos(selectionRange[0], markdown);
      anchor.insertionMdPos = normalizeMdPosition(selectionRange[1]);
    }
  }
  return normalizeAnchor(anchor, markdown);
}

function refreshLatestSelectionAnchor() {
  try {
    latestSelectionAnchor = buildCurrentAnchorFromEditor();
  } catch {
    latestSelectionAnchor = null;
  }
}

function replaceMarkdownRange(mdStart, mdEnd, replacement) {
  const current = getMarkdownContent();
  const start = markdownPosToOffset(current, mdStart);
  const end = markdownPosToOffset(current, mdEnd);
  const safeStart = Math.min(start, end);
  const safeEnd = Math.max(start, end);
  const nextContent = `${current.slice(0, safeStart)}${replacement}${current.slice(safeEnd)}`;
  setMarkdownContent(nextContent);
}

function setMarkdownContent(nextContent, options = {}) {
  const { markDirty = true, resetBaseline = false } = options;
  lastRevisionDecorationSignature = "";
  state.suppressEditorEvents = true;
  editorInstance.setMarkdown(nextContent, false);
  state.suppressEditorEvents = false;
  setOutline(nextContent);
  if (resetBaseline) setRevisionBaseline(nextContent);
  state.markdownDirty = markDirty ? nextContent !== state.loadedContent : false;
  if (!state.markdownDirty) {
    clearMarkdownAutosaveTimer();
  }
  updateMarkdownState();
  attachEditorScrollSync();
  scheduleRevisionRender();
  scheduleCommentLayout();
  scheduleRenderedContentRefresh();
}

function getAnchorInsertionPosition(anchor, markdown) {
  if (Array.isArray(anchor?.insertionMdPos)) {
    return normalizeMdPosition(anchor.insertionMdPos);
  }
  const blocks = parseMarkdownBlocks(markdown);
  const block = blocks.find((item) => item.id === anchor?.blockId)
    || blocks.find((item) => anchor?.lineStart >= item.lineStart && anchor?.lineStart <= item.lineEnd)
    || null;
  if (!block) return anchor?.mdEnd || [0, 0];
  const lines = getLines(markdown);
  return [block.lineEnd - 1, lines[block.lineEnd - 1]?.length || 0];
}

function getImageInsertionPosition(anchor, markdown) {
  const basePos = getAnchorInsertionPosition(anchor, markdown);
  const lines = getLines(markdown);
  const lineIndex = clamp(basePos[0], 0, Math.max(lines.length - 1, 0));
  const line = lines[lineIndex] || "";
  const selectedText = String(anchor?.selectedText || "").trim();

  if (selectedText) return basePos;
  if (!line.trim()) return [lineIndex, 0];

  const nextLine = lineIndex + 1 < lines.length ? lines[lineIndex + 1] : null;
  if (nextLine !== null && !nextLine.trim()) {
    return [lineIndex + 1, 0];
  }

  return [lineIndex, line.length];
}

function getSelectedImageBlock(markdown = getMarkdownContent()) {
  if (!state.selectedImagePath) return null;
  return parseMarkdownBlocks(markdown).find((block) => block.type === "image" && block.assetPath === state.selectedImagePath) || null;
}

function collectImageAssetPaths(markdown) {
  return new Set(
    parseMarkdownBlocks(markdown)
      .filter((block) => block.type === "image" && block.assetPath)
      .map((block) => block.assetPath)
  );
}

async function reconcileKeyboardDeletedImages(markdownBefore, markdownAfter) {
  if (state.isReconcilingKeyboardImageDeletion || !state.path) return false;
  if (markdownBefore === markdownAfter) return false;

  const previousAssets = collectImageAssetPaths(markdownBefore);
  const nextAssets = collectImageAssetPaths(markdownAfter);
  const removedAssetPaths = [...previousAssets].filter((assetPath) => !nextAssets.has(assetPath));
  if (!removedAssetPaths.length) return false;

  state.isReconcilingKeyboardImageDeletion = true;
  try {
    setStatus(`正在同步删除 ${removedAssetPaths.length} 张图片资源...`);
    const data = await apiPost("/api/file", {
      path: filePathInput.value.trim(),
      content: markdownAfter,
    });
    state.loadedContent = markdownAfter;
    state.remoteContentSnapshot = null;
    state.markdownDirty = false;
    state.markdownConflict = false;
    fileInfo.textContent = data.path;
    syncUrlWithPath(data.path);
    updateMarkdownState();

    let latestResources = null;
    let deletedCount = 0;
    let undoOperation = null;
    for (const assetPath of removedAssetPaths) {
      try {
        const deleted = await apiPost("/api/asset-delete", {
          path: state.path,
          assetPath,
        });
        latestResources = deleted.resources || latestResources;
        deletedCount += 1;
        if (removedAssetPaths.length === 1) {
          undoOperation = {
            assetPath,
            trashToken: deleted.trashToken,
            markdownBefore,
            markdownAfter,
          };
        }
      } catch (error) {
        setStatus(`图片资源 ${assetPath} 未能自动删除：${error.message}`, true);
      }
    }

    if (undoOperation) {
      state.imageDeleteUndoStack.push(undoOperation);
    }
    state.selectedImagePath = null;
    if (latestResources) {
      setResources(latestResources);
    } else {
      const refreshed = await apiGet(`/api/file?path=${encodeURIComponent(state.path)}`);
      setResources(refreshed.resources || null);
    }
    scheduleRenderedContentRefresh();
    if (deletedCount > 0) {
      setStatus(
        deletedCount === 1
          ? "已同步删除图片及资源。按 Ctrl+Z 可恢复。"
          : `已同步删除 ${deletedCount} 张图片资源。`
      );
      return true;
    }
    setStatus("图片已从正文移除，但资源未发生变化。");
    return false;
  } finally {
    state.isReconcilingKeyboardImageDeletion = false;
  }
}

function scheduleKeyboardImageDeletionCheck(markdownBefore) {
  if (state.pendingKeyboardImageDeletionCheck) {
    window.clearTimeout(state.pendingKeyboardImageDeletionCheck);
  }
  state.pendingKeyboardImageDeletionCheck = window.setTimeout(() => {
    state.pendingKeyboardImageDeletionCheck = 0;
    const markdownAfter = getMarkdownContent();
    reconcileKeyboardDeletedImages(markdownBefore, markdownAfter).catch((error) => {
      setStatus(`同步图片删除失败：${error.message}`, true);
    });
  }, 0);
}

function buildBlockRemovalRange(block, markdown) {
  const lines = getLines(markdown);
  let startLine = Math.max(0, block.lineStart - 1);
  let endLine = Math.max(startLine, block.lineEnd - 1);
  if (endLine + 1 < lines.length && !lines[endLine + 1].trim()) {
    endLine += 1;
  } else if (startLine > 0 && !lines[startLine - 1].trim()) {
    startLine -= 1;
  }
  return {
    mdStart: [startLine, 0],
    mdEnd: [endLine, lines[endLine]?.length || 0],
  };
}

function buildImageInsertionText(assetRelativePath, fileName) {
  const alt = getAssetAltText(fileName);
  const reference = getRelativeAssetReference(assetRelativePath);
  return `![${alt}](${reference})`;
}

function insertBlockSnippetAtPosition(markdown, insertPos, snippet) {
  const insertOffset = markdownPosToOffset(markdown, insertPos);
  const before = markdown.slice(0, insertOffset);
  const after = markdown.slice(insertOffset);
  const beforeCore = before.replace(/(?:[ \t]*\n)+$/u, "");
  const afterCore = after.replace(/^(?:\n[ \t]*)+/u, "");
  const prefix = beforeCore ? `${beforeCore}\n\n` : "";
  const suffix = afterCore ? `\n\n${afterCore}` : "\n";
  const nextContent = `${prefix}${snippet}${suffix}`;
  const snippetOffset = nextContent.indexOf(snippet);
  return {
    content: nextContent,
    mdStart: offsetToMarkdownPos(nextContent, snippetOffset),
    mdEnd: offsetToMarkdownPos(nextContent, snippetOffset + snippet.length),
  };
}

function insertImageSnippetAtPosition(markdown, insertPos, snippet) {
  return insertBlockSnippetAtPosition(markdown, insertPos, snippet);
}

function buildFormulaInsertionText(latex) {
  const body = String(latex || "").trim();
  return `$$\n${body}\n$$`;
}

function findDisplayFormulaBlocks(markdown) {
  const lines = getLines(markdown);
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] || "").trim();
    if (line !== "$$" && line !== "\\[") continue;
    const closing = line === "$$" ? "$$" : "\\]";
    let endIndex = -1;
    for (let probe = index + 1; probe < lines.length; probe += 1) {
      if ((lines[probe] || "").trim() === closing) {
        endIndex = probe;
        break;
      }
    }
    if (endIndex < 0) continue;
    const latex = lines.slice(index + 1, endIndex).join("\n").trim();
    blocks.push({
      opening: line,
      closing,
      latex,
      lineStart: index + 1,
      lineEnd: endIndex + 1,
      mdStart: [index, 0],
      mdEnd: [endIndex, lines[endIndex]?.length || 0],
    });
    index = endIndex;
  }
  return blocks;
}

function findFormulaBlockAtAnchor(anchor, markdown = getMarkdownContent()) {
  if (!anchor) return null;
  const line = Number(anchor.lineStart || (Array.isArray(anchor.mdStart) ? anchor.mdStart[0] + 1 : 1));
  return findDisplayFormulaBlocks(markdown).find((block) => line >= block.lineStart && line <= block.lineEnd) || null;
}

async function insertImageAtAnchor(file, anchor = buildCurrentAnchorFromEditor()) {
  if (!file) return;
  if (state.isInsertingImage) return;
  state.isInsertingImage = true;
  updateImageInsertionButtons();
  const activeAnchor = anchor || buildLineAnchorFromPos([0, 0], getMarkdownContent());
  try {
    setStatus(`正在写入图片资源 ${file.name}...`);
    const dataBase64 = await fileToBase64(file);
    const upload = await apiPost("/api/asset-upload", {
      path: state.path,
      fileName: file.name,
      contentType: file.type,
      dataBase64,
    });
    setResources(upload.resources || null);
    const assetRelativePath = upload.asset?.relativePath;
    if (!assetRelativePath) {
      throw new Error("图片上传成功，但没有拿到资源路径。");
    }
    const markdownBefore = getMarkdownContent();
    const insertPos = getImageInsertionPosition(activeAnchor, markdownBefore);
    const insertionText = buildImageInsertionText(assetRelativePath, file.name);
    const insertionResult = insertImageSnippetAtPosition(markdownBefore, insertPos, insertionText);
    setMarkdownContent(insertionResult.content);
    state.selectedImagePath = assetRelativePath;
    await saveMarkdown();
    const refreshed = await apiGet(`/api/file?path=${encodeURIComponent(state.path)}`);
    setResources(refreshed.resources || null);
    const markdownAfter = getMarkdownContent();
    const insertedAnchor = normalizeAnchor({
      mode: "image",
      assetPath: assetRelativePath,
      selectedText: `[图片] ${getAssetAltText(file.name)}\n${assetRelativePath}`,
      mdStart: insertionResult.mdStart,
      mdEnd: insertionResult.mdEnd,
      insertionMdPos: insertionResult.mdEnd,
    }, markdownAfter);
    focusAnchor(insertedAnchor, { preserveCommentLayout: true, behavior: "auto", keepActiveComment: true });
    setStatus(`已插入图片 ${file.name}，资源已写入 ${assetRelativePath}。`);
  } finally {
    state.isInsertingImage = false;
    updateImageInsertionButtons();
    imageUploadInput.value = "";
  }
}

function promptInsertImage(anchor = null) {
  state.pendingImageAnchor = anchor || buildCurrentAnchorFromEditor();
  imageUploadInput.value = "";
  imageUploadInput.click();
}

function openFormulaDialog(anchor = buildCurrentAnchorFromEditor(), block = null) {
  const activeAnchor = anchor || buildCurrentAnchorFromEditor() || buildLineAnchorFromPos([0, 0], getMarkdownContent());
  const markdown = getMarkdownContent();
  const formulaBlock = block || findFormulaBlockAtAnchor(activeAnchor, markdown);
  state.pendingFormulaAnchor = activeAnchor;
  state.editingFormulaRange = formulaBlock ? {
    mdStart: formulaBlock.mdStart,
    mdEnd: formulaBlock.mdEnd,
  } : null;
  formulaDialogTitle.textContent = formulaBlock ? "编辑公式" : "插入公式";
  formulaDialogHint.textContent = formulaBlock
    ? "正在编辑当前公式块。直接修改 LaTeX 内容，保存后会重新渲染。"
    : "直接输入公式内容，不需要手写 $$。保存后会以块级公式形式插入并渲染。";
  formulaBody.value = formulaBlock?.latex || "";
  formulaDialog.showModal();
  window.setTimeout(() => {
    formulaBody.focus();
    if (formulaBody.value) {
      formulaBody.setSelectionRange(0, formulaBody.value.length);
    }
  }, 0);
}

function openFormulaDialogFromOverlay(overlay) {
  if (!(overlay instanceof HTMLElement)) return;
  const startLine = Number(overlay.dataset.formulaStartLine || "0");
  const endLine = Number(overlay.dataset.formulaEndLine || "0");
  if (!startLine || !endLine) return;
  const markdown = getMarkdownContent();
  const block = findDisplayFormulaBlocks(markdown).find((item) => item.lineStart === startLine && item.lineEnd === endLine);
  if (!block) return;
  openFormulaDialog(buildAnchorFromMdRange(block.mdStart, block.mdEnd, markdown, "block"), block);
}

async function saveFormulaFromDialog() {
  const latex = String(formulaBody.value || "").trim();
  if (!latex) {
    setStatus("公式内容不能为空。", true);
    return false;
  }
  const snippet = buildFormulaInsertionText(latex);
  const markdownBefore = getMarkdownContent();
  let markdownAfter = markdownBefore;
  let targetRange = state.editingFormulaRange;

  if (targetRange?.mdStart && targetRange?.mdEnd) {
    const start = markdownPosToOffset(markdownBefore, targetRange.mdStart);
    const end = markdownPosToOffset(markdownBefore, targetRange.mdEnd);
    markdownAfter = `${markdownBefore.slice(0, start)}${snippet}${markdownBefore.slice(end)}`;
  } else {
    const anchor = state.pendingFormulaAnchor || buildCurrentAnchorFromEditor() || buildLineAnchorFromPos([0, 0], markdownBefore);
    const insertPos = getAnchorInsertionPosition(anchor, markdownBefore);
    markdownAfter = insertBlockSnippetAtPosition(markdownBefore, insertPos, snippet).content;
    targetRange = (() => {
      const offset = markdownAfter.indexOf(snippet);
      return offset >= 0 ? {
        mdStart: offsetToMarkdownPos(markdownAfter, offset),
        mdEnd: offsetToMarkdownPos(markdownAfter, offset + snippet.length),
      } : null;
    })();
  }

  setMarkdownContent(markdownAfter);
  if (targetRange?.mdStart && targetRange?.mdEnd) {
    const anchor = buildAnchorFromMdRange(targetRange.mdStart, targetRange.mdEnd, markdownAfter, "block");
    focusAnchor(anchor, { preserveCommentLayout: true, behavior: "auto", keepActiveComment: true });
  }
  formulaDialog.close();
  state.pendingFormulaAnchor = null;
  state.editingFormulaRange = null;
  setStatus("公式已更新。");
  return true;
}

async function handleNativePastedImage(file) {
  if (!file) return false;
  if (suppressNextPastedImage) return true;
  suppressNextPastedImage = true;
  try {
    await insertImageAtAnchor(file, buildCurrentAnchorFromEditor());
    return true;
  } finally {
    window.setTimeout(() => {
      suppressNextPastedImage = false;
    }, 0);
  }
}

async function deleteSelectedImage() {
  const markdownBefore = getMarkdownContent();
  const block = getSelectedImageBlock(markdownBefore);
  if (!block?.assetPath) return false;
  const { mdStart, mdEnd } = buildBlockRemovalRange(block, markdownBefore);
  const start = markdownPosToOffset(markdownBefore, mdStart);
  const end = markdownPosToOffset(markdownBefore, mdEnd);
  const markdownAfter = `${markdownBefore.slice(0, start)}${markdownBefore.slice(end)}`.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");

  setStatus(`正在删除图片 ${block.assetPath}...`);
  setMarkdownContent(markdownAfter);
  await saveMarkdown();

  try {
    const deleted = await apiPost("/api/asset-delete", {
      path: state.path,
      assetPath: block.assetPath,
    });
    setResources(deleted.resources || null);
    state.imageDeleteUndoStack.push({
      assetPath: block.assetPath,
      trashToken: deleted.trashToken,
      markdownBefore,
      markdownAfter,
    });
    state.selectedImagePath = null;
    scheduleRenderedContentRefresh();
    setStatus("图片已删除。按 Ctrl+Z 可恢复。");
    return true;
  } catch (error) {
    setMarkdownContent(markdownBefore);
    await saveMarkdown();
    setStatus(`图片删除失败：${error.message}`, true);
    return false;
  }
}

async function undoLastImageDeletion() {
  const operation = state.imageDeleteUndoStack.at(-1);
  if (!operation) return false;
  if (getMarkdownContent() !== operation.markdownAfter) return false;

  state.imageDeleteUndoStack.pop();
  setStatus("正在恢复刚删除的图片...");
  await apiPost("/api/asset-restore", {
    path: state.path,
    assetPath: operation.assetPath,
    trashToken: operation.trashToken,
  });
  setMarkdownContent(operation.markdownBefore);
  await saveMarkdown();
  const refreshed = await apiGet(`/api/file?path=${encodeURIComponent(state.path)}`);
  setResources(refreshed.resources || null);
  state.selectedImagePath = operation.assetPath;
  scheduleRenderedContentRefresh();
  setStatus("已撤销图片删除。");
  return true;
}

function canUndoLastImageDeletion() {
  const operation = state.imageDeleteUndoStack.at(-1);
  if (!operation) return false;
  return getMarkdownContent() === operation.markdownAfter;
}

function focusAnchor(anchor, options = {}) {
  const { preserveCommentLayout = false, behavior = "smooth", keepActiveComment = false } = options;
  ensureEditor();
  if (state.viewMode !== "edit") {
    setViewMode("edit");
  }
  if (!keepActiveComment) {
    state.activeCommentId = null;
  }
  state.selectedImagePath = anchor.assetPath || null;
  try {
    setEditorSelectionFromMarkdownRange(anchor.mdStart, anchor.mdEnd);
  } catch {
    editorInstance.changeMode("markdown", true);
    setEditorSelectionFromMarkdownRange(anchor.mdStart, anchor.mdEnd);
  }
  if (preserveCommentLayout) {
    suppressCommentLayout();
  }
  focusEditorWithoutScroll();
  scrollEditorToAnchor(anchor, behavior, 5, false);
  window.requestAnimationFrame(() => {
    scrollEditorToAnchor(anchor, "auto", 5, true);
  });
  syncEditorModeInfo();
  scheduleRenderedContentRefresh();
  if ((anchor.selectedText || "").trim()) {
    setStatus(`已定位到 ${formatLineRange(anchor)}：${anchor.selectedText.slice(0, 48)}`);
  }
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

async function deleteThread(threadId) {
  const thread = state.comments.find((item) => item.id === threadId);
  if (!thread) return;
  const confirmed = window.confirm("确认删除这条批注线程吗？删除后将无法恢复。");
  if (!confirmed) return;
  state.comments = state.comments.filter((item) => item.id !== threadId);
  if (state.activeCommentId === threadId) {
    state.activeCommentId = null;
  }
  if (state.floatingCommentId === threadId) {
    state.floatingCommentId = null;
  }
  renderComments();
  await persistComments("批注线程已删除并自动保存。");
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
  if (notifyBtn) {
    notifyBtn.textContent = state.notificationsEnabled ? "提醒已开启" : "开启提醒";
  }
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
    if (state.markdownDirty && !state.markdownConflict) {
      await saveMarkdown({ auto: true });
    }
    setStatus("正在加载...");
    const path = filePathInput.value.trim() || getPathFromUrl() || "workflow_review.md";
    const data = await apiGet(`/api/file?path=${encodeURIComponent(path)}`);
    state.path = data.path;
    state.absolutePath = data.absolutePath;
    state.layout = loadSavedLayout(data.path);
    applyLayout();
    applyLoadedMarkdown(data.content, { resetRevisionBaseline: false });
    setRevisionBaseline(data.revisionState?.baseline || data.content || "");
    setComments(data.comments.comments || [], data.comments.updatedAt || null, data.content);
    setContextState(data.context || null);
    setReviewState(data.reviewState || null);
    setResources(data.resources || null);
    state.activeCommentId = null;
    state.selectedImagePath = null;
    state.imageDeleteUndoStack = [];
    filePathInput.value = data.path;
    fileInfo.textContent = data.path;
    syncUrlWithPath(data.path);
    pushRecentFile(data.path);
    renderComments();
    renderRecentFilesMenu();
    if (pendingStartupViewMode) {
      setViewMode(pendingStartupViewMode);
      pendingStartupViewMode = null;
    }
    scheduleRevisionRender();
    scheduleRenderedContentRefresh();
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
  if (isUserActivelyEditing()) return;
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
    const remoteResources = data.resources || null;
    const remoteRevisionBaseline = typeof data.revisionState?.baseline === "string"
      ? data.revisionState.baseline
      : state.revisionBaseline;
    const contextChanged = JSON.stringify(remoteContext || {}) !== JSON.stringify({
      content: state.contextContent,
      relativePath: state.contextPath,
      updatedAt: state.contextUpdatedAt,
    });
    const remoteContent = data.content;
    const remoteContentChanged = remoteContent !== state.loadedContent;

    if (remoteContentChanged) {
      if (!state.markdownDirty) {
        applyLoadedMarkdown(remoteContent, { resetRevisionBaseline: false });
        if (remoteRevisionBaseline !== state.revisionBaseline) {
          setRevisionBaseline(remoteRevisionBaseline);
        }
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

    if (!remoteContentChanged && remoteRevisionBaseline !== state.revisionBaseline) {
      setRevisionBaseline(remoteRevisionBaseline);
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

    if (remoteResources) {
      const currentResources = JSON.stringify({
        assetDir: state.assetDir,
        assets: state.resources,
      });
      const nextResources = JSON.stringify(remoteResources);
      if (currentResources !== nextResources) {
        setResources(remoteResources);
      }
    }
  } catch {
  }
}

const autosaveStatus = debounce(() => {
  if (state.markdownDirty) {
    setStatus("内容已变更，正在自动保存...");
  }
}, 120);

function queueMarkdownAutosave() {
  clearMarkdownAutosaveTimer();
  if (!state.markdownDirty || state.markdownConflict) return;
  state.pendingAutosaveTimer = window.setTimeout(() => {
    state.pendingAutosaveTimer = 0;
    saveMarkdown({ auto: true }).catch((error) => {
      setStatus(error.message, true);
    });
  }, MARKDOWN_AUTOSAVE_DELAY);
}

function saveMarkdownOnPageHide() {
  if (!state.markdownDirty || !state.path) return;
  const content = editorInstance ? getMarkdownContent() : state.loadedContent;
  const payload = JSON.stringify({
    path: filePathInput.value.trim(),
    content,
  });
  let delivered = false;
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      delivered = navigator.sendBeacon("/api/file", blob);
    }
  } catch {
  }
  if (!delivered) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/file", false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(payload);
      delivered = xhr.status >= 200 && xhr.status < 300;
    } catch {
    }
  }
  if (delivered) {
    state.loadedContent = content;
    state.remoteContentSnapshot = null;
    state.markdownDirty = false;
    state.markdownConflict = false;
  }
}

async function saveMarkdown(options = {}) {
  const { auto = false } = options;
  clearMarkdownAutosaveTimer();
  if (!state.path) return null;
  if (state.isSavingMarkdown) {
    state.hasQueuedAutosave = true;
    return null;
  }
  try {
    ensureEditor();
    const content = getMarkdownContent();
    if (!state.markdownDirty && content === state.loadedContent) {
      updateMarkdownState();
      return null;
    }
    state.isSavingMarkdown = true;
    setStatus(auto ? "正在自动保存..." : "正在保存 Markdown...");
    const data = await apiPost("/api/file", {
      path: filePathInput.value.trim(),
      content,
    });
    state.loadedContent = content;
    state.remoteContentSnapshot = null;
    state.markdownDirty = false;
    state.markdownConflict = false;
    fileInfo.textContent = data.path;
    syncUrlWithPath(data.path);
    state.markdownDirty = getMarkdownContent() !== state.loadedContent;
    updateMarkdownState();
    if (state.markdownDirty) {
      state.hasQueuedAutosave = true;
      setStatus("已自动保存上一版，正在继续同步最新改动...");
    } else {
      setStatus(auto ? `已自动保存 ${data.path}` : `Markdown 已保存 ${data.path}`);
    }
    return data;
  } catch (error) {
    if (auto && state.markdownDirty) {
      queueMarkdownAutosave();
    }
    setStatus(error.message, true);
    throw error;
  } finally {
    state.isSavingMarkdown = false;
    if (state.hasQueuedAutosave && state.markdownDirty && !state.markdownConflict) {
      state.hasQueuedAutosave = false;
      queueMarkdownAutosave();
    } else {
      state.hasQueuedAutosave = false;
    }
  }
}

async function acceptAllRevisions() {
  try {
    ensureEditor();
    setStatus("正在接受当前修订...");
    const content = getMarkdownContent();
    const data = await apiPost("/api/revision-accept", {
      path: filePathInput.value.trim(),
      content,
    });
    state.loadedContent = content;
    state.remoteContentSnapshot = null;
    state.markdownDirty = false;
    state.markdownConflict = false;
    setRevisionBaseline(data.revisionState?.baseline || content);
    updateMarkdownState();
    setStatus("已接受当前全部修订。后续改动会从这一版继续记录。");
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
    const anchor = pendingCapturedCommentAnchor || latestSelectionAnchor || buildCurrentAnchorFromEditor();
    pendingCapturedCommentAnchor = null;
    if (!anchor) {
      setStatus("当前没有可批注的位置。", true);
      return;
    }
    openCommentDialog(anchor);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function startResize(handle, side, event) {
  if (window.innerWidth <= 760) return;
  if (side === "left" && state.layout.outlineCollapsed) return;
  event.preventDefault();
  handle.classList.add("is-dragging");
  const stageRect = document.querySelector(".review-stage")?.getBoundingClientRect();
  const outlineRect = document.querySelector(".outline-rail")?.getBoundingClientRect();
  if ((side === "left" || side === "right") && !stageRect) return;
  if (side === "vertical" && !outlineRect) return;

  const onMove = (moveEvent) => {
    if (side === "left") {
      state.layout.outlineWidth = clamp(moveEvent.clientX - stageRect.left, 220, 460);
    } else if (side === "right") {
      state.layout.commentWidth = clamp(stageRect.right - moveEvent.clientX, 300, 520);
    } else {
      const headerHeight = document.querySelector(".outline-pane-outline .rail-pane-header")?.offsetHeight || 0;
      const resourceHeaderHeight = document.querySelector(".outline-pane-resources .rail-pane-header")?.offsetHeight || 0;
      const resizerHeight = outlineSectionResizeHandle?.offsetHeight || 8;
      const usableHeight = outlineRect.height - headerHeight - resourceHeaderHeight - resizerHeight;
      if (usableHeight <= 0) return;
      const topOffset = moveEvent.clientY - outlineRect.top - headerHeight;
      state.layout.outlinePaneSize = clamp((topOffset / usableHeight) * 100, 30, 70);
    }
    applyLayout();
    scheduleCommentLayout();
  };

  const onUp = () => {
    handle.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    persistLayout();
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

toggleSidebarBtn?.addEventListener("click", () => {
  state.layout.outlineCollapsed = !state.layout.outlineCollapsed;
  applyLayout();
  persistLayout();
  scheduleCommentLayout();
  scheduleRenderedContentRefresh();
});

function hideEditorContextMenu() {
  editorContextMenu.hidden = true;
}

function openEditorContextMenu(event) {
  if (state.surfaceMode !== "document") return;
  const anchor = buildCurrentAnchorFromEditor();
  if (!anchor) return;
  state.pendingImageAnchor = anchor;
  editorContextMenu.hidden = false;
  const menuWidth = 220;
  const menuHeight = 56;
  editorContextMenu.style.left = `${Math.max(12, Math.min(event.clientX, window.innerWidth - menuWidth - 12))}px`;
  editorContextMenu.style.top = `${Math.max(12, Math.min(event.clientY, window.innerHeight - menuHeight - 12))}px`;
}

function handleEditorDeleteKey(event) {
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
    if (canUndoLastImageDeletion()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      undoLastImageDeletion().catch((error) => {
        setStatus(`撤销图片删除失败：${error.message}`, true);
      });
      return true;
    }
    return false;
  }

  if (!event.ctrlKey && !event.metaKey && (event.key === "Backspace" || event.key === "Delete")) {
    if (state.selectedImagePath) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      deleteSelectedImage().catch((error) => {
        setStatus(`图片删除失败：${error.message}`, true);
      });
      return true;
    }
    if (state.surfaceMode === "document" && !editorInstance?.isMarkdownMode?.()) {
      scheduleKeyboardImageDeletionCheck(getMarkdownContent());
    }
  }

  if (event.key === "Escape") {
    hideEditorContextMenu();
  }
  return false;
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

loadBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleToolbarMenu("open");
});
saveMenuBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleToolbarMenu("save");
});
browseFilesBtn?.addEventListener("click", () => {
  openFileBrowserDialog();
});
clearRecentFilesBtn?.addEventListener("click", () => {
  clearRecentFiles();
  setStatus("已清空最近文件记录。");
});
fileBrowserSearch?.addEventListener("input", () => {
  renderFileBrowserList(fileBrowserSearch.value);
});
fileBrowserDialog?.addEventListener("close", () => {
  if (fileBrowserSearch) {
    fileBrowserSearch.value = "";
  }
});
moreMenuBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleToolbarMenu("more");
});
surfaceDocumentBtn.addEventListener("click", () => {
  hideToolbarMenus();
  setSurfaceMode("document");
  setStatus("已切到文档模式。");
});
surfaceMarkdownBtn.addEventListener("click", () => {
  hideToolbarMenus();
  setSurfaceMode("markdown");
  setStatus("已切到 Markdown 模式。");
});
fontDecreaseBtn?.addEventListener("click", () => {
  hideToolbarMenus();
  applyFontScale(currentFontScale - 0.1);
  setStatus(`已将界面缩放调整到 ${Math.round(currentFontScale * 100)}%。`);
});
fontIncreaseBtn?.addEventListener("click", () => {
  hideToolbarMenus();
  applyFontScale(currentFontScale + 0.1);
  setStatus(`已将界面缩放调整到 ${Math.round(currentFontScale * 100)}%。`);
});
saveMdBtn?.addEventListener("click", async () => {
  hideToolbarMenus();
  await saveMarkdown();
});
insertImageBtn.addEventListener("mousedown", (event) => {
  event.preventDefault();
  state.pendingImageAnchor = buildCurrentAnchorFromEditor();
});
insertImageBtn.addEventListener("click", () => {
  hideToolbarMenus();
  hideEditorContextMenu();
  promptInsertImage(state.pendingImageAnchor || buildCurrentAnchorFromEditor());
});
insertFormulaBtn?.addEventListener("mousedown", (event) => {
  event.preventDefault();
  state.pendingFormulaAnchor = buildCurrentAnchorFromEditor();
});
insertFormulaBtn?.addEventListener("click", () => {
  hideToolbarMenus();
  hideEditorContextMenu();
  openFormulaDialog(state.pendingFormulaAnchor || buildCurrentAnchorFromEditor());
});
addCommentBtn.addEventListener("mousedown", (event) => {
  event.preventDefault();
  pendingCapturedCommentAnchor = buildCurrentAnchorFromEditor();
});
addCommentBtn.addEventListener("click", () => {
  hideToolbarMenus();
  handleAddComment();
});
reloadRemoteBtn.addEventListener("click", () => {
  hideToolbarMenus();
  reloadRemoteMarkdown();
});
editContextBtn.addEventListener("click", () => {
  hideToolbarMenus();
  openContextDialog();
});
exportReflowBtn?.addEventListener("click", () => {
  hideToolbarMenus();
  exportReflowPackage();
});
exportPdfBtn.addEventListener("click", () => {
  hideToolbarMenus();
  exportPdf(false);
});
exportPdfWithCommentsBtn.addEventListener("click", () => {
  hideToolbarMenus();
  exportPdf(true);
});
approveCloseBtn.addEventListener("click", () => {
  hideToolbarMenus();
  completeReviewAndClose();
});
modeEditBtn.addEventListener("click", () => {
  hideToolbarMenus();
  setViewMode("edit");
  setStatus("已切到干净模式。");
});
modeRevisionBtn.addEventListener("click", () => {
  hideToolbarMenus();
  setViewMode("revision");
  setStatus("已切到编辑审阅模式。修订痕迹会叠在当前编辑区上。");
});
acceptRevisionsBtn.addEventListener("click", () => {
  hideToolbarMenus();
  acceptAllRevisions();
});
requestAllBtn?.addEventListener("click", requestAllUnresolved);
copyPendingBtn?.addEventListener("click", copyPendingThreads);
notifyBtn?.addEventListener("click", enableNotifications);
showResolvedBtn.addEventListener("click", () => {
  state.showResolvedThreads = true;
  renderComments();
  setStatus("已展开所有标注，包含已解决线程。");
});
hideResolvedBtn.addEventListener("click", () => {
  state.showResolvedThreads = false;
  if (state.activeCommentId) {
    const thread = state.comments.find((item) => item.id === state.activeCommentId);
    if (thread?.status === "resolved") state.activeCommentId = null;
  }
  renderComments();
  setStatus("已隐藏所有已解决批注。");
});
cleanupAssetsBtn.addEventListener("click", async () => {
  try {
    hideToolbarMenus();
    setStatus("正在清理未引用资源...");
    const data = await apiPost("/api/asset-cleanup", { path: state.path });
    setResources(data.resources || null);
    setStatus(data.removed?.length ? `已清理 ${data.removed.length} 个未引用资源。` : "当前没有未引用资源可清理。");
  } catch (error) {
    setStatus(`资源清理失败：${error.message}`, true);
  }
});
outlineResizeHandle.addEventListener("pointerdown", (event) => startResize(outlineResizeHandle, "left", event));
outlineSectionResizeHandle?.addEventListener("pointerdown", (event) => startResize(outlineSectionResizeHandle, "vertical", event));
commentResizeHandle.addEventListener("pointerdown", (event) => startResize(commentResizeHandle, "right", event));
imageUploadInput.addEventListener("change", async () => {
  const [file] = [...(imageUploadInput.files || [])];
  if (!file) return;
  try {
    await insertImageAtAnchor(file, state.pendingImageAnchor || buildCurrentAnchorFromEditor());
  } catch (error) {
    setStatus(`图片插入失败：${error.message}`, true);
  } finally {
    state.pendingImageAnchor = null;
  }
});

document.addEventListener("compositionstart", () => {
  state.isComposing = true;
  markLocalEditActivity(3000);
}, true);

document.addEventListener("compositionend", () => {
  state.isComposing = false;
  markLocalEditActivity(1800);
}, true);

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (editorRoot.contains(target) || target.closest(".message-body[contenteditable='true']")) {
    markLocalEditActivity(1800);
  }
}, true);
contextInsertImageBtn.addEventListener("click", () => {
  hideEditorContextMenu();
  promptInsertImage(state.pendingImageAnchor);
});
contextInsertFormulaBtn?.addEventListener("click", () => {
  hideEditorContextMenu();
  openFormulaDialog(state.pendingImageAnchor || buildCurrentAnchorFromEditor());
});
contextAddCommentBtn.addEventListener("mousedown", (event) => {
  event.preventDefault();
  pendingCapturedCommentAnchor = state.pendingImageAnchor || buildCurrentAnchorFromEditor();
});
contextAddCommentBtn.addEventListener("click", () => {
  hideEditorContextMenu();
  const anchor = pendingCapturedCommentAnchor || state.pendingImageAnchor || buildCurrentAnchorFromEditor();
  pendingCapturedCommentAnchor = null;
  if (anchor) openCommentDialog(anchor);
});
document.addEventListener("pointerdown", (event) => {
  if (!(event.target instanceof Node) || (!openMenu?.contains(event.target) && !loadBtn?.contains(event.target) && !saveMenu?.contains(event.target) && !saveMenuBtn?.contains(event.target) && !moreMenu?.contains(event.target) && !moreMenuBtn?.contains(event.target))) {
    hideToolbarMenus();
  }
  if (!(event.target instanceof Node) || !editorContextMenu.contains(event.target)) {
    hideEditorContextMenu();
  }
}, true);
window.addEventListener("scroll", () => {
  scheduleStickyLayoutRefresh();
  hideToolbarMenus();
  hideEditorContextMenu();
}, true);
window.addEventListener("resize", () => {
  hideToolbarMenus();
  hideEditorContextMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (state.floatingCommentId) {
      closeFloatingComment();
      return;
    }
    hideToolbarMenus();
  }
  handleEditorDeleteKey(event);
}, true);
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveMarkdownOnPageHide();
  }
});
window.addEventListener("pagehide", () => {
  saveMarkdownOnPageHide();
});
window.addEventListener("beforeunload", () => {
  saveMarkdownOnPageHide();
});
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const node = selection.getRangeAt(0).commonAncestorContainer;
  if (!(node instanceof Node) || !editorRoot.contains(node)) return;
  refreshLatestSelectionAnchor();
});
formulaDialog?.addEventListener("close", () => {
  state.pendingFormulaAnchor = null;
  state.editingFormulaRange = null;
});
confirmFormulaBtn?.addEventListener("click", async (event) => {
  event.preventDefault();
  await saveFormulaFromDialog();
});
mathOverlayLayer = ensureMathOverlayLayer();
mathOverlayLayer?.addEventListener("click", (event) => {
  const overlay = event.target instanceof HTMLElement ? event.target.closest(".math-overlay.is-display") : null;
  if (!overlay) return;
  event.preventDefault();
  event.stopPropagation();
  openFormulaDialogFromOverlay(overlay);
});
floatingCommentOverlay?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target === floatingCommentOverlay || target.dataset.closeFloatingComment === "true" || target.closest("[data-close-floating-comment='true']")) {
    closeFloatingComment();
  }
});

const initialPath = getPathFromUrl();
if (initialPath) {
  filePathInput.value = initialPath;
}
pendingStartupViewMode = getStartupViewModeFromUrl();
pendingStartupPdfExport = getStartupPdfExportOptionsFromUrl();
state.layout = loadSavedLayout(initialPath || state.path);
applyLayout();
applyFontScale(loadFontScale(), { skipPersist: true });
updateContextState();
renderOutline();
renderResources();
updateImageInsertionButtons();

try {
  ensureEditor();
  updateSurfaceModeButtons();
  setViewMode(pendingStartupViewMode || "edit");
  setSurfaceMode("document");
  loadFile();
  refreshTimer = window.setInterval(refreshCommentsFromServer, 2000);
} catch (error) {
  showEditorBootError(error);
  console.error(error);
}

window.addEventListener("resize", scheduleCommentLayout);
window.addEventListener("resize", scheduleStickyLayoutRefresh);
window.addEventListener("afterprint", cleanupPdfExport);
window.__reviewAppExports = {
  preparePdfExport,
  cleanupPdfExport,
  getCurrentAnchor: () => buildCurrentAnchorFromEditor(),
  getLatestSelectionAnchor: () => latestSelectionAnchor,
};
