import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:connectivity_plus/connectivity_plus.dart';
import '../config/constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  Future<bool> get isOnline async {
    final result = await Connectivity().checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? headers}) async {
    final res = await http.get(
      Uri.parse('${AppConstants.baseUrl}$path'),
      headers: _buildHeaders(headers),
    );
    return _handleResponse(res);
  }

  Future<Map<String, dynamic>> post(String path, dynamic body, {Map<String, String>? headers}) async {
    final res = await http.post(
      Uri.parse('${AppConstants.baseUrl}$path'),
      headers: _buildHeaders(headers),
      body: jsonEncode(body),
    );
    return _handleResponse(res);
  }

  Future<Map<String, dynamic>> put(String path, dynamic body, {Map<String, String>? headers}) async {
    final res = await http.put(
      Uri.parse('${AppConstants.baseUrl}$path'),
      headers: _buildHeaders(headers),
      body: jsonEncode(body),
    );
    return _handleResponse(res);
  }

  Map<String, String> _buildHeaders(Map<String, String>? extra) {
    final h = {'Content-Type': 'application/json'};
    if (_token != null) h['Authorization'] = 'Bearer $_token';
    if (extra != null) h.addAll(extra);
    return h;
  }

  Map<String, dynamic> _handleResponse(http.Response res) {
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    }
    throw Exception('HTTP ${res.statusCode}: ${res.body}');
  }
}
