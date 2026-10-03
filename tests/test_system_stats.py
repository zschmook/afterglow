import unittest
from unittest.mock import patch
from types import SimpleNamespace
import subprocess
import system_stats
class GPU(unittest.TestCase):
    def test_values_and_unavailable(self):
        with patch('system_stats.shutil.which', return_value='nvidia-smi'), patch('system_stats.subprocess.run', return_value=SimpleNamespace(stdout='GPU A, 57, 1024, 8192\nGPU B, [N/A], [N/A], 4096')):
            cards=system_stats.nvidia_stats()
            self.assertEqual(cards[0]['percent'],57)
            self.assertEqual(cards[0]['memory_used_mib'],1024)
            self.assertIsNone(cards[1]['percent'])
    def test_driver_failure(self):
        with patch('system_stats.shutil.which', return_value='nvidia-smi'), patch('system_stats.subprocess.run', side_effect=subprocess.TimeoutExpired('nvidia-smi',3)):
            self.assertEqual(system_stats.nvidia_stats(),[])

class WindowsGPU(unittest.TestCase):
    def test_engine_aggregation_and_adapter_mapping(self):
        from windows_gpu import combine
        cards=[{'id':'00000000_00000001','name':'Intel'},{'id':'00000000_00000002','name':'NVIDIA'}]
        samples=[{'instance':'pid_1_luid_0x00000000_0x00000001_phys_0_eng_0_engtype_3d','value':30},
                 {'instance':'pid_2_luid_0x00000000_0x00000001_phys_0_eng_0_engtype_3d','value':40},
                 {'instance':'pid_1_luid_0x00000000_0x00000001_phys_0_eng_1_engtype_copy','value':50},
                 {'instance':'pid_1_luid_0x00000000_0x00000002_phys_0_eng_0_engtype_3d','value':4}]
        result=combine(cards,samples)
        self.assertEqual(result[0]['percent'],70)
        self.assertEqual(result[1]['percent'],4)
        self.assertIsNone(combine(cards,[])[0]['percent'])
