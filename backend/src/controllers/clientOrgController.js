const ClientUser = require('../models/ClientUser');
const Client = require('../models/Client');
const ClientDepartment = require('../models/ClientDepartment');
const { sequelize } = require('../models');

// 获取当前用户所在企业的部门列表
async function listDepartments(req, res) {
  try {
    const departments = await ClientDepartment.findAll({
      where: { client_id: req.user.client_id },
      order: [['id', 'ASC']],
    });

    // 获取每个部门的人数
    const deptsWithCount = await Promise.all(departments.map(async dept => {
      const count = await ClientUser.count({
        where: { department_id: dept.id, status: 'active' }
      });
      return { ...dept.toJSON(), user_count: count };
    }));

    res.json({ code: 0, data: deptsWithCount });
  } catch (err) {
    console.error('List client departments error:', err);
    res.status(500).json({ error: '获取部门列表失败' });
  }
}

// 创建部门
async function createDepartment(req, res) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: '只有管理员可以创建部门' });
    }

    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: '部门名称不能为空' });
    }

    const dept = await ClientDepartment.create({
      client_id: req.user.client_id,
      name: name.trim(),
    });

    res.json({ code: 0, data: dept, message: '部门创建成功' });
  } catch (err) {
    console.error('Create client department error:', err);
    res.status(500).json({ error: '创建部门失败' });
  }
}

// 更新部门
async function updateDepartment(req, res) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: '只有管理员可以编辑部门' });
    }

    const { id } = req.params;
    const { name, manager_id } = req.body;

    const dept = await ClientDepartment.findOne({
      where: { id, client_id: req.user.client_id }
    });

    if (!dept) {
      return res.status(404).json({ error: '部门不存在' });
    }

    if (name !== undefined) dept.name = name.trim();
    if (manager_id !== undefined) dept.manager_id = manager_id || null;

    await dept.save();
    res.json({ code: 0, data: dept, message: '部门更新成功' });
  } catch (err) {
    console.error('Update client department error:', err);
    res.status(500).json({ error: '更新部门失败' });
  }
}

// 删除部门
async function deleteDepartment(req, res) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: '只有管理员可以删除部门' });
    }

    const { id } = req.params;

    const dept = await ClientDepartment.findOne({
      where: { id, client_id: req.user.client_id }
    });

    if (!dept) {
      return res.status(404).json({ error: '部门不存在' });
    }

    // 检查部门下是否有人员
    const userCount = await ClientUser.count({ where: { department_id: id } });
    if (userCount > 0) {
      return res.status(400).json({ error: `部门下还有 ${userCount} 人，无法删除` });
    }

    await dept.destroy();
    res.json({ code: 0, message: '部门删除成功' });
  } catch (err) {
    console.error('Delete client department error:', err);
    res.status(500).json({ error: '删除部门失败' });
  }
}

// 获取当前用户所在企业的用户列表
async function listUsers(req, res) {
  try {
    const users = await ClientUser.findAll({
      where: { client_id: req.user.client_id },
      order: [['id', 'DESC']],
    });

    res.json({ code: 0, data: users });
  } catch (err) {
    console.error('List client users error:', err);
    res.status(500).json({ error: '获取人员列表失败' });
  }
}

// 创建人员
async function createUser(req, res) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: '只有管理员可以添加人员' });
    }

    const { name, phone, password, role, department_id } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: '姓名不能为空' });
    }
    if (!phone?.trim()) {
      return res.status(400).json({ error: '手机号不能为空' });
    }
    if (!password?.trim()) {
      return res.status(400).json({ error: '密码不能为空' });
    }

    // 检查手机号是否已存在
    const existing = await ClientUser.findOne({ where: { phone: phone.trim() } });
    if (existing) {
      return res.status(400).json({ error: '该手机号已被使用' });
    }

    const user = await ClientUser.create({
      client_id: req.user.client_id,
      name: name.trim(),
      phone: phone.trim(),
      password_hash: password,
      role: role || 'staff',
      department_id: department_id || null,
    });

    // 不返回密码
    const result = user.toJSON();
    delete result.password_hash;

    res.json({ code: 0, data: result, message: '人员添加成功' });
  } catch (err) {
    console.error('Create client user error:', err);
    res.status(500).json({ error: '添加人员失败' });
  }
}

// 更新人员
async function updateUser(req, res) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: '只有管理员可以编辑人员' });
    }

    const { id } = req.params;
    const { name, phone, role, department_id, status } = req.body;

    const user = await ClientUser.findOne({
      where: { id, client_id: req.user.client_id }
    });

    if (!user) {
      return res.status(404).json({ error: '人员不存在' });
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) {
      // 检查手机号是否被其他人使用
      const existing = await ClientUser.findOne({
        where: { phone: phone.trim() },
      });
      if (existing && existing.id !== parseInt(id)) {
        return res.status(400).json({ error: '该手机号已被使用' });
      }
      user.phone = phone.trim();
    }
    if (role !== undefined) user.role = role;
    if (department_id !== undefined) user.department_id = department_id || null;
    if (status !== undefined) user.status = status;

    await user.save();

    const result = user.toJSON();
    delete result.password_hash;

    res.json({ code: 0, data: result, message: '人员更新成功' });
  } catch (err) {
    console.error('Update client user error:', err);
    res.status(500).json({ error: '更新人员失败' });
  }
}

// 删除人员
async function deleteUser(req, res) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: '只有管理员可以删除人员' });
    }

    const { id } = req.params;

    const user = await ClientUser.findOne({
      where: { id, client_id: req.user.client_id }
    });

    if (!user) {
      return res.status(404).json({ error: '人员不存在' });
    }

    // 不能删除自己
    if (user.id === req.user.user_id) {
      return res.status(400).json({ error: '不能删除自己' });
    }

    await user.destroy();
    res.json({ code: 0, message: '人员删除成功' });
  } catch (err) {
    console.error('Delete client user error:', err);
    res.status(500).json({ error: '删除人员失败' });
  }
}

// 重置人员密码
async function resetPassword(req, res) {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: '只有管理员可以重置密码' });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password?.trim()) {
      return res.status(400).json({ error: '新密码不能为空' });
    }

    const user = await ClientUser.findOne({
      where: { id, client_id: req.user.client_id }
    });

    if (!user) {
      return res.status(404).json({ error: '人员不存在' });
    }

    user.password_hash = password;
    await user.save();

    res.json({ code: 0, message: '密码重置成功' });
  } catch (err) {
    console.error('Reset client user password error:', err);
    res.status(500).json({ error: '重置密码失败' });
  }
}

module.exports = {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listUsers, createUser, updateUser, deleteUser, resetPassword,
};
