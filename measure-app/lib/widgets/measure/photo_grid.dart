import 'package:flutter/material.dart';

class PhotoGrid extends StatelessWidget {
  final List<String> photos;
  final int maxCount;
  final VoidCallback? onAdd;
  final Function(int)? onDelete;
  final Function(int)? onTap;

  const PhotoGrid({super.key, this.photos = const [], this.maxCount = 9, this.onAdd, this.onDelete, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        ...photos.asMap().entries.map((e) => Stack(
          children: [
            GestureDetector(
              onTap: onTap != null ? () => onTap!(e.key) : null,
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.image, color: Colors.grey),
              ),
            ),
            if (onDelete != null)
              Positioned(
                top: 0,
                right: 0,
                child: GestureDetector(
                  onTap: () => onDelete!(e.key),
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                    child: const Icon(Icons.close, color: Colors.white, size: 14),
                  ),
                ),
              ),
          ],
        )),
        if (photos.length < maxCount && onAdd != null)
          GestureDetector(
            onTap: onAdd,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(border: Border.all(color: Colors.grey[400]!, style: BorderStyle.dash), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.add, color: Colors.grey),
            ),
          ),
      ],
    );
  }
}
