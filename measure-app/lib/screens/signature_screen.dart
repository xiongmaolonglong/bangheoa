import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import 'package:path_provider/path_provider.dart';

class SignatureScreen extends StatefulWidget {
  final String title;

  const SignatureScreen({super.key, this.title = '签名'});

  @override
  State<SignatureScreen> createState() => _SignatureScreenState();
}

class _SignatureScreenState extends State<SignatureScreen> {
  final SignatureController _controller = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
  );

  bool get _isEmpty => _controller.isEmpty;

  Future<void> _clear() async {
    await _controller.clear();
  }

  Future<void> _save() async {
    if (_isEmpty) return;

    final data = await _controller.toPngBytes();
    if (data == null) return;

    final dir = await getApplicationDocumentsDirectory();
    final path = '${dir.path}/signature_${DateTime.now().millisecondsSinceEpoch}.png';
    final file = File(path);
    await file.writeAsBytes(data);

    if (mounted) Navigator.pop(context, path);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(
        children: [
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(12)),
              child: Signature(controller: _controller, backgroundColor: Colors.white),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(child: OutlinedButton.icon(onPressed: _clear, icon: const Icon(Icons.delete_outline), label: const Text('清除重签'))),
                const SizedBox(width: 12),
                Expanded(child: ElevatedButton(onPressed: _isEmpty ? null : _save, child: const Text('确认'))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
