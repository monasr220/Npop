"""Run the backend and frontend together from a single command.

Two modes:

1. **Default (recommended)** — one FastAPI process serves *both* the JSON API
   (``/api``) and the production React build (``Frontend/dist``) at ``/``:

       uv run python scripts/dev.py

   Open http://127.0.0.1:5001/ and the UI talks to the same server.  Run
   ``npm run build`` inside ``Frontend/`` first (or whenever the frontend
   changes); ``Frontend/static`` is used as a fallback when no build exists.

2. **React/Vite dev mode** — additionally starts the Vite dev server on port
   5173 (its ``/api`` proxy points at the backend):

       uv run python scripts/dev.py --vite

   This needs ``npm install`` inside ``Frontend/`` first.

Press Ctrl+C to stop every process this script started.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = PROJECT_ROOT / "Frontend"
DEFAULT_PORT = 5001


def spawn(label: str, command: list[str], cwd: Path, env: dict[str, str]) -> subprocess.Popen:
    print(f"[dev] starting {label}: {' '.join(command)}")
    return subprocess.Popen(command, cwd=str(cwd), env=env)


def stop(process: subprocess.Popen) -> None:
    """Terminate a process and (on Windows) its child reloader process too."""
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/T", "/F", "/PID", str(process.pid)],
            capture_output=True,
            check=False,
        )
    else:
        process.terminate()


def main() -> int:
    # Show logs immediately even when stdout is redirected to a file.
    sys.stdout.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser(
        description="Run the Npop backend and frontend together."
    )
    parser.add_argument(
        "--vite",
        action="store_true",
        help="also start the React/Vite dev server on port 5173",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"backend port (default: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="auto-reload the backend when Python files change",
    )
    args = parser.parse_args()

    env = os.environ.copy()
    env["SERVER_PORT"] = str(args.port)

    backend_command = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(args.port),
    ]
    if args.reload:
        backend_command.append("--reload")

    processes: list[subprocess.Popen] = []
    processes.append(spawn("backend", backend_command, PROJECT_ROOT, env))

    if args.vite:
        if not (FRONTEND_DIR / "node_modules").is_dir():
            print(
                "[dev] Frontend/node_modules is missing. Run `npm install` "
                "inside Frontend/ first, then retry with --vite."
            )
            stop(processes[0])
            return 1
        npm = shutil.which("npm")
        if npm is None:
            print("[dev] npm was not found on PATH.")
            stop(processes[0])
            return 1
        processes.append(spawn("vite", [npm, "run", "dev"], FRONTEND_DIR, env))

    print()
    print(f"[dev] UI + API:   http://127.0.0.1:{args.port}/")
    print(f"[dev] API docs:   http://127.0.0.1:{args.port}/docs")
    if args.vite:
        print("[dev] React dev:  http://127.0.0.1:5173/")
    print("[dev] Press Ctrl+C to stop.")

    try:
        while True:
            for process in processes:
                code = process.poll()
                if code is not None:
                    print(f"[dev] a process exited with code {code}; shutting down.")
                    return code
            time.sleep(0.4)
    except KeyboardInterrupt:
        print("\n[dev] stopping...")
        return 0
    finally:
        for process in processes:
            stop(process)


if __name__ == "__main__":
    raise SystemExit(main())
