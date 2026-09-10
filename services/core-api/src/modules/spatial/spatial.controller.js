const spatialService = require('./spatial.service');
const apiResponse = require('../../utils/apiResponse');

class SpatialController {
  async findViolationsNearShaft(req, res, next) {
    try {
      const { shaft_id } = req.params;
      const radius = parseInt(req.query.radius) || 500;
      const violations = await spatialService.findViolationsNearShaft(
        shaft_id, radius, req.tenantScope
      );
      return apiResponse.success(res, { violations, radius_meters: radius });
    } catch (err) {
      next(err);
    }
  }

  async findIncidentsNearPoint(req, res, next) {
    try {
      const { longitude, latitude, radius } = req.query;
      const incidents = await spatialService.findIncidentsNearPoint(
        parseFloat(longitude),
        parseFloat(latitude),
        parseInt(radius) || 500,
        req.tenantScope
      );
      return apiResponse.success(res, { incidents });
    } catch (err) {
      next(err);
    }
  }

  async checkPointInBoundary(req, res, next) {
    try {
      const { mine_id } = req.params;
      const { longitude, latitude } = req.query;
      const isInside = await spatialService.isPointInMineBoundary(
        mine_id, parseFloat(longitude), parseFloat(latitude)
      );
      return apiResponse.success(res, { is_inside: isInside });
    } catch (err) {
      next(err);
    }
  }

  async getMineSensors(req, res, next) {
    try {
      const sensors = await spatialService.getMineSensors(
        req.params.mine_id, req.tenantScope
      );
      return apiResponse.success(res, { sensors });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SpatialController();
