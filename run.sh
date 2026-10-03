#!/usr/bin/env bash
set -euo pipefail
script_path="${BASH_SOURCE[0]}"
if [[ "$script_path" == */* ]]; then cd -- "${script_path%/*}"; fi

check_python() {
    "$@" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1
}

if [[ -n "${PYTHON:-}" ]]; then
    if ! check_python "$PYTHON"; then
        printf '%s\n' 'PYTHON must point to a working Python 3.10+ executable.' >&2
        exit 1
    fi
    exec "$PYTHON" -u server.py "$@"
fi

for local_python in .venv/Scripts/python.exe .venv/bin/python; do
    if [[ -f "$local_python" ]] && check_python "$local_python"; then
        exec "$local_python" -u server.py "$@"
    fi
done

for candidate in python python3; do
    if command -v "$candidate" >/dev/null 2>&1 && check_python "$candidate"; then
        exec "$candidate" -u server.py "$@"
    fi
done
if command -v py >/dev/null 2>&1 && check_python py -3; then
    exec py -3 -u server.py "$@"
fi

# Reuse the runtime already on this Windows machine; no download or installation.
if [[ -n "${USERPROFILE:-}" ]]; then
    profile_path="${USERPROFILE//\\//}"
    runtime="$profile_path/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"
    if [[ -f "$runtime" ]] && check_python "$runtime"; then
        exec "$runtime" -u server.py "$@"
    fi
fi
printf '%s\n' 'Python 3.10+ was not found. Set PYTHON to your Python executable and run this script again.' >&2
exit 1
