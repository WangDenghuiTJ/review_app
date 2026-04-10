from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_comments(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save_comments(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def add_reply(payload: dict, thread_id: str, author: str, body: str, message_id: str, timestamp: str) -> None:
    for thread in payload.get("comments", []):
        if thread.get("id") != thread_id:
            continue
        thread.setdefault("messages", []).append(
            {
                "id": message_id,
                "author": author,
                "role": "assistant" if author == "助手" else "user",
                "body": body,
                "createdAt": timestamp,
                "updatedAt": timestamp,
            }
        )
        thread["updatedAt"] = timestamp
        request = thread.get("assistantRequest") or {}
        request["requested"] = False
        request["respondedAt"] = timestamp
        thread["assistantRequest"] = request
        payload["updatedAt"] = timestamp
        return
    raise SystemExit(f"thread not found: {thread_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description="UTF-8 safe helper for Markdown review comment threads.")
    parser.add_argument("comments_file")
    parser.add_argument("thread_id")
    parser.add_argument("body_file", help="UTF-8 text file containing the reply body")
    parser.add_argument("--author", default="助手")
    parser.add_argument("--message-id", required=True)
    parser.add_argument("--timestamp", required=True)
    args = parser.parse_args()

    comments_path = Path(args.comments_file)
    body = Path(args.body_file).read_text(encoding="utf-8")
    payload = load_comments(comments_path)
    add_reply(payload, args.thread_id, args.author, body, args.message_id, args.timestamp)
    save_comments(comments_path, payload)


if __name__ == "__main__":
    main()
