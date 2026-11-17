#!/usr/bin/env bash
set -euo pipefail
script_path="${BASH_SOURCE[0]//\\//}"
if [[ "$script_path" == */* ]]; then cd -- "${script_path%/*}"; fi
exec bash ./run.sh "$@"
