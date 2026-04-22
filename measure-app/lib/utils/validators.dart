String? validatePhone(String? value) {
  if (value == null || value.isEmpty) return '请输入手机号';
  if (!RegExp(r'^1[3-9]\d{9}$').hasMatch(value)) return '手机号格式不正确';
  return null;
}

String? validatePassword(String? value) {
  if (value == null || value.isEmpty) return '请输入密码';
  if (value.length < 6) return '密码至少 6 位';
  return null;
}

String? validateRequired(String? value, {String? field}) {
  if (value == null || value.isEmpty) return '${field ?? '此字段'}不能为空';
  return null;
}

String? validateNumber(String? value, {double? min, double? max, String? field}) {
  if (value == null || value.isEmpty) return '${field ?? '此字段'}不能为空';
  final n = double.tryParse(value);
  if (n == null) return '请输入有效数字';
  if (min != null && n < min) return '不能小于 $min';
  if (max != null && n > max) return '不能大于 $max';
  return null;
}
