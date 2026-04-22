class UserModel {
  final int id;
  final String name;
  final String phone;
  final String role; // 'measurer' | 'constructor'
  final String? department;

  const UserModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    this.department,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? 'measurer',
      department: json['department'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'role': role,
        'department': department,
      };

  String get roleLabel => role == 'constructor' ? '施工员' : '测量员';
}
