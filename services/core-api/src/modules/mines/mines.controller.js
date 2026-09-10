const minesService = require('./mines.service');
const apiResponse = require('../../utils/apiResponse');

class MinesController {
  async findAll(req, res, next) {
    try {
      const mines = await minesService.findAll(req.tenantScope, req.query);
      return apiResponse.success(res, { mines });
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const mine = await minesService.findById(req.params.id, req.tenantScope);
      return apiResponse.success(res, { mine });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const mine = await minesService.create(req.body);
      return apiResponse.created(res, { mine });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const mine = await minesService.update(req.params.id, req.body, req.tenantScope);
      return apiResponse.success(res, { mine });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await minesService.softDelete(req.params.id, req.tenantScope);
      return apiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MinesController();
