import 'package:flutter/material.dart';
import '../services/sync_service.dart';
import '../models/sync_queue.dart';

class SyncStatusScreen extends StatefulWidget {
  const SyncStatusScreen({super.key});

  @override
  State<SyncStatusScreen> createState() => _SyncStatusScreenState();
}

class _SyncStatusScreenState extends State<SyncStatusScreen> {
  final _syncService = SyncService();
  Map<String, int> _stats = {'pending': 0, 'synced': 0, 'failed': 0};
  List<SyncQueueItem> _items = [];
  String? _lastSync;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final stats = await _syncService.getSyncStats();
    final items = await _syncService.getPendingItems();
    final lastSync = await _syncService.getLastSyncTime();
    setState(() {
      _stats = stats;
      _items = items;
      _lastSync = lastSync;
    });
  }

  Future<void> _doSync() async {
    setState(() => _syncing = true);
    await _syncService.syncAll();
    setState(() => _syncing = false);
    await _loadData();
  }

  Future<void> _retryItem(SyncQueueItem item) async {
    await _syncService.syncAll();
    await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('数据同步')),
      body: Column(
        children: [
          // Stats card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)]),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _statItem('待同步', '${_stats['pending']}', Colors.orange),
                    _statItem('已同步', '${_stats['synced']}', Colors.green),
                    _statItem('同步失败', '${_stats['failed']}', Colors.red),
                  ],
                ),
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (_lastSync != null) Text('上次同步: ${_lastSync!.substring(0, 16).replaceFirst('T', ' ')}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    ElevatedButton.icon(onPressed: _syncing ? null : _doSync, icon: _syncing ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.sync), label: Text(_syncing ? '同步中...' : '立即同步')),
                  ],
                ),
              ],
            ),
          ),

          // Pending list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                if (_items.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('没有待同步数据', style: TextStyle(color: Colors.grey)))),
                const Text('待同步列表', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ..._items.map((item) => Card(
                  child: ListTile(
                    leading: Icon(item.status == 'failed' ? Icons.error_outline : Icons.pending, color: item.status == 'failed' ? Colors.red : Colors.orange),
                    title: Text('${item.type == 'measurement' ? '测量数据' : item.type == 'construction' ? '施工记录' : '异常上报'}'),
                    subtitle: Text('工单ID: ${item.orderId}'),
                    trailing: item.status == 'failed'
                        ? TextButton(onPressed: () => _retryItem(item), child: const Text('重试'))
                        : Text('等待中', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  ),
                )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statItem(String label, String value, Color color) {
    return Column(children: [Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color)), const SizedBox(height: 4), Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey))]);
  }
}
