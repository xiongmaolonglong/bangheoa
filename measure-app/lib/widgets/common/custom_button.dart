import 'package:flutter/material.dart';

class LoadingOverlay extends StatelessWidget {
  final bool visible;
  final Widget child;
  final String? message;

  const LoadingOverlay({super.key, required this.visible, required this.child, this.message});

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      child,
      if (visible)
        Container(
          color: Colors.black.withOpacity(0.3),
          child: Center(
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(),
                    if (message != null) ...[const SizedBox(height: 12), Text(message!)],
                  ],
                ),
              ),
            ),
          ),
        ),
    ]);
  }
}

class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorView({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.grey), textAlign: TextAlign.center),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('重试')),
          ],
        ],
      ),
    );
  }
}
