import 'package:flutter/material.dart';

class OfflineIndicator extends StatelessWidget implements PreferredSizeWidget {
  final bool isOnline;
  final VoidCallback? onSync;

  const OfflineIndicator({super.key, required this.isOnline, this.onSync});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: isOnline ? Colors.green[100] : Colors.red[100],
      child: Row(
        children: [
          Icon(isOnline ? Icons.wifi : Icons.wifi_off, size: 16, color: isOnline ? Colors.green : Colors.red),
          const SizedBox(width: 6),
          Text(isOnline ? '在线' : '离线', style: TextStyle(color: isOnline ? Colors.green : Colors.red, fontSize: 12)),
          const Spacer(),
          if (onSync != null)
            TextButton(onPressed: onSync, child: Text(isOnline ? '同步数据' : '等待网络', style: TextStyle(color: isOnline ? Colors.green : Colors.red, fontSize: 12))),
        ],
      ),
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(32);
}
