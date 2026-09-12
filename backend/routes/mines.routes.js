const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const minesController = require('../controllers/mines.controller');

const router = express.Router();

// All mine routes require authentication
router.use(authenticate);

// GET /api/mines — all authenticated users (scoping happens in controller)
router.get('/', minesController.getAll);

// GET /api/mines/:id
router.get('/:id', minesController.getById);

// POST /api/mines — managers and DGMS only
router.post('/', authorize(['ROLE_MINE_MANAGER', 'ROLE_DGMS_INSPECTOR']), [
  body('name').notEmpty().withMessage('Mine name is required'),
  body('company_name').notEmpty().withMessage('Company name is required')
], validate, minesController.create);

// PUT /api/mines/:id — managers only
router.put('/:id', authorize(['ROLE_MINE_MANAGER']), minesController.update);

module.exports = router;
