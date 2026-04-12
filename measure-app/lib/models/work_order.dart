class WorkOrderModel {
  final int id;
  final String orderNo;
  final String title;
  final String taskType; // 'measurement' | 'construction'
  final String address;
  final String? contactName;
  final String? contactPhone;
  final String? projectType;
  final String? description;
  final String? deadline;
  final String status;
  final List<String>? photos;
  final List<String>? annotations;

  const WorkOrderModel({
    required this.id,
    required this.orderNo,
    required this.title,
    required this.taskType,
    required this.address,
    this.contactName,
    this.contactPhone,
    this.projectType,
    this.description,
    this.deadline,
    this.status = 'pending',
    this.photos,
    this.annotations,
  });

  factory WorkOrderModel.fromJson(Map<String, dynamic> json) {
    return WorkOrderModel(
      id: json['id'] ?? 0,
      orderNo: json['order_no'] ?? '',
      title: json['title'] ?? '',
      taskType: json['task_type'] ?? 'measurement',
      address: json['address'] ?? '',
      contactName: json['contact_name'],
      contactPhone: json['contact_phone'],
      projectType: json['project_type'],
      description: json['description'],
      deadline: json['deadline'],
      status: json['status'] ?? 'pending',
      photos: (json['photos'] as List?)?.map((e) => e.toString()).toList(),
      annotations: (json['annotations'] as List?)?.map((e) => e.toString()).toList(),
    );
  }

  String get statusLabel {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'overdue':
        return '已逾期';
      default:
        return status;
    }
  }

  Color get statusColor {
    switch (status) {
      case 'pending':
        return const Color(0xFFFFA000);
      case 'in_progress':
        return const Color(0xFF1565C0);
      case 'completed':
        return const Color(0xFF43A047);
      case 'overdue':
        return const Color(0xFFE53935);
      default:
        return Colors.grey;
    }
  }
}
