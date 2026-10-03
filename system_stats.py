"""Read-only host metrics, shared across all dashboard cards."""
import json
import os
from functools import lru_cache
import csv
import subprocess
import platform
import shutil
import threading
import time
from pathlib import Path

try:
    import psutil
except ImportError:
    psutil = None

_lock = threading.Lock()
_cached = None
_sampled = 0
_network = None


def nvidia_stats():
    executable = shutil.which('nvidia-smi')
    if not executable:
        return []
    try:
        result = subprocess.run(
            [executable, '--query-gpu=name,utilization.gpu,memory.used,memory.total',
             '--format=csv,noheader,nounits'], capture_output=True, text=True, timeout=3,
            check=True, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        def number(value):
            try:
                return float(value.strip())
            except ValueError:
                return None
        cards = []
        for row in csv.reader(result.stdout.splitlines()):
            if len(row) == 4:
                cards.append({'name': row[0].strip(), 'percent': number(row[1]),
                              'memory_used_mib': number(row[2]), 'memory_total_mib': number(row[3])})
        return cards
    except (OSError, subprocess.SubprocessError):
        return []


def gpu_stats():
    if platform.system() == 'Windows':
        try:
            from windows_gpu import sample
            cards = sample()
            if cards:
                return cards
        except (OSError, ValueError):
            pass
    return nvidia_stats()


def cpu_model():
    if platform.system() == 'Windows':
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r'HARDWARE\DESCRIPTION\System\CentralProcessor\0') as key:
                return winreg.QueryValueEx(key, 'ProcessorNameString')[0].strip()
        except OSError:
            pass
    return platform.processor() or 'Processor'


@lru_cache(maxsize=1)
def hardware_details():
    if platform.system() != 'Windows':
        return {}
    drive = Path(__file__).resolve().anchor[0]
    if not drive.isalpha():
        return {}
    script = "$ErrorActionPreference='Stop'; $ram=@(Get-CimInstance Win32_PhysicalMemory | Select-Object Manufacturer,PartNumber,ConfiguredClockSpeed,Speed,Capacity); $disk=Get-Partition -DriveLetter '" + drive + "' | Get-Disk | Select-Object -First 1 FriendlyName,BusType; @{ram=$ram;disk=$disk} | ConvertTo-Json -Depth 4 -Compress"
    executable = shutil.which('pwsh') or 'powershell.exe'
    try:
        result = subprocess.run([executable, '-NoProfile', '-NonInteractive', '-Command', script], capture_output=True, text=True, timeout=8, check=True, creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        return json.loads(result.stdout)
    except (OSError, ValueError, subprocess.SubprocessError):
        return {}


def snapshot():
    global _cached, _sampled, _network
    if psutil is None:
        raise RuntimeError('System stats require psutil. Launch with bash run.sh.')
    with _lock:
        now = time.monotonic()
        if _cached is not None and now - _sampled < 2:
            return _cached
        # Explicit short sample avoids thread-local cpu_percent baselines in HTTP threads.
        cpu = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        net = psutil.net_io_counters()
        measured = time.monotonic()
        rates = {'received': None, 'sent': None}
        if _network and net:
            elapsed = measured - _sampled
            rates = {key: max(0, getattr(net, attr) - getattr(_network, attr)) / elapsed
                     for key, attr in [('received', 'bytes_recv'), ('sent', 'bytes_sent')]}
        disk_root = Path(__file__).resolve().anchor
        disk = shutil.disk_usage(disk_root)
        battery = psutil.sensors_battery()
        _cached = {'cpu': cpu, 'cpu_model': cpu_model(), 'threads': psutil.cpu_count(), 'os': platform.system(),
                   'memory': {'used': memory.total - memory.available, 'total': memory.total, 'percent': memory.percent},
                   'disk': {'name': disk_root, 'used': disk.used, 'total': disk.total, 'percent': disk.used / disk.total * 100},
                   'hardware': hardware_details(), 'network': rates, 'uptime': max(0, time.time() - psutil.boot_time()),
                   'gpus': gpu_stats(),
                   'battery': None if battery is None else {'percent': battery.percent, 'plugged': battery.power_plugged}}
        _sampled, _network = measured, net
        return _cached
