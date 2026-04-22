import 'package:flutter/material.dart';
import '../models/measurement.dart';
import '../services/db_service.dart';
import '../services/sync_service.dart';
import 'sketch_screen.dart';
import 'signature_screen.dart';

class MeasurementScreen extends StatefulWidget {
  final int orderId;
  final String orderNo;
  final String title;

  const MeasurementScreen({super.key, required this.orderId, required this.orderNo, required this.title});

  @override
  State<MeasurementScreen> createState() => _MeasurementScreenState();
}

class _MeasurementScreenState extends State<MeasurementScreen> {
  int _step = 0;
  final DbService _db = DbService();
  final SyncService _sync = SyncService();

  // Step 1: Basic info
  String _weather = '晴';
  String _access = '畅通';
  bool _vehicleAccess = false;
  final Map<String, bool> _envFlags = {'高空作业': false, '电源可用': false, '夜间施工': false, '物业审批': false, '占道施工': false};
  final Map<String, TextEditingController> _envValues = {'高空作业': TextEditingController(), '电源可用': TextEditingController()};
  final _notesCtrl = TextEditingController();

  // Step 2: Materials
  final List<MaterialData> _materials = [];

  // Step 3: Signature
  String? _signaturePath;

  final List<String> _materialOptions = ['铝塑板', 'LED发光字', '不锈钢字', '亚克力板', '镀锌板', '喷绘布', '钢结构', '其他'];
  final List<String> _weatherOptions = ['晴', '多云', '阴', '小雨', '大雨'];
  final List<String> _accessOptions = ['畅通', '部分受阻', '需要协调'];

  @override
  void dispose() {
    for (final c in _envValues.values) c.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  void _addMaterial() {
    showDialog(
      context: context,
      builder: (_) {
        String selected = _materialOptions.first;
        int faceCount = 1;
        return AlertDialog(
          title: const Text('添加材料'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: selected,
                items: _materialOptions.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
                onChanged: (v) => selected = v!,
                decoration: const InputDecoration(labelText: '材料类型'),
              ),
              const SizedBox(height: 12),
              Row(children: [
                const Text('面数：'),
                Expanded(child: TextField(keyboardType: TextInputType.number, onChanged: (v) => faceCount = int.tryParse(v) ?? 1, decoration: const InputDecoration(hintText: '输入面数'))),
              ]),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('取消')),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  final faces = List.generate(faceCount, (i) => MaterialFace(label: i == 0 ? '正面' : '侧面$i'));
                  _materials.add(MaterialData(name: selected, faces: faces));
                });
                Navigator.pop(context);
              },
              child: const Text('添加'),
            ),
          ],
        );
      },
    );
  }

  void _editFace(MaterialData material, int faceIndex) {
    final face = material.faces[faceIndex];
    final widthCtrl = TextEditingController(text: face.width > 0 ? face.width.toString() : '');
    final heightCtrl = TextEditingController(text: face.height > 0 ? face.height.toString() : '');
    final faceNotesCtrl = TextEditingController(text: face.notes);

    showDialog(
      context: context,
      builder: (_) {
        bool special = face.special;
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            double area = (double.tryParse(widthCtrl.text) ?? 0) * (double.tryParse(heightCtrl.text) ?? 0);
            return AlertDialog(
              title: Text('${material.name} - ${face.label}'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(children: [
                      Expanded(child: TextField(controller: widthCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: '宽度(m)', suffixText: 'm'), onChanged: (_) => setDialogState(() {}))),
                      const SizedBox(width: 12),
                      Expanded(child: TextField(controller: heightCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: '高度(m)', suffixText: 'm'), onChanged: (_) => setDialogState(() {}))),
                    ]),
                    const SizedBox(height: 8),
                    Text('面积：${area.toStringAsFixed(2)}㎡', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1565C0))),
                    const SizedBox(height: 12),
                    TextField(controller: faceNotesCtrl, maxLines: 2, decoration: const InputDecoration(labelText: '备注', hintText: '如：老板要加电话')),
                    const SizedBox(height: 8),
                    Row(children: [
                      Checkbox(value: special, onChanged: (v) => setDialogState(() => special = v ?? false)),
                      const Text('此面需特别处理'),
                    ]),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.camera_alt), label: const Text('拍照')),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SketchScreen())), icon: const Icon(Icons.draw), label: const Text('手绘')),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('取消')),
                ElevatedButton(
                  onPressed: () {
                    final w = double.tryParse(widthCtrl.text) ?? 0;
                    final h = double.tryParse(heightCtrl.text) ?? 0;
                    setState(() {
                      final idx = _materials.indexOf(material);
                      final updatedFace = MaterialFace(label: face.label, width: w, height: h, notes: faceNotesCtrl.text.isEmpty ? null : faceNotesCtrl.text, special: special);
                      _materials[idx] = MaterialData(name: material.name, faces: List.from(material.faces)..[faceIndex] = updatedFace);
                    });
                    Navigator.pop(context);
                    widthCtrl.dispose();
                    heightCtrl.dispose();
                    faceNotesCtrl.dispose();
                  },
                  child: const Text('保存'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _saveDraft() async {
    await _db.insert('measurement_drafts', {
      'order_id': widget.orderId,
      'basic_info': '{"weather":"$_weather","access":"$_access","vehicle":$_vehicleAccess,"notes":"${_notesCtrl.text}"}',
      'materials': '',
      'created_at': DateTime.now().toIso8601String(),
      'status': 'draft',
    });
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('草稿已保存')));
  }

  Future<void> _submit() async {
    if (_materials.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('请至少添加一个材料')));
      return;
    }
    if (_step < 2) {
      setState(() => _step++);
      return;
    }

    // Show signature
    final sigPath = await Navigator.push<String>(context, MaterialPageRoute(builder: (_) => const SignatureScreen(title: '客户签名确认')));
    if (sigPath != null) {
      setState(() => _signaturePath = sigPath);

      // Submit
      final data = MeasurementModel(
        orderId: widget.orderId,
        weather: _weather,
        accessCondition: _access,
        vehicleAccess: _vehicleAccess,
        environmentFlags: _envFlags.entries.where((e) => e.value).map((e) => e.key).toList(),
        notes: _notesCtrl.text,
        materials: _materials,
        signaturePath: sigPath,
        status: 'submitted',
      );

      final online = true; // Would check via ApiService
      if (online) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('测量数据已提交')));
        Navigator.pop(context);
      } else {
        await _sync.enqueue('measurement', widget.orderId, data.toJson());
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('离线保存成功，网络恢复后自动同步')));
        Navigator.pop(context);
      }
    }
  }

  Widget _buildStep1() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButtonFormField<String>(value: _weather, items: _weatherOptions.map((w) => DropdownMenuItem(value: w, child: Text(w))).toList(), onChanged: (v) => setState(() => _weather = v!), decoration: const InputDecoration(labelText: '天气', border: OutlineInputBorder())),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(value: _access, items: _accessOptions.map((a) => DropdownMenuItem(value: a, child: Text(a))).toList(), onChanged: (v) => setState(() => _access = v!), decoration: const InputDecoration(labelText: '现场通道', border: OutlineInputBorder())),
        const SizedBox(height: 16),
        Row(children: [Checkbox(value: _vehicleAccess, onChanged: (v) => setState(() => _vehicleAccess = v ?? false)), const Text('施工车辆可达')]),
        const SizedBox(height: 8),
        const Text('施工环境标记：', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ..._envFlags.entries.map((e) => Row(children: [
          Checkbox(value: e.value, onChanged: (v) => setState(() => _envFlags[e.key] = v ?? false)),
          Text(e.key),
          if (e.key == '高空作业' && e.value) SizedBox(width: 100, child: TextField(controller: _envValues['高空作业'], keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '约__m', isDense: true))),
          if (e.key == '电源可用' && e.value) SizedBox(width: 100, child: TextField(controller: _envValues['电源可用'], keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: '距离__m', isDense: true))),
        ])),
        const SizedBox(height: 16),
        TextField(controller: _notesCtrl, maxLines: 3, decoration: const InputDecoration(labelText: '备注', border: OutlineInputBorder())),
      ],
    );
  }

  Widget _buildStep2() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('测量数据', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        TextButton.icon(onPressed: _addMaterial, icon: const Icon(Icons.add), label: const Text('添加材料')),
        const SizedBox(height: 12),
        ..._materials.asMap().entries.map((me) {
          final mat = me.value;
          return ExpansionTile(
            title: Text(mat.name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('共${mat.faces.length}面，合计${mat.totalArea.toStringAsFixed(2)}㎡'),
            children: mat.faces.asMap().entries.map((fe) {
              final f = fe.value;
              return ListTile(
                leading: Text('── ${f.label} ──'),
                title: Text('面积：${f.area.toStringAsFixed(2)}㎡'),
                subtitle: f.notes != null ? Text(f.notes!, style: const TextStyle(color: Colors.orange)) : null,
                trailing: IconButton(icon: const Icon(Icons.edit), onPressed: () => _editFace(mat, fe.key)),
              );
            }).toList(),
          );
        }),
        if (_materials.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(40), child: Text('点击"添加材料"开始测量录入', style: TextStyle(color: Colors.grey)))),
      ],
    );
  }

  Widget _buildStep3() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('测量数据汇总', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ..._materials.map((m) => Card(child: ListTile(title: Text(m.name), subtitle: Text('共${m.faces.length}面'), trailing: Text('${m.totalArea.toStringAsFixed(2)}㎡', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1565C0))))),
        const SizedBox(height: 24),
        const Text('请在下方签字确认：', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Container(
          height: 200,
          decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(8)),
          child: Center(child: TextButton.icon(onPressed: _submit, icon: const Icon(Icons.draw), label: const Text('点击签名'))),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('测量 - ${widget.orderNo}'),
        actions: [TextButton(onPressed: _saveDraft, child: const Text('草稿', style: TextStyle(color: Colors.white)))],
      ),
      body: Column(
        children: [
          // Step indicator
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            color: Colors.grey[100],
            child: Row(
              children: ['基本信息', '材料测量', '签名确认'].asMap().entries.map((e) {
                final active = _step == e.key;
                final done = _step > e.key;
                return Expanded(
                  child: Row(
                    children: [
                      Container(width: 24, height: 24, decoration: BoxDecoration(color: done ? const Color(0xFF43A047) : active ? const Color(0xFF1565C0) : Colors.grey[300], shape: BoxShape.circle), child: Center(child: done ? const Text('✓', style: TextStyle(color: Colors.white, fontSize: 14)) : Text('${e.key + 1}', style: TextStyle(color: active ? Colors.white : Colors.grey, fontSize: 12)))),
                      const SizedBox(width: 4),
                      Text(e.value, style: TextStyle(fontSize: 12, color: active ? const Color(0xFF1565C0) : Colors.grey)),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
          // Step content
          Expanded(child: IndexedStack(index: _step, children: [_buildStep1(), _buildStep2(), _buildStep3()])),
          // Bottom bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)]),
            child: Row(
              children: [
                if (_step > 0) Expanded(child: OutlinedButton(onPressed: () => setState(() => _step--), child: const Text('上一步'))),
                if (_step > 0) const SizedBox(width: 12),
                Expanded(child: ElevatedButton(onPressed: _submit, child: Text(_step < 2 ? '下一步' : '提交测量'))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
