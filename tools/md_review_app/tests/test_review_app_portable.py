from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest import mock


TESTS_DIR = Path(__file__).resolve().parent
PORTABLE_DIR = TESTS_DIR.parent / "portable"
PORTABLE_PATH = PORTABLE_DIR / "review_app_portable.py"


def _load_portable_module():
    if str(PORTABLE_DIR) not in sys.path:
        sys.path.insert(0, str(PORTABLE_DIR))
    spec = importlib.util.spec_from_file_location("review_app_portable_under_test", PORTABLE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module from {PORTABLE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _FakeProcess:
    def wait(self):
        return 0

    def poll(self):
        return 0

    def terminate(self):
        raise AssertionError("terminate() should not be called when the process already exited.")

    def kill(self):
        raise AssertionError("kill() should not be called when the process already exited.")


class ReviewAppPortableTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = _load_portable_module()

    def test_parser_defaults_idle_timeout_to_zero(self):
        parser = self.module.build_parser()
        args = parser.parse_args([])
        self.assertEqual(args.idle_timeout, 0)

    def test_main_forwards_zero_idle_timeout_by_default(self):
        popen_calls = []

        def fake_popen(command, cwd=None, env=None):
            popen_calls.append({"command": command, "cwd": cwd, "env": env})
            return _FakeProcess()

        with mock.patch.object(self.module, "_prepare_workspace", return_value=(Path("C:/workspace"), "workflow_review.md", None, None)), \
             mock.patch.object(self.module, "_find_free_port", return_value=8876), \
             mock.patch.object(self.module, "_wait_for_server"), \
             mock.patch.object(self.module, "_open_browser"), \
             mock.patch.object(self.module.subprocess, "Popen", side_effect=fake_popen):
            self.module.main(["--no-browser"])

        self.assertEqual(len(popen_calls), 1)
        command = popen_calls[0]["command"]
        idle_timeout_index = command.index("--idle-timeout")
        self.assertEqual(command[idle_timeout_index + 1], "0")


if __name__ == "__main__":
    unittest.main()
