const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const inspectionsController = require('../controllers/inspections.controller');

const router = express.Router();

router.use(authenticate);

// GET /api/inspections — all authenticated (scoped in controller)
router.get('/', inspectionsController.getAll);

// GET /api/inspections/:id
router.get('/:id', inspectionsController.getById);

// POST /api/inspections — overmen, managers, and DGMS
router.post('/', authorize(['ROLE_OVERMAN', 'ROLE_MINE_MANAGER', 'ROLE_DGMS_INSPECTOR']), [
  body('mine_id').optional().isInt().withMessage('mine_id must be an integer')
], validate, inspectionsController.create);

// PUT /api/inspections/:id — managers and DGMS
router.put('/:id', authorize(['ROLE_MINE_MANAGER', 'ROLE_DGMS_INSPECTOR']), inspectionsController.update);

module.exports = router;
