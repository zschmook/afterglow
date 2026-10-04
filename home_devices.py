"""Standalone Kasa LAN controls adapted from M3U Picker movie_lighting.py.

The picker retains its own implementation. No picker installation is required.
"""
from __future__ import annotations

import ipaddress
import json
import socket
import re
import colorsys
from concurrent.futures import ThreadPoolExecutor
import home_config as app_config
import psutil
import threading


DISCOVERY_LOCK = threading.Lock()


def _integer(value, name, minimum, maximum):
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise ValueError(f"{name} must be a whole number from {minimum} to {maximum}.")
    return value


def _local_address(value):
    try:
        address = ipaddress.IPv4Address(value)
    except (ValueError, TypeError):
        raise ValueError("Choose a device with a valid private network address.") from None
    if not any(address in ipaddress.IPv4Network(network) for network in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")):
        raise ValueError("Choose a device on your private network.")
    return str(address)


def _light(value):
    if not isinstance(value, dict) or set(value) - {"ip", "name", "model", "device_id", "capabilities"} or not {"ip", "name", "model", "device_id"} <= set(value):
        raise ValueError("Choose an identified light from the list.")
    if any(not isinstance(value[field], str) or not value[field].strip() or len(value[field]) > 100
           for field in ("name", "model", "device_id")):
        raise ValueError("The light needs a name, model, and device identity.")
    item = {"ip": _local_address(value["ip"]), **{field: value[field].strip()
            for field in ("name", "model", "device_id")}}
    if "capabilities" in value:
        caps = value["capabilities"]
        if not isinstance(caps, dict) or set(caps) != {"dimming", "color", "color_temp"} or any(type(flag) is not bool for flag in caps.values()):
            raise ValueError("Invalid light capabilities.")
        item["capabilities"] = caps
    return item


def lights() -> list[dict]:
    return app_config.section("movie_light_devices").get("lights", [])


def outlets() -> list[dict]:
    """Return the locally saved outlets."""
    return app_config.section("movie_light_devices").get("outlets", [])


def _outlet(value):
    if not isinstance(value, dict) or set(value) != {"ip", "name", "model", "device_id"}:
        raise ValueError("Choose an identified outlet from the list.")
    return _light(value)


def remember_outlets(values) -> list[dict]:
    if not isinstance(values, list) or len(values) > 32:
        raise ValueError("Too many outlets.")
    identified = [_outlet(value) for value in values]
    if len({value["device_id"] for value in identified}) != len(identified):
        raise ValueError("Each outlet must have a different identity.")
    identified.sort(key=lambda value: (value["name"].casefold(), value["device_id"]))
    app_config.update_section("movie_light_devices", {"outlets": identified})
    return identified


def remember_lights(values) -> list[dict]:
    if not isinstance(values, list) or len(values) > 32:
        raise ValueError("Too many lights.")
    identified = [_light(value) for value in values]
    if len({value["device_id"] for value in identified}) != len(identified):
        raise ValueError("Each light must have a different device identity.")
    identified.sort(key=lambda value: (value["name"].casefold(), value["device_id"]))
    app_config.update_section("movie_light_devices", {"lights": identified})
    return identified


def _kasa_request(ip, command, timeout=2) -> dict | None:
    ip = _local_address(ip)
    encrypted = bytearray()
    key = 171
    for byte in json.dumps(command, separators=(",", ":")).encode("utf-8"):
        key ^= byte
        encrypted.append(key)
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as client:
            client.settimeout(timeout)
            client.sendto(encrypted, (ip, 9999))
            data, sender = client.recvfrom(8192)
        if sender != (ip, 9999):
            return None
        decoded = bytearray()
        key = 171
        for byte in data:
            decoded.append(key ^ byte)
            key = byte
        result = json.loads(decoded)
        return result if isinstance(result, dict) else None
    except (OSError, ValueError, TypeError):
        return None


def _read_product(ip, timeout=2) -> dict | None:
    """Read Kasa identity and capabilities; never send a control command."""
    reply = _kasa_request(ip, {"system": {"get_sysinfo": {}}}, timeout)
    system = reply.get("system") if isinstance(reply, dict) else None
    product = system.get("get_sysinfo") if isinstance(system, dict) else None
    return product if isinstance(product, dict) else None


def _identified_light(device_id):
    if not isinstance(device_id, str):
        raise ValueError("Choose a discovered light.")
    target = next((light for light in lights() if light["device_id"] == device_id), None)
    if target is None:
        raise ValueError("That light is not in the discovered devices list.")
    product = _read_product(target["ip"])
    if not product:
        raise ValueError("That light is offline. Try Refresh after it reconnects.")
    if product.get("deviceId") != target["device_id"] or product.get("model") != target["model"]:
        raise ValueError("The light at that address no longer matches the discovered device.")
    if not isinstance(product.get("light_state"), dict):
        raise ValueError("That device does not report a controllable light.")
    return target, product


def _identified_outlet(device_id):
    if not isinstance(device_id, str):
        raise ValueError("Choose a discovered outlet.")
    target = next((item for item in outlets() if item["device_id"] == device_id), None)
    if target is None:
        raise ValueError("That outlet is not in the discovered devices list.")
    product = _read_product(target["ip"])
    if not product:
        raise ValueError("That outlet is offline. Try Refresh after it reconnects.")
    if product.get("deviceId") != target["device_id"] or product.get("model") != target["model"]:
        raise ValueError("The outlet at that address no longer matches the discovered device.")
    if (product.get("children") or isinstance(product.get("light_state"), dict)
            or type(product.get("relay_state")) is not int or product["relay_state"] not in (0, 1)):
        raise ValueError("That device does not report a single controllable outlet.")
    return target, product


def outlet_state(device_id) -> dict:
    target, product = _identified_outlet(device_id)
    return {"device_id": target["device_id"], "name": target["name"], "on": bool(product["relay_state"])}


def control_outlet(device_id, changes) -> dict:
    if not isinstance(changes, dict) or set(changes) != {"on"} or type(changes["on"]) is not bool:
        raise ValueError("Choose an on/off change for the outlet.")
    target, _ = _identified_outlet(device_id)
    response = _kasa_request(target["ip"], {"system": {"set_relay_state": {"state": int(changes["on"])}}})
    service = response.get("system") if isinstance(response, dict) else None
    acknowledgement = service.get("set_relay_state") if isinstance(service, dict) else None
    if not isinstance(acknowledgement, dict) or acknowledgement.get("err_code") != 0:
        raise ValueError("The outlet did not confirm that change.")
    return outlet_state(device_id)


def light_state(device_id) -> dict:
    target, product = _identified_light(device_id)
    state = product["light_state"]
    if type(state.get("on_off")) is not int or state["on_off"] not in (0, 1):
        raise ValueError("The light did not report its power state.")
    dimmable = product.get("is_dimmable") in (1, True)
    brightness = state.get("brightness") if type(state.get("brightness")) is int else None
    color = product.get("is_color") in (1, True)
    color_temp = product.get("is_variable_color_temp") in (1, True)
    reported_range = product.get("color_temp_range")
    temperature_range = (2500, 6500)
    if (isinstance(reported_range, (list, tuple)) and len(reported_range) == 2
            and all(type(value) is int for value in reported_range)
            and 1000 <= reported_range[0] < reported_range[1] <= 10000):
        temperature_range = tuple(reported_range)
    current_temperature = state.get("color_temp")
    current_temperature = (current_temperature if type(current_temperature) is int
                           and temperature_range[0] <= current_temperature <= temperature_range[1] else None)
    hue = state.get("hue")
    saturation = state.get("saturation")
    current_color = None
    if color and type(hue) is int and type(saturation) is int and 0 <= hue <= 360 and 0 <= saturation <= 100:
        red, green, blue = colorsys.hsv_to_rgb(hue / 360, saturation / 100, 1)
        current_color = f"#{round(red * 255):02x}{round(green * 255):02x}{round(blue * 255):02x}"
    return {"device_id": target["device_id"], "name": target["name"],
            "on": state["on_off"] == 1, "brightness": brightness if dimmable else None,
            "dimmable": dimmable, "color_capable": color, "color": current_color,
            "color_temp_capable": color_temp, "color_temp": current_temperature if color_temp else None,
            "color_temp_min": temperature_range[0] if color_temp else None,
            "color_temp_max": temperature_range[1] if color_temp else None}


def control_light(device_id, changes) -> dict:
    if not isinstance(changes, dict) or len(changes) != 1:
        raise ValueError("Choose one light control to change.")
    if "on" in changes:
        if type(changes["on"]) is not bool:
            raise ValueError("Power must be on or off.")
        desired = {"on_off": int(changes["on"])}
    elif "brightness" in changes:
        desired = {"brightness": _integer(changes["brightness"], "Brightness", 1, 100)}
    elif "color" in changes:
        value = _color(changes["color"], "Color")
        if value is None:
            raise ValueError("Choose a color for this light.")
        desired = {"color_temp": 0, **_hsv(value)}
    elif "color_temp" in changes:
        desired = {"color_temp": _integer(changes["color_temp"], "White temperature", 1000, 10000)}
    else:
        raise ValueError("Choose one light control to change.")
    target, product = _identified_light(device_id)
    if "color" in changes and product.get("is_color") not in (1, True):
        raise ValueError("This light does not support color.")
    if "color_temp" in changes:
        if product.get("is_variable_color_temp") not in (1, True):
            raise ValueError("This light does not support white temperature.")
        reported_range = product.get("color_temp_range")
        minimum, maximum = (reported_range if isinstance(reported_range, (list, tuple))
                            and len(reported_range) == 2 and all(type(value) is int for value in reported_range)
                            and 1000 <= reported_range[0] < reported_range[1] <= 10000 else (2500, 6500))
        if not minimum <= desired["color_temp"] <= maximum:
            raise ValueError(f"White temperature must be from {minimum} to {maximum} K for this light.")
    if "on" not in changes:
        if product.get("is_dimmable") not in (1, True):
            if "brightness" in changes:
                raise ValueError("This light does not support dimming.")
        if product["light_state"].get("on_off") != 1:
            raise ValueError("Turn the light on before changing it.")
    response = _kasa_request(target["ip"], {
        "smartlife.iot.smartbulb.lightingservice": {"transition_light_state": {**desired, "transition_period": 0}}})
    service = response.get("smartlife.iot.smartbulb.lightingservice") if isinstance(response, dict) else None
    acknowledgement = service.get("transition_light_state") if isinstance(service, dict) else None
    if not isinstance(acknowledgement, dict) or acknowledgement.get("err_code") != 0:
        raise ValueError("The light did not confirm that change.")
    return light_state(device_id)


def _read_device(ip, timeout=2):
    product = _read_product(ip, timeout)
    if not product:
        return None
    identity = {"ip": ip, "name": product.get("alias"), "model": product.get("model"),
                "device_id": product.get("deviceId")}
    try:
        if isinstance(product.get("light_state"), dict):
            identity["capabilities"] = {
                "dimming": product.get("is_dimmable") == 1,
                "color": product.get("is_color") == 1,
                "color_temp": product.get("is_variable_color_temp") == 1,
            }
            return "light", _light(identity)
        if product.get("relay_state") in (0, 1):
            return "outlet", _outlet(identity)
    except ValueError:
        return None
    return None


def _read_light(ip) -> dict | None:
    found = _read_device(ip)
    return found[1] if found and found[0] == "light" else None


def _read_outlet(ip) -> dict | None:
    found = _read_device(ip)
    return found[1] if found and found[0] == "outlet" else None


def refresh_lights() -> dict:
    existing = lights()
    addresses = list(dict.fromkeys(value["ip"] for value in existing))
    with ThreadPoolExecutor(max_workers=4) as pool:
        observed = list(pool.map(_read_light, addresses))
    refreshed = {value["device_id"]: value for value in existing}
    for value in observed:
        if value:
            refreshed[value["device_id"]] = value
    # Keep unavailable bulbs listed so they can respond on a later refresh.
    saved = remember_lights(list(refreshed.values()))
    existing_outlets = outlets()
    with ThreadPoolExecutor(max_workers=4) as pool:
        observed_outlets = list(pool.map(_read_outlet, dict.fromkeys(value["ip"] for value in existing_outlets)))
    refreshed_outlets = {value["device_id"]: value for value in existing_outlets}
    for value in observed_outlets:
        if value:
            refreshed_outlets[value["device_id"]] = value
    saved_outlets = remember_outlets(list(refreshed_outlets.values()))
    return {"lights": saved, "outlets": saved_outlets,
            "responding": sum(value is not None for value in observed + observed_outlets)}


def discover_devices() -> dict:
    """Query local private IPv4 /24 networks for supported Kasa devices."""
    networks = set()
    for addresses in psutil.net_if_addrs().values():
        for address in addresses:
            if address.family == socket.AF_INET:
                try:
                    host = _local_address(address.address)
                    networks.add(ipaddress.IPv4Network(f"{host}/24", strict=False))
                except ValueError:
                    continue
    if not networks:
        raise ValueError("Connect this computer to your home Wi-Fi or Ethernet, then try Find devices again.")
    # Bound discovery to eight local /24 networks; discovery never sends controls.
    if len(networks) > 8:
        raise ValueError("Too many network adapters. Disconnect unused adapters and try again.")
    with DISCOVERY_LOCK, ThreadPoolExecutor(max_workers=32) as pool:
        found = list(pool.map(lambda address: _read_device(str(address), timeout=0.6),
                              (ip for network in sorted(networks) for ip in network.hosts())))
    found_lights = {value["device_id"]: value for value in lights()}
    found_outlets = {value["device_id"]: value for value in outlets()}
    responding = 0
    for item in found:
        if not item:
            continue
        kind, value = item
        responding += 1
        if kind == "light":
            found_lights[value["device_id"]] = value
        else:
            found_outlets[value["device_id"]] = value
    return {"lights": remember_lights(list(found_lights.values())),
            "outlets": remember_outlets(list(found_outlets.values())), "responding": responding}


def _color(value, label):
    if value is None:
        return None
    if not isinstance(value, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        raise ValueError(f"{label} must be a six-digit color or off.")
    return value.upper()


def _hsv(value):
    if not value:
        return None
    red, green, blue = (int(value[index:index + 2], 16) / 255 for index in (1, 3, 5))
    hue, saturation, _ = colorsys.rgb_to_hsv(red, green, blue)
    return {"hue": round(hue * 360) % 360, "saturation": round(saturation * 100)}
