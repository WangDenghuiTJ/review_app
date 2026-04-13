from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

PRIMARY_PACKAGE_SUFFIX = ".docpilot"
LEGACY_PACKAGE_SUFFIXES = {".reflow", ".flow"}
PACKAGE_SUFFIXES = {PRIMARY_PACKAGE_SUFFIX, *LEGACY_PACKAGE_SUFFIXES}
DEFAULT_BLANK_MARKDOWN = "# 未命名文档\n\n在这里开始写正文。\n"


def _comments_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".comments.json")


def _context_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".context.md")


def _review_state_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".review.json")


def _revision_state_path(md_path: Path) -> Path:
    return md_path.with_suffix(md_path.suffix + ".revisions.json")


def _assets_dir(md_path: Path) -> Path:
    return md_path.with_suffix(".assets")


def is_reflow_package(path: Path) -> bool:
    return path.suffix.lower() in PACKAGE_SUFFIXES


def build_manifest(main_document: str) -> dict:
    return {
        "format": "docpilot-package",
        "version": 1,
        "mainDocument": main_document,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


def write_blank_document_files(target_dir: Path, *, main_document: str = "document.md", markdown: str = DEFAULT_BLANK_MARKDOWN) -> Path:
    target_dir = target_dir.resolve()
    target_dir.mkdir(parents=True, exist_ok=True)
    md_path = target_dir / main_document
    md_path.write_text(markdown, encoding="utf-8")
    _comments_path(md_path).write_text('{\n  "version": 1,\n  "updatedAt": null,\n  "comments": []\n}\n', encoding="utf-8")
    _context_path(md_path).write_text("", encoding="utf-8")
    _review_state_path(md_path).write_text(
        '{\n  "version": 1,\n  "updatedAt": null,\n  "status": "in_review",\n  "closedAt": null,\n  "closedBy": null,\n  "note": null,\n  "threadCounts": null\n}\n',
        encoding="utf-8",
    )
    _revision_state_path(md_path).write_text(
        json.dumps(
            {
                "version": 1,
                "updatedAt": None,
                "baseline": markdown,
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
    return md_path


def iter_bundle_paths(md_path: Path) -> list[Path]:
    paths = [md_path]
    for sidecar in (
        _comments_path(md_path),
        _context_path(md_path),
        _review_state_path(md_path),
        _revision_state_path(md_path),
    ):
        if sidecar.exists():
            paths.append(sidecar)
    asset_dir = _assets_dir(md_path)
    if asset_dir.exists():
        paths.extend(path for path in sorted(asset_dir.rglob("*")) if path.is_file())
    return paths


def pack_document_bundle(md_path: Path, package_path: Path) -> None:
    md_path = md_path.resolve()
    package_path = package_path.resolve()
    root = md_path.parent
    manifest = build_manifest(md_path.name)

    package_path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(package_path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        for path in iter_bundle_paths(md_path):
            archive.write(path, path.relative_to(root).as_posix())


def create_blank_package(package_path: Path, *, main_document: str = "document.md", markdown: str = DEFAULT_BLANK_MARKDOWN) -> None:
    package_path = package_path.resolve()
    package_path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(package_path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("manifest.json", json.dumps(build_manifest(main_document), ensure_ascii=False, indent=2) + "\n")
        archive.writestr(main_document, markdown)
        archive.writestr(
            f"{main_document}.comments.json",
            '{\n  "version": 1,\n  "updatedAt": null,\n  "comments": []\n}\n',
        )
        archive.writestr(f"{main_document}.context.md", "")
        archive.writestr(
            f"{main_document}.review.json",
            '{\n  "version": 1,\n  "updatedAt": null,\n  "status": "in_review",\n  "closedAt": null,\n  "closedBy": null,\n  "note": null,\n  "threadCounts": null\n}\n',
        )
        archive.writestr(
            f"{main_document}.revisions.json",
            json.dumps(
                {
                    "version": 1,
                    "updatedAt": None,
                    "baseline": markdown,
                },
                ensure_ascii=False,
                indent=2,
            ) + "\n",
        )


def read_manifest(package_path: Path) -> dict:
    with ZipFile(package_path, "r") as archive:
        with archive.open("manifest.json", "r") as handle:
            return json.load(handle)


def unpack_package(package_path: Path, destination: Path) -> tuple[Path, dict]:
    package_path = package_path.resolve()
    destination = destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    with ZipFile(package_path, "r") as archive:
        archive.extractall(destination)
    manifest = json.loads((destination / "manifest.json").read_text(encoding="utf-8"))
    main_document = (destination / manifest["mainDocument"]).resolve()
    if not main_document.exists():
        raise FileNotFoundError(f"Package main document was not found: {manifest['mainDocument']}")
    return main_document, manifest
