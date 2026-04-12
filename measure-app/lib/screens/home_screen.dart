import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/sync_service.dart';
import '../models/work_order.dart';
import 'task_detail_screen.dart';
import 'sync_status_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isOnline = true;
  String _activeTab = 'measure'; // 'measure' | 'construct'
  final _syncService = SyncService();
  int _pendingCount = 5;
  int _completedCount = 23;

  // Demo data
  final List<WorkOrderModel> _measureTasks = [
    const WorkOrderModel(id: 1, orderNo: 'GG-2026-0001', title: 'XX门店招牌', taskType: 'measurement', address: '长沙岳麓区XX路128号', deadline: '2026-04-20', status: 'pending', projectType: '门头招牌'),
    const WorkOrderModel(id: 2, orderNo: 'GG-2026-0002', title: 'XX超市灯箱', taskType: 'measurement', address: '长沙天心区XX街56号', deadline: '2026-04-22', status: 'pending', projectType: '灯箱广告'),
    const WorkOrderModel(id: 3, orderNo: 'GG-2026-0005', title: 'XX商场导视系统', taskType: 'measurement', address: '长沙开福区XX路88号', deadline: '2026-04-25', status: 'overdue', projectType: '室内广告'),
  ];

  final List<WorkOrderModel> _constructTasks = [
    const WorkOrderModel(id: 4, orderNo: 'GG-2026-0003', title: 'XX酒店户外大牌', taskType: 'construction', address: '长沙芙蓉区XX大道99号', deadline: '2026-04-18', status: 'pending', projectType: '户外大牌'),
    const WorkOrderModel(id: 5, orderNo: 'GG-2026-0004', title: 'XX广场LED屏', taskType: 'construction', address: '长沙雨花区XX路66号', deadline: '2026-04-28', status: 'pending', projectType: 'LED大屏'),
  ];

  List<WorkOrderModel> get _tasks => _activeTab == 'measure' ? _measureTasks : _constructTasks;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(
        title: Text('你好，${user?.name ?? '用户'}'),
        actions: [
          IconButton(icon: const Icon(Icons.sync), onPressed: _doSync),
          IconButton(icon: const Icon(Icons.person), onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()))),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Stats
            Row(
              children: [
                _buildStatCard('待${_activeTab == 'measure' ? '测量' : '施工'}', '$_pendingCount', const Color(0xFFFFA000)),
                const SizedBox(width: 12),
                _buildStatCard('已完成', '$_completedCount', const Color(0xFF43A047)),
              ],
            ),
            const SizedBox(height: 16),

            // Online status
            Row(
              children: [
                Icon(_isOnline ? Icons.wifi : Icons.wifi_off, size: 18, color: _isOnline ? Colors.green : Colors.red),
                const SizedBox(width: 6),
                Text(_isOnline ? '在线' : '离线', style: TextStyle(color: _isOnline ? Colors.green : Colors.red, fontSize: 14)),
                const Spacer(),
                TextButton.icon(onPressed: _doSync, icon: const Icon(Icons.sync, size: 18), label: const Text('同步数据')),
              ],
            ),
            const SizedBox(height: 8),

            // Tab switch
            Container(
              decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: [
                  _buildTab('measure', '测量任务'),
                  _buildTab('construct', '施工任务'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Task list
            const Text('待办任务', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ..._tasks.map((t) => _buildTaskCard(t)),

            if (_tasks.isEmpty)
              Container(padding: const EdgeInsets.all(40), alignment: Alignment.center, child: Text('暂无${_activeTab == 'measure' ? '测量' : '施工'}任务', style: const TextStyle(color: Colors.grey))),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
        ]),
      ),
    );
  }

  Widget _buildTab(String key, String label) {
    final active = _activeTab == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTab = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: active ? const Color(0xFF1565C0) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(label, textAlign: TextAlign.center, style: TextStyle(color: active ? Colors.white : Colors.grey[700], fontWeight: active ? FontWeight.bold : FontWeight.normal, fontSize: 14)),
        ),
      ),
    );
  }

  Widget _buildTaskCard(WorkOrderModel task) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: task.statusColor, child: Text(task.orderNo.split('-').last.substring(0, 2), style: const TextStyle(color: Colors.white, fontSize: 12))),
        title: Text(task.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(task.address, style: const TextStyle(fontSize: 12, color: Colors.grey)), if (task.deadline != null) Text('截止: ${task.deadline}', style: const TextStyle(fontSize: 12, color: Colors.orange))]),
        trailing: ElevatedButton(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => TaskDetailScreen(task: task))), child: const Text('进入', style: TextStyle(fontSize: 12))),
      ),
    );
  }

  Future<void> _doSync() async {
    await _syncService.syncAll();
    final stats = await _syncService.getSyncStats();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('同步完成 - 待同步: ${stats['pending']}, 已同步: ${stats['synced']}')));
    }
  }

  Future<void> _refresh() async {
    await Future.delayed(const Duration(seconds: 1));
  }
}
