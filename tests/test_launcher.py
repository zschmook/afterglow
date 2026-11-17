"""Detached-launch checks use a temporary stub, never the real dashboard."""
from contextlib import redirect_stderr
import io
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from tools.launch_daemon import launch, parse_args


class LauncherTests(unittest.TestCase):
    def free_port(self):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            return sock.getsockname()[1]

    def test_detached_child_survives_launcher_exit_and_logs_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'server.py').write_text(
                "import sys,time\n"
                "port=sys.argv[sys.argv.index('--port')+1]\n"
                "print('Dashboard: http://localhost:'+port,flush=True)\n"
                "time.sleep(.8)\n"
                "print('Child outlived launcher',flush=True)\n", encoding='utf-8')
            port = self.free_port()
            code = 'from tools.launch_daemon import launch;from types import SimpleNamespace;import sys;raise SystemExit(launch(SimpleNamespace(host="127.0.0.1",port=int(sys.argv[2]),foreground=False),sys.argv[1]))'
            result = subprocess.run([sys.executable, '-c', code, str(root), str(port)], capture_output=True, text=True, timeout=8)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('in background', result.stdout)
            pid = int((root / 'data' / f'dashboard-{port}.pid').read_text())
            # Wait for this test's stub to exit naturally; no service is stopped.
            import psutil
            try:
                psutil.Process(pid).wait(timeout=5)
            except psutil.NoSuchProcess:
                pass
            log = (root / 'data' / f'dashboard-{port}.log').read_text()
            self.assertIn('Child outlived launcher', log)
            self.assertNotEqual(pid, os.getpid())

    def test_occupied_port_is_left_alone(self):
        with socket.socket() as listener, tempfile.TemporaryDirectory() as temporary:
            listener.bind(('127.0.0.1', 0));listener.listen()
            port = listener.getsockname()[1]
            with patch('tools.launch_daemon.subprocess.Popen') as start, redirect_stderr(io.StringIO()):
                self.assertEqual(launch(SimpleNamespace(host='127.0.0.1', port=port, foreground=False), temporary), 1)
            start.assert_not_called()
            self.assertFalse((Path(temporary) / 'data').exists())
            self.assertEqual(listener.getsockname()[1], port)

    def test_failed_start_reports_log_and_does_not_write_pid(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary);port = self.free_port()
            (root / 'server.py').write_text("import sys\nprint('stub startup failure',file=sys.stderr,flush=True)\nraise SystemExit(7)\n")
            with redirect_stderr(io.StringIO()) as output:
                self.assertEqual(launch(SimpleNamespace(host='127.0.0.1', port=port, foreground=False), root), 1)
            self.assertIn('code 7', output.getvalue())
            self.assertIn('stub startup failure', (root / 'data' / f'dashboard-{port}.log').read_text())
            self.assertFalse((root / 'data' / f'dashboard-{port}.pid').exists())

    def test_foreground_keeps_selected_interpreter_and_server_arguments(self):
        with tempfile.TemporaryDirectory() as temporary:
            args = SimpleNamespace(host='127.0.0.1', port=10001, foreground=True)
            with patch('tools.launch_daemon.os.execv', side_effect=RuntimeError('exec')) as execute:
                with self.assertRaisesRegex(RuntimeError, 'exec'):
                    launch(args, temporary)
            self.assertEqual(execute.call_args.args, (sys.executable, [sys.executable, '-u', str(Path(temporary).resolve() / 'server.py'), '--host', '127.0.0.1', '--port', '10001']))

    def test_default_and_custom_arguments(self):
        with patch.dict(os.environ, {'PORT': '10002', 'HOST': '127.0.0.1'}):
            args = parse_args([])
            self.assertEqual((args.host, args.port, args.foreground), ('127.0.0.1', 10002, False))
            self.assertEqual(parse_args(['--port', '10001', '--foreground']).port, 10001)
        with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            parse_args(['--port', '0'])


if __name__ == '__main__':
    unittest.main()
