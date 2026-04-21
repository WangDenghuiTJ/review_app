from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import webbrowser
from pathlib import Path
from urllib.parse import quote

from reflow_package import is_reflow_package, pack_document_bundle, unpack_package

APP_ROOT = Path(__file__).resolve().parents[1]
SERVER_PATH = APP_ROOT / "server.py"


def _find_free_port(host: str, preferred: int) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind((host, preferred))
            return probe.getsockname()[1]
        except OSError:
            probe.bind((host, 0))
            return probe.getsockname()[1]


def _wait_for_server(host: str, port: int, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.3)
            if sock.connect_ex((host, port)) == 0:
                return
        time.sleep(0.15)
    raise TimeoutError(f"Server did not become ready within {timeout} seconds.")


def _open_browser(url: str) -> None:
    powershell = shutil.which("powershell.exe")
    if powershell:
      subprocess.Popen(
          [powershell, "-NoProfile", "-Command", f"Start-Process '{url}'"],
          stdout=subprocess.DEVNULL,
          stderr=subprocess.DEVNULL,
      )
      return
    cmd = shutil.which("cmd.exe")
    if cmd:
      subprocess.Popen([cmd, "/c", "start", "", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
      return
    webbrowser.open(url)


def _prepare_workspace(target: Path | None) -> tuple[Path, str, Path | None, Path | None]:
    if not target:
        workspace_root = APP_ROOT.parents[1]
        return workspace_root, "workflow_review.md", None, None

    resolved = target.expanduser().resolve()
    if is_reflow_package(resolved):
        temp_root = Path(tempfile.mkdtemp(prefix="docpilot-package-"))
        main_document, _ = unpack_package(resolved, temp_root)
        return temp_root, main_document.relative_to(temp_root).as_posix(), resolved, temp_root

    if resolved.suffix.lower() != ".md":
        raise ValueError("Portable launcher currently supports .md, .docpilot, .reflow, and .flow files.")
    return resolved.parent, resolved.name, None, None


def _repack_package(source_package: Path, temp_root: Path, main_document: str) -> None:
    md_path = (temp_root / main_document).resolve()
    if not md_path.exists():
        raise FileNotFoundError(f"Main Markdown file vanished during session: {md_path}")
    pack_document_bundle(md_path, source_package)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Portable launcher for DocPilot on Windows.")
    parser.add_argument("target", nargs="?", help="Optional .md or package file to open.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument(
        "--idle-timeout",
        type=int,
        default=0,
        help="Seconds of inactivity before the local server exits. Use 0 to disable auto-shutdown.",
    )
    parser.add_argument("--no-browser", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    target = Path(args.target).resolve() if args.target else None
    workspace_root, default_md, source_package, temp_root = _prepare_workspace(target)
    port = _find_free_port(args.host, args.port)

    command = [
        sys.executable,
        str(SERVER_PATH),
        "--host",
        args.host,
        "--port",
        str(port),
        "--idle-timeout",
        str(args.idle_timeout),
        "--workspace",
        str(workspace_root),
        "--default-md",
        default_md,
    ]

    env = os.environ.copy()
    if source_package and temp_root:
        env["DOCPILOT_PACKAGE_TARGET"] = str(source_package)
        env["DOCPILOT_PACKAGE_TEMP_ROOT"] = str(temp_root)
        env["DOCPILOT_PACKAGE_MAIN_DOCUMENT"] = default_md

    process = subprocess.Popen(command, cwd=str(APP_ROOT), env=env)
    browser_url = f"http://{args.host}:{port}/?path={quote(default_md)}"

    try:
        _wait_for_server(args.host, port)
        if not args.no_browser:
            _open_browser(browser_url)
        print(f"DocPilot: {browser_url}")
        process.wait()
        if source_package and temp_root:
            _repack_package(source_package, temp_root, default_md)
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        if temp_root:
            shutil.rmtree(temp_root, ignore_errors=True)


if __name__ == "__main__":
    main()
