import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../config/constants.dart';
import 'sync_status_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      appBar: AppBar(title: const Text('个人设置')),
      body: Column(
        children: [
          // User info card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [Color(0xFF1565C0), Color(0xFF1E88E5)]),
            ),
            child: Row(
              children: [
                CircleAvatar(radius: 32, backgroundColor: Colors.white24, child: Text(user?.name.substring(0, 1) ?? '?', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white))),
                const SizedBox(width: 16),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user?.name ?? '用户', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                  Text(user?.roleLabel ?? '', style: const TextStyle(fontSize: 14, color: Colors.white70)),
                  Text(user?.department ?? '', style: const TextStyle(fontSize: 14, color: Colors.white70)),
                  Text('手机号: ${user?.phone ?? ''}', style: const TextStyle(fontSize: 14, color: Colors.white70)),
                ]),
              ],
            ),
          ),

          // Menu items
          _menuItem(Icons.sync, '同步状态', onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SyncStatusScreen()))),
          _menuItem(Icons.lock, '修改密码'),
          _menuItem(Icons.delete_sweep, '缓存清理', onTap: () => _clearCache(context)),
          _menuItem(Icons.info, '关于我们', onTap: () => _showAbout(context)),
          const Divider(height: 24),
          _menuItem(Icons.logout, '退出登录', color: Colors.red, onTap: () => _confirmLogout(context)),

          const Spacer(),
          Text('v${AppConstants.appVersion}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _menuItem(IconData icon, String title, {Color? color, VoidCallback? onTap}) {
    return ListTile(leading: Icon(icon, color: color), title: Text(title, style: TextStyle(color: color)), trailing: const Icon(Icons.chevron_right, color: Colors.grey), onTap: onTap ?? () {});
  }

  void _clearCache(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('缓存已清理')));
  }

  void _showAbout(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const AlertDialog(
        title: Text('关于'),
        content: Text('测量施工助手 v1.0.0\n\n用于现场测量数据采集、施工记录、离线同步和进度跟踪。'),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('确认退出'),
        content: const Text('退出后需要重新登录'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('取消')),
          ElevatedButton(
            onPressed: () {
              context.read<AuthProvider>().logout();
              Navigator.of(context).popUntil((r) => r.isFirst);
              Navigator.pushReplacementNamed(context, '/login');
            },
            child: const Text('退出'),
          ),
        ],
      ),
    );
  }
}
