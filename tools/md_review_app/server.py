from __future__ import annotations

import argparse
import json
import mimetypes
import posixpath
import subprocess
import tempfile
import threading
import time
import urllib.parse
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
STATIC_ROOT = Path(__file__).resolve().parent / "static"
DEFAULT_MD = WORKSPACE_ROOT / "workflow_review.md"
CODEX_EXEC_TIMEOUT_SECONDS = 180
MAX_PROMPT_CHARS = 120_000
ASSISTANT_AUTHOR = "助手"
ASSISTANT_AGENT_LOCK = threading.Lock()


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


def _comments_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".comments.json")


def _review_state_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".review.json")


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
            "updatedAt": _utc_now(),
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
    return "\n\n".join(
        [
            "你是 Review App 中被单独唤起处理一个批注线程的智能体。",
            "\n".join(
                [
                    "任务要求：",
                    "1. 只回复当前线程，不要处理其他线程。",
                    f"2. 你可以在必要时直接修改当前 Markdown 文件 `{relative_md_path}` 的正文，但不要修改其他文件。",
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
            "当前线程信息:",
            _thread_to_prompt_block(thread),
            "当前 Markdown 正文:",
            _truncate_text(markdown),
        ]
    )


def _run_codex_exec(prompt: str, md_path: Path) -> str:
    with tempfile.NamedTemporaryFile(prefix="review-app-codex-", suffix=".txt", delete=False) as handle:
        output_path = Path(handle.name)
    command = [
        "codex",
        "exec",
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
            capture_output=True,
            timeout=CODEX_EXEC_TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"Codex 调用超时（>{CODEX_EXEC_TIMEOUT_SECONDS}s）。") from exc

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
                }
            )
            return

        if parsed.path == "/api/list":
            files = sorted(path.relative_to(WORKSPACE_ROOT).as_posix() for path in WORKSPACE_ROOT.rglob("*.md"))
            self._send_json({"files": files})
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
                md_path.parent.mkdir(parents=True, exist_ok=True)
                md_path.write_text(content, encoding="utf-8")
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

                thread = next((item for item in comments_payload["comments"] if item.get("id") == thread_id), None)
                if not thread:
                    raise ValueError(f"Thread '{thread_id}' was not found.")

                markdown_before = markdown
                prompt = _build_single_thread_prompt(md_path, markdown, context_payload["content"], thread)
                with ASSISTANT_AGENT_LOCK:
                    reply_text = _run_codex_exec(prompt, md_path)

                markdown_after = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
                content_changed = markdown_after != markdown_before

                thread = _append_assistant_reply_to_thread(comments_payload, thread_id, reply_text)
                _write_json(_comments_path(md_path), comments_payload)
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
    args = parser.parse_args()

    server = ReviewHTTPServer((args.host, args.port), ReviewHandler, idle_timeout=args.idle_timeout)
    print(f"Serving Markdown review app at http://{args.host}:{args.port}")
    print(f"Workspace root: {WORKSPACE_ROOT}")
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


