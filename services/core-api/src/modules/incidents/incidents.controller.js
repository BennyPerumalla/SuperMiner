const incidentsService = require('./incidents.service');
const apiResponse = require('../../utils/apiResponse');

class IncidentsController {
  async findAll(req, res, next) {
    try {
      const incidents = await incidentsService.findAll(req.tenantScope, req.query);
      return apiResponse.success(res, { incidents });
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const incident = await incidentsService.findById(req.params.id, req.tenantScope);
      return apiResponse.success(res, { incident });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const incident = await incidentsService.create(req.body, req.user);
      return apiResponse.created(res, { incident });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const incident = await incidentsService.update(req.params.id, req.body, req.tenantScope);
      return apiResponse.success(res, { incident });
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await incidentsService.softDelete(req.params.id, req.tenantScope);
      return apiResponse.noContent(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IncidentsController();
