import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../config/constants.dart';

class DbService {
  static final DbService _instance = DbService._internal();
  factory DbService() => _instance;
  DbService._internal();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, AppConstants.dbName);

    return openDatabase(
      path,
      version: AppConstants.dbVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY,
        order_no TEXT,
        title TEXT,
        task_type TEXT,
        address TEXT,
        deadline TEXT,
        cached_at TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE measurement_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        basic_info TEXT,
        materials TEXT,
        signature_path TEXT,
        created_at TEXT,
        status TEXT DEFAULT 'draft'
      )
    ''');

    await db.execute('''
      CREATE TABLE construction_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        photos TEXT,
        notes TEXT,
        duration TEXT,
        signature_path TEXT,
        created_at TEXT,
        status TEXT DEFAULT 'draft'
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        order_id INTEGER,
        payload TEXT,
        created_at TEXT,
        status TEXT DEFAULT 'pending',
        error_msg TEXT,
        retry_count INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE image_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        local_path TEXT,
        remote_url TEXT,
        type TEXT,
        created_at TEXT
      )
    ''');
  }

  // Generic helpers
  Future<int> insert(String table, Map<String, dynamic> data) async {
    final db = await database;
    return db.insert(table, data);
  }

  Future<int> update(String table, Map<String, dynamic> data, {String? where, List<dynamic>? whereArgs}) async {
    final db = await database;
    return db.update(table, data, where: where, whereArgs: whereArgs);
  }

  Future<int> delete(String table, {String? where, List<dynamic>? whereArgs}) async {
    final db = await database;
    return db.delete(table, where: where, whereArgs: whereArgs);
  }

  Future<List<Map<String, dynamic>>> query(String table, {String? where, List<dynamic>? whereArgs, String? orderBy, int? limit}) async {
    final db = await database;
    return db.query(table, where: where, whereArgs: whereArgs, orderBy: orderBy, limit: limit);
  }

  Future<void> clear() async {
    final db = await database;
    await db.close();
    _db = null;
  }
}
