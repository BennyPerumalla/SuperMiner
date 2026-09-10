const usersService = require('./users.service');
const apiResponse = require('../../utils/apiResponse');

class UsersController {
  async findAll(req, res, next) {
    try {
      const users = await usersService.findAll(req.tenantScope);
      return apiResponse.success(res, { users });
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const user = await usersService.findById(req.params.id, req.tenantScope);
      return apiResponse.success(res, { user });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const user = await usersService.update(req.params.id, req.body, req.tenantScope);
      return apiResponse.success(res, { user });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await usersService.softDelete(req.params.id, req.tenantScope);
      return apiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsersController();
