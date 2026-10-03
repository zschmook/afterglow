"""Windows adapter names/LUIDs via DXGI and vendor-neutral GPU counters."""
import ctypes as c
import json
import os
import re
import shutil
import subprocess
import uuid
from collections import defaultdict


def adapters():
    class LUID(c.Structure):
        _fields_ = [('Low', c.c_uint32), ('High', c.c_int32)]
    class Desc(c.Structure):
        _fields_ = [('name', c.c_wchar * 128), ('vendor', c.c_uint32), ('device', c.c_uint32), ('subsys', c.c_uint32), ('revision', c.c_uint32), ('dedicated', c.c_size_t), ('system', c.c_size_t), ('shared', c.c_size_t), ('luid', LUID), ('flags', c.c_uint32)]
    def call(obj, slot, args, *values):
        table=c.cast(obj,c.POINTER(c.POINTER(c.c_void_p))).contents
        return c.WINFUNCTYPE(c.c_long,c.c_void_p,*args)(table[slot])(obj,*values)
    iid=(c.c_ubyte*16).from_buffer_copy(uuid.UUID('770aae78-f26f-4dba-a829-253c83d1b387').bytes_le)
    factory=c.c_void_p()
    dll=c.WinDLL('dxgi')
    create=dll.CreateDXGIFactory1;create.argtypes=[c.c_void_p,c.POINTER(c.c_void_p)];create.restype=c.c_long
    if create(c.byref(iid),c.byref(factory))<0: return []
    result=[]
    try:
        for index in range(32):
            adapter=c.c_void_p()
            if call(factory,12,[c.c_uint,c.POINTER(c.c_void_p)],index,c.byref(adapter))<0:break
            try:
                desc=Desc()
                if call(adapter,10,[c.POINTER(Desc)],c.byref(desc))>=0 and not desc.flags&2:
                    result.append({'id':f'{desc.luid.High & 0xffffffff:08x}_{desc.luid.Low:08x}', 'name':desc.name,'memory_total_mib':desc.dedicated/1048576,'shared_total_mib':desc.shared/1048576})
            finally:call(adapter,2,[])
    finally:call(factory,2,[])
    return result


def combine(cards, samples):
    engines=defaultdict(lambda:defaultdict(float));memory={}
    for sample in samples:
        match=re.search(r'luid_0x([0-9a-f]+)_0x([0-9a-f]+)_phys_(\d+)(?:_eng_(\d+))?',sample['instance'],re.I)
        if not match:continue
        key=f'{int(match[1],16):08x}_{int(match[2],16):08x}'
        if sample.get('status',0) not in (0,1):continue
        value=max(0,float(sample['value']))
        if match[4] is not None:engines[key][(match[3],match[4])]+=value
        else:memory[key]=value/1048576
    return [dict(card,percent=min(100,max(engines[card['id']].values())) if engines[card['id']] else None,memory_used_mib=memory.get(card['id'])) for card in cards]


def sample():
    cards=adapters()
    script=r"$ErrorActionPreference='Stop'; $s=(Get-Counter -Counter '\GPU Engine(*)\Utilization Percentage','\GPU Adapter Memory(*)\Dedicated Usage' -ErrorAction SilentlyContinue).CounterSamples; @($s | ForEach-Object { @{instance=$_.InstanceName;value=$_.CookedValue;status=$_.Status} }) | ConvertTo-Json -Compress"
    executable=shutil.which('pwsh') or os.path.join(os.environ.get('SystemRoot','C:\\Windows'),'System32','WindowsPowerShell','v1.0','powershell.exe')
    try:
        result=subprocess.run([executable,'-NoProfile','-NonInteractive','-Command',script],capture_output=True,text=True,timeout=6,check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        data=json.loads(result.stdout)
        return combine(cards,data if isinstance(data,list) else [data])
    except (OSError,ValueError,subprocess.SubprocessError):
        return combine(cards,[])

