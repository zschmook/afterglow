import io
import unittest
from unittest.mock import patch
import server

class HomeRefreshTests(unittest.TestCase):
    def setUp(self):
        server.HOME_STATES.clear()

    def test_background_reads_devices_without_discovery_or_control(self):
        with patch('server.home_request', side_effect=[{'lights':[{'device_id':'one'}], 'outlets':[{'device_id':'two'}]}, {'on':True}, {'on':False}]) as request:
            server.refresh_home_states()
        self.assertEqual(request.call_args_list[1].args, ('/api/home/lights/one/state',))
        self.assertEqual(request.call_args_list[2].args, ('/api/home/outlets/two/state',))
        self.assertTrue(request.call_args_list[1].kwargs['fresh'])

    def test_cached_state_and_control_readback(self):
        with patch('server.home_devices.light_state', return_value={'on':True}) as reader, patch('server.home_devices.control_light', return_value={'on':False}) as controller:
            server.home_request('/api/home/lights/one/state', fresh=True)
            self.assertTrue(server.home_request('/api/home/lights/one/state')['on'])
            server.home_request('/api/home/lights/one/control', 'POST', {'on':False})
            self.assertFalse(server.home_request('/api/home/lights/one/state')['on'])
        reader.assert_called_once_with('one')
        controller.assert_called_once_with('one', {'on':False})
