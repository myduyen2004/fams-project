import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:wifi_info_plugin_plus/wifi_info_plugin_plus.dart';
import 'dart:io';

class WifiService {
  static final WifiService _instance = WifiService._internal();
  factory WifiService() => _instance;
  WifiService._internal();

  final NetworkInfo _networkInfo = NetworkInfo();

  Future<Map<String, String>> getWifiDetails() async {
    // Request location permission (required for SSID/BSSID on Android 10+)
    var status = await Permission.locationWhenInUse.status;
    if (status.isDenied) {
      status = await Permission.locationWhenInUse.request();
    }

    if (status.isGranted) {
      try {
        final Map<String, String> details = {};
        
        // 1. Core Info (from network_info_plus)
        details['SSID'] = await _networkInfo.getWifiName() ?? 'N/A';
        details['BSSID'] = await _networkInfo.getWifiBSSID() ?? 'N/A';
        details['IP'] = await _networkInfo.getWifiIP() ?? 'N/A';

        // 2. Extra Info (Android only, from wifi_info_plugin_plus)
        if (Platform.isAndroid) {
          final wifiObject = await WifiInfoPlugin.wifiDetails;
          if (wifiObject != null) {
            details['Tần số'] = "${wifiObject.frequency} MHz";
            details['Tốc độ'] = "${wifiObject.linkSpeed} Mbps";
            details['RSSI'] = "${wifiObject.signalStrength} dBm";
          }
        }

        return details;
      } catch (e) {
        return {'Error': e.toString()};
      }
    } else {
      return {'Error': 'Quyền truy cập vị trí bị từ chối'};
    }
  }
}
