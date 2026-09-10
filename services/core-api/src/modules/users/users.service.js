const db = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

class UsersService {
  async findAll(tenantScope) {
    let query = db('users')
      .whereNull('deleted_at')
      .select('id', 'email', 'full_name', 'role', 'mine_id', 'subsidiary_id', 'employee_id', 'is_active', 'created_at');

    if (!tenantScope.isGlobal) {
      query = query.where('mine_id', tenantScope.mineId);
    }

    return query.orderBy('full_name');
  }

  async findById(id, tenantScope) {
    let query = db('users')
      .where('id', id)
      .whereNull('deleted_at')
      .select('id', 'email', 'full_name', 'role', 'mine_id', 'subsidiary_id', 'employee_id', 'is_active', 'created_at', 'updated_at');

    if (!tenantScope.isGlobal) {
      query = query.where('mine_id', tenantScope.mineId);
    }

    const user = await query.first();
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async update(id, data, tenantScope) {
    await this.findById(id, tenantScope);
    data.updated_at = db.fn.now();
    await db('users').where('id', id).update(data);
    return this.findById(id, tenantScope);
  }

  async softDelete(id, tenantScope) {
    await this.findById(id, tenantScope);
    await db('users')
      .where('id', id)
      .update({ deleted_at: db.fn.now(), updated_at: db.fn.now(), is_active: false });
  }
}

module.exports = new UsersService();
