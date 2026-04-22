import 'package:flutter/material.dart';
import '../models/work_order.dart';
import 'measurement_screen.dart';
import 'construction_screen.dart';

class TaskDetailScreen extends StatelessWidget {
  final WorkOrderModel task;

  const TaskDetailScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(task.orderNo)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(task.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                _infoRow('项目类型', task.projectType ?? '-'),
                _infoRow('地址', task.address),
                if (task.contactName != null) _infoRow('联系人', '${task.contactName} ${task.contactPhone ?? ''}'),
                if (task.description != null) _infoRow('需求描述', task.description!),
                if (task.deadline != null) _infoRow('截止日期', task.deadline!),
                const SizedBox(height: 8),
                Row(children: [
                  Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: task.statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)), child: Text(task.statusLabel, style: TextStyle(color: task.statusColor, fontSize: 12))),
                ]),
              ]),
            ),
          ),

          // Photos section
          if (task.photos != null && task.photos!.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('申报照片', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: task.photos!.length,
                itemBuilder: (_, i) => Container(
                  width: 100,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.image, color: Colors.grey),
                ),
              ),
            ),
          ],

          // Historical orders
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.history),
              title: const Text('历史工单参考（同地址）'),
              subtitle: const Text('查看该地址过往工单记录'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: () {
              if (task.taskType == 'measurement') {
                Navigator.push(context, MaterialPageRoute(builder: (_) => MeasurementScreen(orderId: task.id, orderNo: task.orderNo, title: task.title)));
              } else {
                Navigator.push(context, MaterialPageRoute(builder: (_) => ConstructionScreen(orderId: task.id, orderNo: task.orderNo, title: task.title)));
              }
            },
            child: Text(task.taskType == 'measurement' ? '开始测量' : '开始施工'),
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 80, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 14))),
      ]),
    );
  }
}
