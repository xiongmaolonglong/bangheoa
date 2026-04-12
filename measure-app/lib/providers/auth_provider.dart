import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _auth = AuthService();
  UserModel? _user;
  bool _isLoggedIn = false;

  UserModel? get user => _user;
  bool get isLoggedIn => _isLoggedIn;

  Future<void> checkSavedLogin() async {
    final token = await _auth.getSavedToken();
    if (token != null) {
      _user = await _auth.getSavedUser();
      if (_user != null) {
        _isLoggedIn = true;
      }
    }
    notifyListeners();
  }

  Future<bool> login(String phone, String password, {bool remember = false}) async {
    try {
      _user = await _auth.login(phone, password, remember: remember);
      _isLoggedIn = true;
      notifyListeners();
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    await _auth.logout();
    _user = null;
    _isLoggedIn = false;
    notifyListeners();
  }
}
