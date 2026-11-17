"""Detach the native dashboard from Git Bash; no service installation needed."""
import argparse
import os
from pathlib import Path
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Run the dashboard in the background, with logs under data/.')
    parser.add_argument('--foreground', action='store_true', help='Stay attached to the terminal; Ctrl+C stops the dashboard.')
    parser.add_argument('--host', default=os.environ.get('HOST', '0.0.0.0'))
    parser.add_argument('--port', type=int, default=os.environ.get('PORT', '10000'))
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error('--port must be between 1 and 65535')
    return args


def launch(args, root=ROOT):
    root = Path(root).resolve()
    command = [sys.executable, '-u', str(root / 'server.py'), '--host', args.host, '--port', str(args.port)]
    if args.foreground:
        os.execv(sys.executable, command)
    probe_host = '127.0.0.1' if args.host in ('0.0.0.0', '') else args.host
    try:
        with socket.create_connection((probe_host, args.port), timeout=.5):
            print(f'Port {args.port} is already in use. The running process was left alone.', file=sys.stderr)
            return 1
    except OSError:
        pass
    folder = root / 'data'
    folder.mkdir(exist_ok=True)
    log_path = folder / f'dashboard-{args.port}.log'
    pid_path = folder / f'dashboard-{args.port}.pid'
    options = dict(cwd=root, stdin=subprocess.DEVNULL, stderr=subprocess.STDOUT, close_fds=True)
    if os.name == 'nt':
        options['creationflags'] = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        options['start_new_session'] = True
    with log_path.open('ab') as log:
        log.write(f'\n--- Dashboard launch {time.strftime("%Y-%m-%d %H:%M:%S")} ---\n'.encode())
        log.flush()
        offset = log.tell()
        child = subprocess.Popen(command, stdout=log, **options)
    ready = False
    deadline = time.monotonic() + 3
    marker = f'Dashboard: http://localhost:{args.port}'.encode()
    while time.monotonic() < deadline:
        if child.poll() is not None:
            print(f'Dashboard exited during startup (code {child.returncode}). See {log_path}', file=sys.stderr)
            return 1
        with log_path.open('rb') as log:
            log.seek(offset)
            if marker in log.read(65536):
                ready = True
                break
        time.sleep(.1)
    pid_path.write_text(str(child.pid) + '\n', encoding='ascii')
    print(f'Dashboard {"running" if ready else "launched; startup still in progress"} in background (PID {child.pid}).')
    print(f'URL: http://localhost:{args.port}')
    print(f'Log: {log_path}')
    print(f'PID file: {pid_path}')
    print('You can close this terminal. Use --foreground for an attached debug run.')
    return 0


def main(argv=None):
    args = parse_args(argv)
    try:
        return launch(args)
    except OSError as error:
        print(f'Could not launch the dashboard: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
