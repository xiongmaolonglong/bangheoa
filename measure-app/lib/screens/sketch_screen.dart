import 'dart:ui' as ui;
import 'package:flutter/material.dart';

class SketchScreen extends StatefulWidget {
  const SketchScreen({super.key});

  @override
  State<SketchScreen> createState() => _SketchScreenState();
}

class _SketchScreenState extends State<SketchScreen> {
  final List<DrawingStroke> _strokes = [];
  final List<DrawingStroke> _undoStack = [];
  DrawingStroke? _currentStroke;
  String _tool = 'pen'; // 'pen' | 'line' | 'text'
  Color _color = Colors.black;
  double _strokeWidth = 2.0;

  void _onPanStart(DragStartDetails details, RenderBox box) {
    final pos = box.globalToLocal(details.globalPosition);
    setState(() {
      _currentStroke = DrawingStroke(
        tool: _tool,
        color: _color,
        width: _strokeWidth,
        points: [pos],
      );
    });
  }

  void _onPanUpdate(DragUpdateDetails details, RenderBox box) {
    if (_currentStroke == null) return;
    final pos = box.globalToLocal(details.globalPosition);
    setState(() {
      _currentStroke = DrawingStroke(
        tool: _currentStroke!.tool,
        color: _currentStroke!.color,
        width: _currentStroke!.width,
        points: [..._currentStroke!.points, pos],
      );
    });
  }

  void _onPanEnd(DragEndDetails details) {
    if (_currentStroke != null) {
      setState(() {
        _strokes.add(_currentStroke!);
        _currentStroke = null;
        _undoStack.clear();
      });
    }
  }

  void _undo() {
    if (_strokes.isEmpty) return;
    setState(() {
      _undoStack.add(_strokes.removeLast());
    });
  }

  void _clear() => setState(() {
    _strokes.clear();
    _undoStack.clear();
  });

  void _setTool(String tool) => setState(() => _tool = tool);
  void _setColor(Color c) => setState(() => _color = c);
  void _setWidth(double w) => setState(() => _strokeWidth = w);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('手绘草图'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('保存', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: LayoutBuilder(
              builder: (ctx, constraints) {
                final size = Size(constraints.maxWidth, constraints.maxHeight);
                return GestureDetector(
                  onPanStart: (d) {
                    final box = context.findRenderObject() as RenderBox;
                    _onPanStart(d, box);
                  },
                  onPanUpdate: (d) {
                    final box = context.findRenderObject() as RenderBox;
                    _onPanUpdate(d, box);
                  },
                  onPanEnd: _onPanEnd,
                  child: CustomPaint(
                    size: size,
                    painter: SketchPainter(strokes: _strokes, currentStroke: _currentStroke),
                  ),
                );
              },
            ),
          ),
          // Toolbar
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: Colors.grey[100], border: Border(top: BorderSide(color: Colors.grey[300]!))),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _toolBtn('pen', Icons.draw, '画笔'),
                    const SizedBox(width: 8),
                    _toolBtn('line', Icons.show_chart, '直线'),
                    const SizedBox(width: 8),
                    _toolBtn('text', Icons.text_fields, '文字'),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _colorBtn(Colors.black),
                    const SizedBox(width: 8),
                    _colorBtn(Colors.red),
                    const SizedBox(width: 8),
                    _colorBtn(Colors.blue),
                    const Spacer(),
                    TextButton(onPressed: _undo, child: const Text('撤销')),
                    const SizedBox(width: 8),
                    TextButton(onPressed: _clear, child: const Text('清除')),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _toolBtn(String key, IconData icon, String label) {
    final active = _tool == key;
    return OutlinedButton.icon(
      onPressed: () => _setTool(key),
      icon: Icon(icon, size: 18, color: active ? const Color(0xFF1565C0) : Colors.grey),
      label: Text(label, style: TextStyle(color: active ? const Color(0xFF1565C0) : Colors.grey)),
      style: OutlinedButton.styleFrom(side: BorderSide(color: active ? const Color(0xFF1565C0) : Colors.grey)),
    );
  }

  Widget _colorBtn(Color c) {
    return GestureDetector(
      onTap: () => _setColor(c),
      child: Container(width: 28, height: 28, decoration: BoxDecoration(color: c, shape: BoxShape.circle, border: Border.all(color: _color == c ? const Color(0xFF1565C0) : Colors.grey[300]!, width: _color == c ? 3 : 1))),
    );
  }
}

class DrawingStroke {
  final String tool;
  final Color color;
  final double width;
  final List<Offset> points;

  const DrawingStroke({required this.tool, required this.color, required this.width, required this.points});
}

class SketchPainter extends CustomPainter {
  final List<DrawingStroke> strokes;
  final DrawingStroke? currentStroke;

  const SketchPainter({required this.strokes, required this.currentStroke});

  @override
  void paint(Canvas canvas, Size size) {
    for (final s in [...strokes, if (currentStroke != null) currentStroke!]) {
      if (s.points.isEmpty) continue;
      final paint = Paint()..color = s.color..strokeWidth = s.width..strokeCap = StrokeCap.round;

      if (s.tool == 'pen' && s.points.length > 1) {
        for (int i = 0; i < s.points.length - 1; i++) {
          canvas.drawLine(s.points[i], s.points[i + 1], paint);
        }
      } else if (s.tool == 'line' && s.points.length >= 2) {
        canvas.drawLine(s.points.first, s.points.last, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant SketchPainter oldDelegate) => true;
}
