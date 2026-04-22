import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import '../services/db_service.dart';
import '../services/sync_service.dart';

class ConstructionScreen extends StatefulWidget {
  final int orderId;
  final String orderNo;
  final String title;

  const ConstructionScreen({super.key, required this.orderId, required this.orderNo, required this.title});

  @override
  State<ConstructionScreen> createState() => _ConstructionScreenState();
}

class _ConstructionScreenState extends State<ConstructionScreen> {
  final DbService _db = DbService();
  final SyncService _sync = SyncService();

  final List<String> _beforePhotos = [];
  final List<String> _duringPhotos = [];
  final List<String> _afterPhotos = [];
  final _notesCtrl = TextEditingController();
  DateTime? _startTime;
  DateTime? _endTime;

  Duration get _duration {
    if (_startTime == null || _endTime == null) return Duration.zero;
    return _endTime!.difference(_startTime!);
  }

  String get _durationLabel {
    final d = _duration;
    return '${d.inHours}小时${d.inMinutes.remainder(60)}分';
  }

  void _addPhoto(List<String> list) {
    setState(() => list.add('placeholder_${list.length + 1}'));
  }

  Future<void> _submit() async {
    final data = {
      'order_id': widget.orderId,
      'before_photos': _beforePhotos,
      'during_photos': _duringPhotos,
      'after_photos': _afterPhotos,
      'notes': _notesCtrl.text,
      'duration': _durationLabel,
      'start_time': _startTime?.toIso8601String(),
      'end_time': _endTime?.toIso8601String(),
    };

    await _sync.enqueue('construction', widget.orderId, data);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('施工记录已提交')));
      Navigator.pop(context);
    }
  }

  void _showExceptionDialog() {
    String issueType = '尺寸不符';
    String desc = '';
    String urgency = '一般';

    showDialog(
      context: context,
      builder: (_) {
        return StatefulBuilder(
          builder: (ctx, set) => AlertDialog(
            title: const Text('上报异常'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: issueType,
                  items: ['尺寸不符', '现场条件变化', '材料不匹配', '其他'].map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                  onChanged: (v) => set(() => issueType = v!),
                  decoration: const InputDecoration(labelText: '问题类型'),
                ),
                const SizedBox(height: 8),
                TextField(maxLines: 3, onChanged: (v) => desc = v, decoration: const InputDecoration(labelText: '描述', border: OutlineInputBorder())),
                const SizedBox(height: 8),
                ToggleButtons(
                  isSelected: [urgency == '一般', urgency == '紧急'],
                  onPressed: (i) => set(() => urgency = i == 0 ? '一般' : '紧急'),
                  borderRadius: BorderRadius.circular(8),
                  children: const [Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Text('一般')), Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Text('紧急'))],
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
              ElevatedButton(onPressed: () async {
                await _sync.enqueue('exception', widget.orderId, {'type': issueType, 'description': desc, 'urgency': urgency});
                Navigator.pop(ctx);
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('异常已上报')));
              }, child: const Text('提交')),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('施工记录 - ${widget.orderNo}'),
        actions: [
          IconButton(onPressed: _showExceptionDialog, icon: const Icon(Icons.warning_amber), tooltip: '上报异常'),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _photoSection('施工前照片', _beforePhotos, Colors.grey),
          _photoSection('施工中照片', _duringPhotos, Colors.blue),
          _photoSection('施工后照片', _afterPhotos, Colors.green),
          const SizedBox(height: 16),
          TextField(controller: _notesCtrl, maxLines: 3, decoration: const InputDecoration(labelText: '施工备注', border: OutlineInputBorder())),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('施工计时', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _startTime == null ? () => setState(() => _startTime = DateTime.now()) : () => setState(() => _startTime = null),
                          icon: Icon(_startTime == null ? Icons.play_arrow : Icons.stop),
                          label: Text(_startTime == null ? '开始计时' : '停止'),
                          style: ElevatedButton.styleFrom(backgroundColor: _startTime != null && _endTime == null ? Colors.orange : null),
                        ),
                      ),
                      const SizedBox(width: 12),
                      if (_startTime != null && _endTime == null)
                        Expanded(
                          child: ElevatedButton.icon(onPressed: () => setState(() => _endTime = DateTime.now()), icon: const Icon(Icons.flag), label: const Text('结束')),
                        ),
                    ],
                  ),
                  if (_startTime != null) ...[
                    const SizedBox(height: 8),
                    Text('共计: $_durationLabel', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1565C0))),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('客户签名确认：', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Container(
            height: 160,
            decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(8)),
            child: const Center(child: Text('点击签名', style: TextStyle(color: Colors.grey))),
          ),
          const SizedBox(height: 24),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: () => _db.insert('construction_drafts', {'order_id': widget.orderId, 'notes': _notesCtrl.text, 'created_at': DateTime.now().toIso8601String(), 'status': 'draft'}).then((_) => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('草稿已保存'))))), child: const Text('保存草稿')),
              const SizedBox(width: 12),
              Expanded(child: ElevatedButton(onPressed: _submit, child: const Text('提交完成'))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _photoSection(String title, List<String> photos, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          SizedBox(
            height: 100,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                ...photos.map((p) => Container(width: 100, height: 100, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.image, color: Colors.grey))),
                GestureDetector(
                  onTap: () => _addPhoto(photos),
                  child: Container(width: 100, height: 100, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(border: Border.all(color: color, style: BorderStyle.dash), borderRadius: BorderRadius.circular(8)), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.add_a_photo, color: color), Text('拍照', style: TextStyle(color: color, fontSize: 12))])),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
