import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'db_service.dart';
import '../config/constants.dart';
import '../models/user.dart';

class AuthService {
  final ApiService _api = ApiService();
  final DbService _db = DbService();

  Future<UserModel?> login(String phone, String password, {bool remember = false}) async {
    final res = await _api.post('/api/v1/auth/tenant/login', {
      'phone': phone,
      'password': password,
    });

    final token = res['data']['token'];
    final user = UserModel.fromJson(res['data']['user']);

    _api.setToken(token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.keyToken, token);
    await prefs.setString(AppConstants.keyUser, jsonEncode(user.toJson()));
    if (remember) {
      await prefs.setBool(AppConstants.keyRememberMe, true);
    }

    // Cache tasks
    await _cacheTasks();

    return user;
  }

  Future<void> logout() async {
    _api.setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.keyToken);
    await prefs.remove(AppConstants.keyUser);
  }

  Future<UserModel?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(AppConstants.keyUser);
    if (userJson != null) {
      return UserModel.fromJson(jsonDecode(userJson));
    }
    return null;
  }

  Future<String?> getSavedToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.keyToken);
  }

  Future<bool> isRememberMe() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(AppConstants.keyRememberMe) ?? false;
  }

  Future<void> _cacheTasks() async {
    try {
      final res = await _api.get('/api/v1/tasks');
      final db = await _db.database;
      await db.delete('tasks');
      final List<dynamic> tasks = res['data'] ?? [];
      for (final t in tasks) {
        await db.insert('tasks', {
          'id': t['id'],
          'order_no': t['order_no'],
          'title': t['title'],
          'task_type': t['task_type'],
          'address': t['address'],
          'deadline': t['deadline'],
          'cached_at': DateTime.now().toIso8601String(),
        });
      }
    } catch (_) {
      // Offline: use cached data
    }
  }
}
