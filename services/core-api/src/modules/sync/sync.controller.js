const syncService = require('./sync.service');
const apiResponse = require('../../utils/apiResponse');

class SyncController {
  async pull(req, res, next) {
    try {
      const lastPulledAt = parseInt(req.query.last_pulled_at) || 0;
      const result = await syncService.pull(req.user, lastPulledAt);
      return apiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async push(req, res, next) {
    try {
      const { changes, lastPulledAt } = req.body;
      await syncService.push(req.user, changes, lastPulledAt);
      return apiResponse.success(res, { message: 'Sync push successful' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SyncController();
