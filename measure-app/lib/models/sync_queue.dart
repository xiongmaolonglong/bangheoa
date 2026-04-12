class SyncQueueItem {
  final int? id;
  final String type; // 'measurement' | 'construction' | 'exception'
  final int orderId;
  final String payload; // JSON
  final String createdAt;
  final String status; // 'pending' | 'synced' | 'failed'
  final String? errorMsg;
  final int retryCount;

  const SyncQueueItem({
    this.id,
    required this.type,
    required this.orderId,
    required this.payload,
    this.createdAt = '',
    this.status = 'pending',
    this.errorMsg,
    this.retryCount = 0,
  });

  SyncQueueItem copyWith({String? status, int? retryCount, String? errorMsg}) {
    return SyncQueueItem(
      id: id,
      type: type,
      orderId: orderId,
      payload: payload,
      createdAt: createdAt,
      status: status ?? this.status,
      errorMsg: errorMsg ?? this.errorMsg,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  Map<String, dynamic> toMap() => {
        'type': type,
        'order_id': orderId,
        'payload': payload,
        'status': status,
        'error_msg': errorMsg,
        'retry_count': retryCount,
      };

  factory SyncQueueItem.fromMap(Map<String, dynamic> map) {
    return SyncQueueItem(
      id: map['id'],
      type: map['type'] ?? '',
      orderId: map['order_id'] ?? 0,
      payload: map['payload'] ?? '',
      createdAt: map['created_at'] ?? '',
      status: map['status'] ?? 'pending',
      errorMsg: map['error_msg'],
      retryCount: map['retry_count'] ?? 0,
    );
  }
}
