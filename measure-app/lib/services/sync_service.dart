import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import 'db_service.dart';
import '../config/constants.dart';
import '../models/sync_queue.dart';

class SyncService {
  final ApiService _api = ApiService();
  final DbService _db = DbService();

  Future<void> enqueue(String type, int orderId, Map<String, dynamic> payload) async {
    await _db.insert('sync_queue', {
      'type': type,
      'order_id': orderId,
      'payload': jsonEncode(payload),
      'created_at': DateTime.now().toIso8601String(),
      'status': 'pending',
      'retry_count': 0,
    });
  }

  Future<void> syncAll() async {
    if (!await _api.isOnline) return;

    final items = await _db.query('sync_queue', where: "status = 'pending'", orderBy: 'created_at ASC');

    for (final itemMap in items) {
      final item = SyncQueueItem.fromMap(itemMap);
      try {
        final payload = jsonDecode(item.payload);
        String endpoint = '';
        switch (item.type) {
          case 'measurement':
            endpoint = '/api/v1/measurements';
            break;
          case 'construction':
            endpoint = '/api/v1/construction';
            break;
          case 'exception':
            endpoint = '/api/v1/exceptions';
            break;
        }

        await _api.post(endpoint, payload);

        // Mark as synced
        await _db.update('sync_queue', {'status': 'synced'}, where: 'id = ?', whereArgs: [item.id]);
      } catch (e) {
        await _db.update('sync_queue', {
          'status': 'failed',
          'error_msg': e.toString(),
          'retry_count': (item.retryCount) + 1,
        }, where: 'id = ?', whereArgs: [item.id]);
      }
    }

    // Update last sync time
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.keyLastSync, DateTime.now().toIso8601String());
  }

  Future<List<SyncQueueItem>> getPendingItems() async {
    final items = await _db.query('sync_queue', where: "status IN ('pending', 'failed')", orderBy: 'created_at DESC');
    return items.map(SyncQueueItem.fromMap).toList();
  }

  Future<Map<String, int>> getSyncStats() async {
    final all = await _db.query('sync_queue');
    int pending = 0, synced = 0, failed = 0;
    for (final item in all) {
      switch (item['status']) {
        case 'pending':
          pending++;
          break;
        case 'synced':
          synced++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }
    return {'pending': pending, 'synced': synced, 'failed': failed};
  }

  Future<String?> getLastSyncTime() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.keyLastSync);
  }
}
