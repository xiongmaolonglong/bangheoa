import 'package:intl/intl.dart';

String formatDate(String? isoDate) {
  if (isoDate == null) return '-';
  try {
    final dt = DateTime.parse(isoDate);
    return DateFormat('yyyy-MM-dd HH:mm').format(dt);
  } catch (_) {
    return isoDate;
  }
}

String formatFileSize(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
}

String maskPhone(String phone) {
  if (phone.length < 7) return phone;
  return '${phone.substring(0, 3)}****${phone.substring(phone.length - 4)}';
}
