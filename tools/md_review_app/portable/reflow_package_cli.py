from __future__ import annotations

import argparse
from pathlib import Path

from reflow_package import PRIMARY_PACKAGE_SUFFIX, create_blank_package, pack_document_bundle, unpack_package


def main() -> None:
    parser = argparse.ArgumentParser(description="Pack or unpack DocPilot documents.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    pack_parser = subparsers.add_parser("pack", help="Pack one Markdown document bundle into a .docpilot file.")
    pack_parser.add_argument("markdown", help="Path to the source .md file.")
    pack_parser.add_argument("output", nargs="?", help="Output .docpilot file path.")

    unpack_parser = subparsers.add_parser("unpack", help="Unpack a .docpilot file into a directory.")
    unpack_parser.add_argument("package", help="Path to the source .docpilot file.")
    unpack_parser.add_argument("destination", help="Directory to extract into.")

    blank_parser = subparsers.add_parser("blank", help="Create a blank .docpilot template or document.")
    blank_parser.add_argument("output", help="Output .docpilot file path.")
    blank_parser.add_argument("--main-document", default="document.md", help="Main Markdown file name inside the package.")

    args = parser.parse_args()

    if args.command == "pack":
        markdown = Path(args.markdown).expanduser().resolve()
        output = Path(args.output).expanduser().resolve() if args.output else markdown.with_suffix(PRIMARY_PACKAGE_SUFFIX)
        pack_document_bundle(markdown, output)
        print(f"Packed {markdown} -> {output}")
        return

    if args.command == "blank":
        output = Path(args.output).expanduser().resolve()
        create_blank_package(output, main_document=args.main_document)
        print(f"Created blank package -> {output}")
        return

    package = Path(args.package).expanduser().resolve()
    destination = Path(args.destination).expanduser().resolve()
    main_document, manifest = unpack_package(package, destination)
    print(f"Unpacked {package} -> {destination}")
    print(f"Main document: {main_document}")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()
