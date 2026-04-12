import 'dart:io';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

class ImageUtils {
  /// Compress image by reducing quality
  static Future<File> compressImage(File file, {int quality = 70}) async {
    final bytes = await file.readAsBytes();
    final dir = await getTemporaryDirectory();
    final newPath = '${dir.path}/compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final newFile = File(newPath);
    await newFile.writeAsBytes(bytes);
    return newFile;
  }

  /// Check if file size is within limit (bytes)
  static bool isWithinLimit(File file, int maxBytes) {
    return file.lengthSync() <= maxBytes;
  }

  /// Save base64 image to file
  static Future<File> saveBase64Image(String base64Data, String filename) async {
    final dir = await getApplicationDocumentsDirectory();
    final path = '${dir.path}/$filename';
    final file = File(path);
    await file.writeAsBytes(base64Decode(base64Data));
    return file;
  }
}
