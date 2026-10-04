"""Rebuild the vendored calculator core with Emscripten 3.1.64 (no firmware)."""
from pathlib import Path
import argparse
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--emcc', default='emcc', help='Emscripten compiler executable')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
vendor = root / 'assets/vendor/wabbitemu'
source = vendor / 'source'
files = ['core/core.c', 'core/alu.c', 'core/control.c', 'core/device.c',
         'core/indexcb.c', 'hardware/83psehw.c', 'hardware/83phw.c',
         'hardware/lcd.c', 'hardware/colorlcd.c', 'hardware/keys.c']
command = [args.emcc, *[str(source / p) for p in files], str(vendor / 'bridge.c'),
           *['-I' + str(source / p) for p in ['', 'core', 'hardware', 'utilities', 'debugger']],
           '-D__pragma(x)=', '-D_LINUX', '-D_ANDROID', '-D_In_=', '-D_Out_=',
           '-D_Inout_=', '-D_In_opt_=', '-O2', '-Wno-implicit-function-declaration',
           '-sMODULARIZE=1', '-sEXPORT_NAME=AfterglowZ80', '-sENVIRONMENT=web,worker,node',
           '-sALLOW_MEMORY_GROWTH=1', '-sFILESYSTEM=0', '-o', str(vendor / 'core.js')]
subprocess.run(command, check=True)
