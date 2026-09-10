// =============================================================
// Auth Controller
// =============================================================
// Thin layer between HTTP and business logic.
// Controllers handle:
//   - Extracting data from the request
//   - Calling the service
//   - Formatting the response
// Controllers do NOT contain business logic.
// =============================================================

const authService = require('./auth.service');
const apiResponse = require('../../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      return apiResponse.created(res, { user });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return apiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const tokens = await authService.refresh(refresh_token);
      return apiResponse.success(res, tokens);
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const { refresh_token } = req.body;
      await authService.logout(req.user, refresh_token);
      return apiResponse.success(res, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const db = require('../../config/database');
      const user = await db('users')
        .where('id', req.user.id)
        .whereNull('deleted_at')
        .select('id', 'email', 'full_name', 'role', 'mine_id', 'subsidiary_id', 'employee_id', 'created_at')
        .first();

      if (!user) {
        const { NotFoundError } = require('../../utils/errors');
        throw new NotFoundError('User not found');
      }

      return apiResponse.success(res, { user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
