from __future__ import annotations

import argparse
import base64
import io
import json
import mimetypes
import os
import posixpath
import re
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from portable.reflow_package import PRIMARY_PACKAGE_SUFFIX, build_manifest, iter_bundle_paths, pack_document_bundle

APP_ROOT = Path(__file__).resolve().parent
DEFAULT_WORKSPACE_ROOT = APP_ROOT.parents[1]
WORKSPACE_ROOT = DEFAULT_WORKSPACE_ROOT
STATIC_ROOT = Path(__file__).resolve().parent / "static"
DEFAULT_MD = WORKSPACE_ROOT / "workflow_review.md"
PACKAGE_SYNC_TARGET: Path | None = None
PACKAGE_SYNC_TEMP_ROOT: Path | None = None
PACKAGE_SYNC_MAIN_DOCUMENT: str | None = None
CODEX_EXEC_TIMEOUT_SECONDS = 180
MAX_PROMPT_CHARS = 120_000
ASSISTANT_AUTHOR = "助手"
ASSISTANT_AGENT_LOCK = threading.Lock()
IMAGE_REF_RE = re.compile(r"!\[[^\]]*]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
REMOTE_IMAGE_RE = re.compile(r"^https?://", re.IGNORECASE)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_relative_md(raw_path: str | None) -> Path:
    candidate = (raw_path or DEFAULT_MD.name).strip()
    if not candidate:
        candidate = DEFAULT_MD.name

    path = Path(candidate)
    if path.is_absolute():
        raise ValueError("Only workspace-relative Markdown paths are allowed.")
    if path.suffix.lower() != ".md":
        raise ValueError("Only .md files are supported.")

    resolved = (WORKSPACE_ROOT / path).resolve()
    if WORKSPACE_ROOT not in resolved.parents and resolved != WORKSPACE_ROOT:
        raise ValueError("Path escapes the workspace.")
    return resolved


def _normalize_default_md_path(workspace_root: Path, raw_path: str | None) -> Path:
    candidate = (raw_path or "workflow_review.md").strip() or "workflow_review.md"
    path = Path(candidate)
    if path.is_absolute():
        resolved = path.resolve()
    else:
        resolved = (workspace_root / path).resolve()
    if resolved.suffix.lower() != ".md":
        raise ValueError("Default Markdown file must end with .md.")
    if workspace_root not in resolved.parents and resolved != workspace_root:
        raise ValueError("Default Markdown file must stay inside the workspace.")
    return resolved


def configure_runtime(workspace_root: Path, default_md: Path) -> None:
    global WORKSPACE_ROOT, DEFAULT_MD
    WORKSPACE_ROOT = workspace_root.resolve()
    DEFAULT_MD = default_md.resolve()


def _normalize_workspace_relative_path(raw_path: str | None) -> Path:
    candidate = (raw_path or "").strip()
    if not candidate:
        raise ValueError("Field 'path' is required.")

    path = Path(candidate)
    if path.is_absolute():
        raise ValueError("Only workspace-relative paths are allowed.")

    resolved = (WORKSPACE_ROOT / path).resolve()
    if WORKSPACE_ROOT not in resolved.parents and resolved != WORKSPACE_ROOT:
        raise ValueError("Path escapes the workspace.")
    return resolved


def configure_package_sync(target: Path | None, temp_root: Path | None, main_document: str | None) -> None:
    global PACKAGE_SYNC_TARGET, PACKAGE_SYNC_TEMP_ROOT, PACKAGE_SYNC_MAIN_DOCUMENT
    PACKAGE_SYNC_TARGET = target.resolve() if target else None
    PACKAGE_SYNC_TEMP_ROOT = temp_root.resolve() if temp_root else None
    PACKAGE_SYNC_MAIN_DOCUMENT = (main_document or "").strip() or None


def _sync_package_bundle_if_needed(md_path: Path) -> None:
    if not PACKAGE_SYNC_TARGET or not PACKAGE_SYNC_TEMP_ROOT or not PACKAGE_SYNC_MAIN_DOCUMENT:
        return
    try:
        expected_md = (PACKAGE_SYNC_TEMP_ROOT / PACKAGE_SYNC_MAIN_DOCUMENT).resolve()
        candidate = md_path.resolve()
        if candidate != expected_md:
            return
        pack_document_bundle(candidate, PACKAGE_SYNC_TARGET)
    except Exception as exc:
        print(f"Warning: failed to sync package bundle: {exc}")


def _comments_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".comments.json")


def _assets_dir(md_path: Path) -> Path:
    return md_path.with_suffix(".assets")


def _asset_trash_dir(md_path: Path) -> Path:
    return md_path.with_suffix(".assets.trash")


def _review_state_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".review.json")


def _revision_state_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".revisions.json")


def _context_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".context.md")


def _read_comments(md_path: Path) -> dict:
    comments_path = _comments_path(md_path)
    if not comments_path.exists():
        return {"version": 1, "updatedAt": _utc_now(), "comments": []}
    # Tolerate BOM-prefixed JSON files created by external editors or PowerShell.
    with comments_path.open("r", encoding="utf-8-sig") as handle:
        payload = json.load(handle)
    payload.setdefault("version", 1)
    payload.setdefault("comments", [])
    payload.setdefault("updatedAt", _utc_now())
    return payload


def _read_context(md_path: Path) -> dict:
    context_path = _context_path(md_path)
    if not context_path.exists():
        return {
            "path": str(context_path),
            "relativePath": context_path.relative_to(WORKSPACE_ROOT).as_posix(),
            "updatedAt": None,
            "content": "",
        }
    return {
        "path": str(context_path),
        "relativePath": context_path.relative_to(WORKSPACE_ROOT).as_posix(),
        "updatedAt": datetime.fromtimestamp(context_path.stat().st_mtime, timezone.utc).isoformat(),
        "content": context_path.read_text(encoding="utf-8"),
    }


def _read_review_state(md_path: Path) -> dict:
    review_path = _review_state_path(md_path)
    if not review_path.exists():
        return {
            "version": 1,
            "updatedAt": None,
            "status": "in_review",
            "closedAt": None,
            "closedBy": None,
            "note": None,
            "threadCounts": None,
        }
    with review_path.open("r", encoding="utf-8-sig") as handle:
        payload = json.load(handle)
    payload.setdefault("version", 1)
    payload.setdefault("updatedAt", _utc_now())
    payload.setdefault("status", "in_review")
    payload.setdefault("closedAt", None)
    payload.setdefault("closedBy", None)
    payload.setdefault("note", None)
    payload.setdefault("threadCounts", None)
    return payload


def _read_revision_state(md_path: Path, *, fallback_content: str = "", create_if_missing: bool = False) -> dict:
    revision_path = _revision_state_path(md_path)
    if not revision_path.exists():
        payload = {
            "version": 1,
            "updatedAt": _utc_now(),
            "baseline": fallback_content,
        }
        if create_if_missing:
            _write_json(revision_path, payload)
        return payload
    with revision_path.open("r", encoding="utf-8-sig") as handle:
        payload = json.load(handle)
    payload.setdefault("version", 1)
    payload.setdefault("updatedAt", _utc_now())
    payload.setdefault("baseline", fallback_content)
    return payload


def _write_revision_state(md_path: Path, baseline: str) -> dict:
    payload = {
        "version": 1,
        "updatedAt": _utc_now(),
        "baseline": baseline,
    }
    _write_json(_revision_state_path(md_path), payload)
    return payload


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def _truncate_text(text: str, limit: int = MAX_PROMPT_CHARS) -> str:
    if len(text) <= limit:
        return text
    clipped = text[:limit]
    return f"{clipped}\n\n[文档过长，后续内容已截断，共省略 {len(text) - limit} 个字符]"


def _sanitize_asset_name(file_name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", (file_name or "image").strip()).strip(".-")
    if not cleaned:
        cleaned = "image"
    return cleaned


def _pick_asset_path(md_path: Path, file_name: str) -> Path:
    asset_dir = _assets_dir(md_path)
    asset_dir.mkdir(parents=True, exist_ok=True)
    source = Path(_sanitize_asset_name(file_name))
    stem = source.stem or "image"
    suffix = source.suffix or ".png"
    candidate = asset_dir / f"{stem}{suffix}"
    index = 1
    while candidate.exists():
        candidate = asset_dir / f"{stem}-{index}{suffix}"
        index += 1
    return candidate


def _ensure_doc_asset_path(md_path: Path, asset_relative_path: str) -> Path:
    asset_path = _normalize_workspace_relative_path(asset_relative_path)
    asset_root = _assets_dir(md_path).resolve()
    if asset_path != asset_root and asset_root not in asset_path.parents:
        raise ValueError("Asset path must stay inside the current document asset directory.")
    return asset_path


def _extract_markdown_image_refs(markdown: str, md_path: Path) -> list[dict]:
    doc_dir = md_path.parent
    refs: list[dict] = []
    for line_index, line in enumerate(markdown.splitlines(), start=1):
        for match in IMAGE_REF_RE.finditer(line):
            raw_path = urllib.parse.unquote(match.group(1).strip())
            if not raw_path or re.match(r"^(?:[a-z]+:|//|#)", raw_path, re.IGNORECASE):
                continue
            resolved = (doc_dir / raw_path).resolve() if not raw_path.startswith("/") else (WORKSPACE_ROOT / raw_path.lstrip("/")).resolve()
            if WORKSPACE_ROOT not in resolved.parents and resolved != WORKSPACE_ROOT:
                continue
            refs.append(
                {
                    "rawPath": raw_path,
                    "relativePath": resolved.relative_to(WORKSPACE_ROOT).as_posix(),
                    "line": line_index,
                }
            )
    return refs


def _build_resource_manifest(md_path: Path, markdown: str) -> dict:
    asset_dir = _assets_dir(md_path)
    refs = _extract_markdown_image_refs(markdown, md_path)
    referenced = {}
    for ref in refs:
        bucket = referenced.setdefault(ref["relativePath"], [])
        bucket.append(ref["line"])

    assets = []
    if asset_dir.exists():
        for path in sorted(asset_dir.rglob("*")):
            if not path.is_file():
                continue
            relative_path = path.relative_to(WORKSPACE_ROOT).as_posix()
            line_hits = referenced.get(relative_path, [])
            assets.append(
                {
                    "name": path.name,
                    "relativePath": relative_path,
                    "size": path.stat().st_size,
                    "updatedAt": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
                    "referenced": bool(line_hits),
                    "lineHits": line_hits,
                }
            )

    return {
        "assetDir": asset_dir.relative_to(WORKSPACE_ROOT).as_posix(),
        "assets": assets,
        "referencedPaths": sorted(referenced),
    }


def _guess_remote_image_name(remote_url: str) -> str:
    parsed = urllib.parse.urlparse(remote_url)
    name = Path(urllib.parse.unquote(parsed.path or "")).name
    if not name:
        name = f"remote-image-{uuid.uuid4().hex[:8]}.png"
    if "." not in name:
        name = f"{name}.png"
    return name


def _download_remote_image(remote_url: str, timeout_seconds: int = 20) -> tuple[bytes, str]:
    request = urllib.request.Request(
        remote_url,
        headers={
            "User-Agent": "DocPilot/1.0",
            "Accept": "image/*,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        content_type = response.headers.get("Content-Type", "")
        payload = response.read()
    if not payload:
        raise ValueError("Remote image download returned empty content.")
    if content_type and not content_type.lower().startswith("image/"):
        raise ValueError(f"Remote URL is not an image: {content_type}")
    return payload, content_type


def _localize_remote_images(md_path: Path, markdown: str) -> tuple[str, bool]:
    matches = list(IMAGE_REF_RE.finditer(markdown))
    if not matches:
        return markdown, False

    next_markdown = markdown
    changed = False
    localized_by_url: dict[str, str] = {}

    for match in reversed(matches):
        raw_path = urllib.parse.unquote(match.group(1).strip())
        if not REMOTE_IMAGE_RE.match(raw_path):
            continue
        try:
            relative_asset_path = localized_by_url.get(raw_path)
            if not relative_asset_path:
                binary, _content_type = _download_remote_image(raw_path)
                asset_path = _pick_asset_path(md_path, _guess_remote_image_name(raw_path))
                asset_path.write_bytes(binary)
                relative_asset_path = asset_path.relative_to(md_path.parent).as_posix()
                localized_by_url[raw_path] = relative_asset_path
            replacement = match.group(0).replace(match.group(1), urllib.parse.quote(relative_asset_path), 1)
            next_markdown = f"{next_markdown[:match.start()]}{replacement}{next_markdown[match.end():]}"
            changed = True
        except Exception as exc:
            print(f"Warning: failed to localize remote image '{raw_path}': {exc}")
            continue

    return next_markdown, changed


def _build_package_bytes(md_path: Path) -> bytes:
    buffer = io.BytesIO()
    manifest = build_manifest(md_path.name)
    with ZipFile(buffer, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        for path in iter_bundle_paths(md_path):
            archive.write(path, path.relative_to(md_path.parent).as_posix())
    return buffer.getvalue()


def _build_nearby_resource_context(md_path: Path, markdown: str, thread: dict) -> str:
    refs = _extract_markdown_image_refs(markdown, md_path)
    if not refs:
        return "（当前文档没有 Markdown 图片引用。）"

    anchor = thread.get("anchor") or {}
    line_start = int(anchor.get("lineStart") or 1)
    line_end = int(anchor.get("lineEnd") or line_start)
    nearby = [item for item in refs if item["line"] >= line_start - 5 and item["line"] <= line_end + 5]
    target = nearby or refs[:8]
    return "\n".join(f"- L{item['line']}: {item['relativePath']}" for item in target)


def _thread_to_prompt_block(thread: dict) -> str:
    anchor = thread.get("anchor") or {}
    messages = thread.get("messages") or []
    message_lines = [
        f"- {message.get('author') or '未署名'}[{message.get('role') or 'user'}]: {message.get('body') or ''}"
        for message in messages
    ] or ["- （无消息）"]
    return "\n".join(
        [
            f"线程 ID: {thread.get('id')}",
            f"状态: {'已解决' if thread.get('status') == 'resolved' else '进行中'}",
            f"定位: L{anchor.get('lineStart') or '?'}-L{anchor.get('lineEnd') or anchor.get('lineStart') or '?'}",
            "选中文本:",
            anchor.get("selectedText") or "(空行批注)",
            "上下文前文:",
            anchor.get("contextBefore") or "",
            "上下文后文:",
            anchor.get("contextAfter") or "",
            "线程消息:",
            *message_lines,
        ]
    )


def _build_single_thread_prompt(md_path: Path, markdown: str, context_text: str, thread: dict) -> str:
    relative_md_path = md_path.relative_to(WORKSPACE_ROOT).as_posix()
    context_section = context_text.strip() or "（当前没有单独维护的上下文摘要；请仅依据文档正文与线程内容作答。）"
    resource_manifest = _build_resource_manifest(md_path, markdown)
    assets = resource_manifest["assets"]
    resource_lines = [
        f"- {item['relativePath']} ({item['size']} bytes, {'已引用' if item['referenced'] else '未引用'})"
        for item in assets[:40]
    ] or ["- （当前文档资源目录为空。）"]
    return "\n\n".join(
        [
            "你是 Review App 中被单独唤起处理一个批注线程的智能体。",
            "\n".join(
                [
                    "任务要求：",
                    "1. 只回复当前线程，不要处理其他线程。",
                    f"2. 你可以在必要时直接修改当前 Markdown 文件 `{relative_md_path}` 的正文，但不要修改其他文件。",
                    "2.1 你会看到当前文档资源清单和附近图片路径；如果需要引用现有图片，请直接使用相对路径写 Markdown 图片语法。",
                    "3. 如果用户明确要求“替换原文”“直接改文档”“把这一段改成……”这类操作，请直接完成正文修改。",
                    "4. 输出内容只保留“要写回线程的回复正文”，不要带标题、称呼、签名、JSON、代码块或“助手：”前缀。",
                    "5. 回复使用简体中文，优先给出直接、可执行、贴合上下文的答复。",
                    "6. 如果你修改了正文，在线程回复里明确说明“已直接修改正文”，并概括改了什么。",
                    "7. 如果信息仍不足，请直接指出最关键缺口，并提出一个最小澄清问题。",
                ]
            ),
            f"当前 Markdown 文件: {relative_md_path}",
            "文档级上下文摘要:",
            context_section,
            "当前文档资源清单:",
            "\n".join(resource_lines),
            "当前线程附近的图片引用:",
            _build_nearby_resource_context(md_path, markdown, thread),
            "当前线程信息:",
            _thread_to_prompt_block(thread),
            "当前 Markdown 正文:",
            _truncate_text(markdown),
        ]
    )


def _resolve_codex_command() -> str:
    if os.name == "nt":
        for candidate in ("codex.cmd", "codex.bat", "codex.exe", "codex"):
            resolved = shutil.which(candidate)
            if resolved:
                return resolved
    resolved = shutil.which("codex")
    if resolved:
        return resolved
    raise RuntimeError("Unable to locate `codex` on PATH.")


def _run_codex_exec(prompt: str, md_path: Path) -> str:
    with tempfile.NamedTemporaryFile(prefix="review-app-codex-", suffix=".txt", delete=False) as handle:
        output_path = Path(handle.name)
    command = [
        _resolve_codex_command(),
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--sandbox",
        "workspace-write",
        "--color",
        "never",
        "-C",
        str(md_path.parent),
        "-o",
        str(output_path),
        "-",
    ]
    try:
        completed = subprocess.run(
            command,
            input=prompt,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=CODEX_EXEC_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"Codex 调用超时（>{CODEX_EXEC_TIMEOUT_SECONDS}s）。") from exc

    except OSError as exc:
        raise RuntimeError(f"Codex failed to start: {exc}") from exc

    output_text = output_path.read_text(encoding="utf-8").strip() if output_path.exists() else ""
    if output_path.exists():
        output_path.unlink(missing_ok=True)

    if completed.returncode != 0:
        details = (completed.stderr or completed.stdout or "").strip()
        details = _truncate_text(details, 1200)
        raise RuntimeError(f"Codex 调用失败（exit {completed.returncode}）：{details or '无可用输出'}")

    if output_text:
        return output_text

    stdout = (completed.stdout or "").strip()
    if stdout:
        return stdout.splitlines()[-1].strip()
    raise RuntimeError("Codex 没有返回可写入线程的回复。")


def _append_assistant_reply_to_thread(comments_payload: dict, thread_id: str, reply_text: str) -> dict:
    comments = comments_payload.get("comments") or []
    thread = next((item for item in comments if item.get("id") == thread_id), None)
    if not thread:
        raise ValueError(f"Thread '{thread_id}' was not found.")

    now = _utc_now()
    thread.setdefault("messages", [])
    assistant_request = thread.get("assistantRequest") or {}
    assistant_request.update(
        {
            "requested": False,
            "respondedAt": now,
            "mode": assistant_request.get("mode") or "single",
            "note": "由 Review App 单线程助手自动回复。",
            "lastError": None,
        }
    )
    thread["assistantRequest"] = assistant_request
    thread["messages"].append(
        {
            "id": f"m-{uuid.uuid4()}",
            "author": ASSISTANT_AUTHOR,
            "role": "assistant",
            "body": reply_text.strip(),
            "createdAt": now,
            "updatedAt": now,
        }
    )
    if thread.get("status") == "resolved":
        thread["status"] = "open"
    thread["updatedAt"] = now
    comments_payload["updatedAt"] = now
    return thread


def _mark_thread_request_state(comments_payload: dict, thread_id: str, *, requested: bool, note: str, error_message: str | None = None) -> dict:
    comments = comments_payload.get("comments") or []
    thread = next((item for item in comments if item.get("id") == thread_id), None)
    if not thread:
        raise ValueError(f"Thread '{thread_id}' was not found.")
    assistant_request = thread.get("assistantRequest") or {}
    assistant_request.update(
        {
            "requested": requested,
            "requestedAt": _utc_now() if requested else assistant_request.get("requestedAt"),
            "mode": "single",
            "note": note,
            "lastError": error_message,
        }
    )
    if requested:
        assistant_request["respondedAt"] = None
    thread["assistantRequest"] = assistant_request
    thread["updatedAt"] = _utc_now()
    comments_payload["updatedAt"] = thread["updatedAt"]
    return thread


class ReviewHandler(BaseHTTPRequestHandler):
    server_version = "MarkdownReviewHTTP/0.1"

    def _mark_activity(self) -> None:
        self.server.last_activity_at = time.monotonic()

    def _send_json(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, payload: str, status: int = HTTPStatus.OK) -> None:
        body = payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, status: int = HTTPStatus.OK) -> None:
        data = path.read_bytes()
        content_type, _ = mimetypes.guess_type(str(path))
        self.send_response(status)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_bytes(self, data: bytes, *, content_type: str, file_name: str | None = None, status: int = HTTPStatus.OK) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store, max-age=0")
        if file_name:
            quoted = urllib.parse.quote(file_name)
            self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{quoted}")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _serve_static(self, raw_path: str) -> None:
        clean = raw_path or "/"
        target = posixpath.normpath(clean)
        if target in {".", "/"}:
            target = "index.html"
        else:
            target = target.lstrip("/")

        full_path = (STATIC_ROOT / target).resolve()
        if STATIC_ROOT not in full_path.parents and full_path != STATIC_ROOT:
            self._send_text("Forbidden", HTTPStatus.FORBIDDEN)
            return
        if not full_path.exists() or not full_path.is_file():
            self._send_text("Not Found", HTTPStatus.NOT_FOUND)
            return

        content_type, _ = mimetypes.guess_type(str(full_path))
        data = full_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{content_type or 'application/octet-stream'}; charset=utf-8")
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_body_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("Invalid Content-Length header.") from exc
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("Request body must be valid JSON.") from exc

    def do_GET(self) -> None:
        self._mark_activity()
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/file":
            try:
                md_path = _normalize_relative_md(urllib.parse.parse_qs(parsed.query).get("path", [None])[0])
                if not md_path.exists():
                    md_path.parent.mkdir(parents=True, exist_ok=True)
                    md_path.write_text("", encoding="utf-8")
                content = md_path.read_text(encoding="utf-8")
                comments = _read_comments(md_path)
                context = _read_context(md_path)
                review_state = _read_review_state(md_path)
                revision_state = _read_revision_state(md_path, fallback_content=content, create_if_missing=True)
                resources = _build_resource_manifest(md_path, content)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "path": md_path.relative_to(WORKSPACE_ROOT).as_posix(),
                    "absolutePath": str(md_path),
                    "content": content,
                    "comments": comments,
                    "context": context,
                    "reviewState": review_state,
                    "revisionState": revision_state,
                    "resources": resources,
                }
            )
            return

        if parsed.path == "/api/asset":
            try:
                asset_path = _normalize_workspace_relative_path(urllib.parse.parse_qs(parsed.query).get("path", [None])[0])
                if not asset_path.exists() or not asset_path.is_file():
                    self._send_json({"error": "Asset was not found."}, HTTPStatus.NOT_FOUND)
                    return
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_file(asset_path)
            return

        if parsed.path == "/api/list":
            files = sorted(path.relative_to(WORKSPACE_ROOT).as_posix() for path in WORKSPACE_ROOT.rglob("*.md"))
            self._send_json({"files": files})
            return

        if parsed.path == "/api/package-export":
            try:
                md_path = _normalize_relative_md(urllib.parse.parse_qs(parsed.query).get("path", [None])[0])
                if not md_path.exists():
                    raise ValueError("Markdown file was not found.")
                package_bytes = _build_package_bytes(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_bytes(
                package_bytes,
                content_type="application/octet-stream",
                file_name=f"{md_path.stem}{PRIMARY_PACKAGE_SUFFIX}",
            )
            return

        self._serve_static(parsed.path)

    def do_POST(self) -> None:
        self._mark_activity()
        parsed = urllib.parse.urlparse(self.path)
        try:
            payload = self._read_body_json()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return

        if parsed.path == "/api/file":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                content = payload.get("content")
                if not isinstance(content, str):
                    raise ValueError("Field 'content' must be a string.")
                existing_content = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                md_path.parent.mkdir(parents=True, exist_ok=True)
                md_path.write_text(content, encoding="utf-8")
                if not _revision_state_path(md_path).exists():
                    _write_revision_state(md_path, existing_content)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "path": md_path.relative_to(WORKSPACE_ROOT).as_posix(),
                    "savedAt": _utc_now(),
                }
            )
            return

        if parsed.path == "/api/revision-accept":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                content = payload.get("content")
                if not isinstance(content, str):
                    raise ValueError("Field 'content' must be a string.")
                md_path.parent.mkdir(parents=True, exist_ok=True)
                md_path.write_text(content, encoding="utf-8")
                revision_state = _write_revision_state(md_path, content)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "path": md_path.relative_to(WORKSPACE_ROOT).as_posix(),
                    "savedAt": revision_state["updatedAt"],
                    "revisionState": revision_state,
                }
            )
            return

        if parsed.path == "/api/comments":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                comments = payload.get("comments")
                if not isinstance(comments, list):
                    raise ValueError("Field 'comments' must be a list.")
                comments_payload = {
                    "version": 1,
                    "updatedAt": _utc_now(),
                    "comments": comments,
                }
                _write_json(_comments_path(md_path), comments_payload)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "commentsPath": str(_comments_path(md_path)),
                    "savedAt": _utc_now(),
                }
            )
            return

        if parsed.path == "/api/context":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                content = payload.get("content")
                if not isinstance(content, str):
                    raise ValueError("Field 'content' must be a string.")
                context_path = _context_path(md_path)
                context_path.parent.mkdir(parents=True, exist_ok=True)
                context_path.write_text(content, encoding="utf-8")
                context_payload = _read_context(md_path)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "context": context_payload,
                    "savedAt": context_payload["updatedAt"],
                }
            )
            return

        if parsed.path == "/api/asset-upload":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                file_name = str(payload.get("fileName") or "image.png")
                data_base64 = str(payload.get("dataBase64") or "").strip()
                if not data_base64:
                    raise ValueError("Field 'dataBase64' is required.")
                binary = base64.b64decode(data_base64, validate=True)
                asset_path = _pick_asset_path(md_path, file_name)
                asset_path.write_bytes(binary)
                markdown = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                resources = _build_resource_manifest(md_path, markdown)
                _sync_package_bundle_if_needed(md_path)
            except (ValueError, base64.binascii.Error) as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "asset": {
                        "name": asset_path.name,
                        "relativePath": asset_path.relative_to(WORKSPACE_ROOT).as_posix(),
                    },
                    "resources": resources,
                }
            )
            return

        if parsed.path == "/api/asset-cleanup":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                markdown = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                resources = _build_resource_manifest(md_path, markdown)
                referenced = set(resources["referencedPaths"])
                removed = []
                for item in resources["assets"]:
                    if item["relativePath"] in referenced:
                        continue
                    asset_path = _normalize_workspace_relative_path(item["relativePath"])
                    asset_path.unlink(missing_ok=True)
                    removed.append(item["relativePath"])
                resources = _build_resource_manifest(md_path, markdown)
                if removed:
                    _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json({"ok": True, "removed": removed, "resources": resources})
            return

        if parsed.path == "/api/asset-delete":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                asset_relative_path = str(payload.get("assetPath") or "").strip()
                if not asset_relative_path:
                    raise ValueError("Field 'assetPath' is required.")
                asset_path = _ensure_doc_asset_path(md_path, asset_relative_path)
                if not asset_path.exists() or not asset_path.is_file():
                    raise ValueError("Asset was not found.")
                trash_dir = _asset_trash_dir(md_path)
                trash_dir.mkdir(parents=True, exist_ok=True)
                trash_name = f"{uuid.uuid4()}-{asset_path.name}"
                trash_path = trash_dir / trash_name
                asset_path.replace(trash_path)
                markdown = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                resources = _build_resource_manifest(md_path, markdown)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "deleted": asset_relative_path,
                    "trashToken": trash_name,
                    "resources": resources,
                }
            )
            return

        if parsed.path == "/api/asset-restore":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                asset_relative_path = str(payload.get("assetPath") or "").strip()
                trash_token = str(payload.get("trashToken") or "").strip()
                if not asset_relative_path or not trash_token:
                    raise ValueError("Fields 'assetPath' and 'trashToken' are required.")
                asset_path = _ensure_doc_asset_path(md_path, asset_relative_path)
                trash_path = (_asset_trash_dir(md_path) / Path(trash_token).name).resolve()
                trash_root = _asset_trash_dir(md_path).resolve()
                if trash_path != trash_root and trash_root not in trash_path.parents:
                    raise ValueError("Trash token is invalid.")
                if not trash_path.exists() or not trash_path.is_file():
                    raise ValueError("Deleted asset snapshot was not found.")
                asset_path.parent.mkdir(parents=True, exist_ok=True)
                trash_path.replace(asset_path)
                markdown = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                resources = _build_resource_manifest(md_path, markdown)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "restored": asset_relative_path,
                    "resources": resources,
                }
            )
            return

        if parsed.path == "/api/assistant-reply":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                thread_id = (payload.get("threadId") or "").strip()
                if not thread_id:
                    raise ValueError("Field 'threadId' is required.")

                markdown = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                comments_payload = _read_comments(md_path)
                context_payload = _read_context(md_path)

                _mark_thread_request_state(
                    comments_payload,
                    thread_id,
                    requested=True,
                    note="正在通过 Review App 呼唤单线程智能体。",
                )
                _write_json(_comments_path(md_path), comments_payload)
                _sync_package_bundle_if_needed(md_path)

                thread = next((item for item in comments_payload["comments"] if item.get("id") == thread_id), None)
                if not thread:
                    raise ValueError(f"Thread '{thread_id}' was not found.")

                markdown_before = markdown
                prompt = _build_single_thread_prompt(md_path, markdown, context_payload["content"], thread)
                with ASSISTANT_AGENT_LOCK:
                    reply_text = _run_codex_exec(prompt, md_path)

                markdown_after = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                markdown_after, localized_images = _localize_remote_images(md_path, markdown_after)
                if localized_images:
                    md_path.write_text(markdown_after, encoding="utf-8")
                    _sync_package_bundle_if_needed(md_path)
                content_changed = markdown_after != markdown_before

                thread = _append_assistant_reply_to_thread(comments_payload, thread_id, reply_text)
                _write_json(_comments_path(md_path), comments_payload)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return
            except RuntimeError as exc:
                try:
                    md_path = _normalize_relative_md(payload.get("path"))
                    thread_id = (payload.get("threadId") or "").strip()
                    comments_payload = _read_comments(md_path)
                    _mark_thread_request_state(
                        comments_payload,
                        thread_id,
                        requested=False,
                        note="单线程智能体调用失败。",
                        error_message=str(exc),
                    )
                    _write_json(_comments_path(md_path), comments_payload)
                    _sync_package_bundle_if_needed(md_path)
                except Exception:
                    pass
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_GATEWAY)
                return

            self._send_json(
                {
                    "ok": True,
                    "threadId": thread_id,
                    "reply": reply_text,
                    "thread": thread,
                    "comments": comments_payload,
                    "content": markdown_after,
                    "contentChanged": content_changed,
                    "savedAt": comments_payload["updatedAt"],
                }
            )
            return

        if parsed.path == "/api/review-state":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                status = payload.get("status")
                if status not in {"in_review", "approved"}:
                    raise ValueError("Field 'status' must be 'in_review' or 'approved'.")
                review_state = {
                    "version": 1,
                    "updatedAt": _utc_now(),
                    "status": status,
                    "closedAt": payload.get("closedAt"),
                    "closedBy": payload.get("closedBy"),
                    "note": payload.get("note"),
                    "threadCounts": payload.get("threadCounts"),
                }
                _write_json(_review_state_path(md_path), review_state)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "reviewStatePath": str(_review_state_path(md_path)),
                    "savedAt": review_state["updatedAt"],
                }
            )
            return

        if parsed.path == "/api/review-complete":
            try:
                md_path = _normalize_relative_md(payload.get("path"))
                review_state = {
                    "version": 1,
                    "updatedAt": _utc_now(),
                    "status": "approved",
                    "closedAt": payload.get("closedAt") or _utc_now(),
                    "closedBy": payload.get("closedBy") or "用户",
                    "note": payload.get("note"),
                    "threadCounts": payload.get("threadCounts"),
                }
                _write_json(_review_state_path(md_path), review_state)
                _sync_package_bundle_if_needed(md_path)
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "ok": True,
                    "reviewStatePath": str(_review_state_path(md_path)),
                    "savedAt": review_state["updatedAt"],
                }
            )
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return

        self._send_json({"error": "Not Found"}, HTTPStatus.NOT_FOUND)


class ReviewHTTPServer(ThreadingHTTPServer):
    def __init__(self, server_address, RequestHandlerClass, idle_timeout: int = 0):
        super().__init__(server_address, RequestHandlerClass)
        self.idle_timeout = max(0, idle_timeout)
        self.last_activity_at = time.monotonic()
        if self.idle_timeout:
            watcher = threading.Thread(target=self._idle_watch_loop, daemon=True)
            watcher.start()

    def _idle_watch_loop(self) -> None:
        while True:
            time.sleep(1)
            if time.monotonic() - self.last_activity_at >= self.idle_timeout:
                print(f"Idle timeout reached ({self.idle_timeout}s). Shutting down.")
                self.shutdown()
                return


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Markdown review app with comment threads.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--idle-timeout", type=int, default=0, help="Auto-shutdown after N seconds without requests.")
    parser.add_argument("--workspace", default=str(DEFAULT_WORKSPACE_ROOT), help="Workspace root used for Markdown files.")
    parser.add_argument("--default-md", default="workflow_review.md", help="Default Markdown file relative to the workspace.")
    args = parser.parse_args()

    workspace_root = Path(args.workspace).expanduser().resolve()
    workspace_root.mkdir(parents=True, exist_ok=True)
    try:
        default_md = _normalize_default_md_path(workspace_root, args.default_md)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    configure_runtime(workspace_root, default_md)
    package_target = os.environ.get("DOCPILOT_PACKAGE_TARGET")
    package_temp_root = os.environ.get("DOCPILOT_PACKAGE_TEMP_ROOT")
    package_main_document = os.environ.get("DOCPILOT_PACKAGE_MAIN_DOCUMENT")
    configure_package_sync(
        Path(package_target).expanduser().resolve() if package_target else None,
        Path(package_temp_root).expanduser().resolve() if package_temp_root else None,
        package_main_document,
    )

    server = ReviewHTTPServer((args.host, args.port), ReviewHandler, idle_timeout=args.idle_timeout)
    print(f"Serving Markdown review app at http://{args.host}:{args.port}")
    print(f"Workspace root: {WORKSPACE_ROOT}")
    print(f"Default Markdown: {DEFAULT_MD.relative_to(WORKSPACE_ROOT).as_posix()}")
    if args.idle_timeout:
        print(f"Idle timeout: {args.idle_timeout}s")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()


