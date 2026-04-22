import 'package:flutter/material.dart';

class PhotoAnnotateScreen extends StatefulWidget {
  final String? imagePath;

  const PhotoAnnotateScreen({super.key, this.imagePath});

  @override
  State<PhotoAnnotateScreen> createState() => _PhotoAnnotateScreenState();
}

class _PhotoAnnotateScreenState extends State<PhotoAnnotateScreen> {
  String _tool = 'circle'; // 'circle' | 'arrow' | 'text'
  Color _color = Colors.red;
  final List<Map<String, dynamic>> _annotations = [];

  void _annotate(String type) {
    setState(() {
      _annotations.add({
        'type': type,
        'x': 100.0 + _annotations.length * 30,
        'y': 100.0 + _annotations.length * 30,
        'color': _color,
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('照片标注'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('保存', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                // Photo placeholder
                Container(
                  width: double.infinity,
                  color: Colors.black,
                  child: const Center(child: Icon(Icons.image, size: 120, color: Colors.white38)),
                ),
                // Annotations overlay
                ..._annotations.map((a) => Positioned(
                  left: a['x'] - 20,
                  top: a['y'] - 20,
                  child: GestureDetector(
                    onTap: () => setState(() => _annotations.remove(a)),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        border: Border.all(color: a['color'], width: 3),
                        shape: a['type'] == 'circle' ? BoxShape.circle : BoxShape.rectangle,
                      ),
                    ),
                  ),
                )),
              ],
            ),
          ),
          // Toolbar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.grey[100], border: Border(top: BorderSide(color: Colors.grey[300]!))),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _toolBtn('circle', Icons.circle_outlined, '圈'),
                    const SizedBox(width: 8),
                    _toolBtn('arrow', Icons.arrow_forward, '箭头'),
                    const SizedBox(width: 8),
                    _toolBtn('text', Icons.text_fields, '文字'),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _colorBtn(Colors.red),
                    const SizedBox(width: 8),
                    _colorBtn(Colors.yellow),
                    const SizedBox(width: 8),
                    _colorBtn(Colors.blue),
                    const Spacer(),
                    TextButton(onPressed: () => setState(() => _annotations.clear()), child: const Text('清除')),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _annotate(_tool),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _toolBtn(String key, IconData icon, String label) {
    final active = _tool == key;
    return OutlinedButton.icon(
      onPressed: () => setState(() => _tool = key),
      icon: Icon(icon, size: 18, color: active ? Colors.red : Colors.grey),
      label: Text(label, style: TextStyle(color: active ? Colors.red : Colors.grey)),
      style: OutlinedButton.styleFrom(side: BorderSide(color: active ? Colors.red : Colors.grey)),
    );
  }

  Widget _colorBtn(Color c) {
    return GestureDetector(
      onTap: () => setState(() => _color = c),
      child: Container(width: 28, height: 28, decoration: BoxDecoration(color: c, shape: BoxShape.circle, border: Border.all(color: _color == c ? Colors.black : Colors.grey[300]!, width: _color == c ? 3 : 1))),
    );
  }
}
