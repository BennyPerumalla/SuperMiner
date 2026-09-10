const inspectionsService = require('./inspections.service');
const apiResponse = require('../../utils/apiResponse');

class InspectionsController {
  async findAll(req, res, next) {
    try {
      const inspections = await inspectionsService.findAll(req.tenantScope, req.query);
      return apiResponse.success(res, { inspections });
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const inspection = await inspectionsService.findById(req.params.id, req.tenantScope);
      return apiResponse.success(res, { inspection });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const inspection = await inspectionsService.create(req.body, req.user);
      return apiResponse.created(res, { inspection });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const inspection = await inspectionsService.update(req.params.id, req.body, req.tenantScope);
      return apiResponse.success(res, { inspection });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await inspectionsService.softDelete(req.params.id, req.tenantScope);
      return apiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InspectionsController();
