class MeasurementModel {
  final int? id;
  final int orderId;
  final String? weather;
  final String? accessCondition;
  final bool vehicleAccess;
  final List<String> environmentFlags;
  final double?高空作业Height;
  final double? powerDistance;
  final String? notes;
  final List<MaterialData> materials;
  final String? signaturePath;
  final String createdAt;
  final String status; // 'draft' | 'submitted' | 'failed'

  const MeasurementModel({
    this.id,
    required this.orderId,
    this.weather,
    this.accessCondition,
    this.vehicleAccess = false,
    this.environmentFlags = const [],
    this.高空作业Height,
    this.powerDistance,
    this.notes,
    this.materials = const [],
    this.signaturePath,
    this.createdAt = '',
    this.status = 'draft',
  });

  double get totalArea {
    return materials.fold(0.0, (sum, m) => sum + m.totalArea);
  }

  Map<String, dynamic> toJson() => {
        'order_id': orderId,
        'weather': weather,
        'access_condition': accessCondition,
        'vehicle_access': vehicleAccess,
        'environment_flags': environmentFlags,
        'notes': notes,
        'materials': materials.map((m) => m.toJson()).toList(),
        'status': status,
      };
}

class MaterialData {
  final String name;
  final List<MaterialFace> faces;

  const MaterialData({this.name = '', this.faces = const []});

  double get totalArea => faces.fold(0.0, (sum, f) => sum + f.area);

  Map<String, dynamic> toJson() => {
        'name': name,
        'faces': faces.map((f) => f.toJson()).toList(),
      };
}

class MaterialFace {
  final String label; // '正面', '侧面1', etc.
  final double width;
  final double height;
  final String? notes;
  final bool special;
  final List<String> photos;

  const MaterialFace({
    this.label = '',
    this.width = 0,
    this.height = 0,
    this.notes,
    this.special = false,
    this.photos = const [],
  });

  double get area => width * height;

  Map<String, dynamic> toJson() => {
        'label': label,
        'width': width,
        'height': height,
        'area': area,
        'notes': notes,
        'special': special,
        'photos': photos,
      };
}
