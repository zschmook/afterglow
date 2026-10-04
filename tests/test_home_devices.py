import socket
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import home_config
import home_devices as devices
import server


class HomeDevicesTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        config = patch.object(home_config, 'CONFIG_PATH', Path(temp.name) / 'devices.json')
        config.start()
        self.addCleanup(config.stop)
        server.HOME_STATES.clear()
        self.light = {'ip':'192.168.1.20', 'name':'Desk', 'model':'KL110', 'device_id':'desk'}

    def test_discovery_detects_network_and_saves_without_controls(self):
        adapters = {'Wi-Fi':[SimpleNamespace(family=socket.AF_INET, address='192.168.1.5')],
                    'Loopback':[SimpleNamespace(family=socket.AF_INET, address='127.0.0.1')]}
        with patch.object(devices.psutil, 'net_if_addrs', return_value=adapters), patch.object(devices, '_read_device', side_effect=lambda ip,timeout: ('light', self.light) if ip==self.light['ip'] else None) as read, patch.object(devices, '_kasa_request') as control:
            result = server.home_request('/api/home/discover', 'POST', {})
        self.assertEqual(result['responding'], 1)
        self.assertEqual(read.call_count, 254)
        control.assert_not_called()
        self.assertEqual(server.home_request('/api/home/devices')['lights'], [self.light])

    def test_identity_mismatch_never_sends_control(self):
        devices.remember_lights([self.light])
        with patch.object(devices, '_read_product', return_value={'deviceId':'other','model':'KL110'}), patch.object(devices, '_kasa_request') as command:
            with self.assertRaisesRegex(ValueError, 'no longer matches'):
                devices.control_light('desk', {'on':True})
        command.assert_not_called()

    def test_control_requires_acknowledgement_and_reads_back(self):
        devices.remember_lights([self.light])
        product = {'deviceId':'desk','model':'KL110','light_state':{'on_off':1,'brightness':50},'is_dimmable':1}
        with patch.object(devices, '_read_product', return_value=product), patch.object(devices, '_kasa_request', return_value={'smartlife.iot.smartbulb.lightingservice':{'transition_light_state':{'err_code':0}}}) as command:
            state=server.home_request('/api/home/lights/desk/control','POST',{'brightness':50})
        self.assertEqual(state['brightness'],50)
        self.assertEqual(command.call_args.args[0],self.light['ip'])

    def test_no_network_has_helpful_error(self):
        with patch.object(devices.psutil,'net_if_addrs',return_value={}):
            with self.assertRaisesRegex(ValueError,'home Wi-Fi'):
                devices.discover_devices()

    def test_invalid_operations_and_payloads_are_rejected(self):
        for path in ['/api/home/unknown','/api/home/lights/desk/control']:
            with self.assertRaises(ValueError):
                server.home_request(path)
        with self.assertRaises(ValueError):
            devices.control_outlet('desk',{'on':'yes'})
