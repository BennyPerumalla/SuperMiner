const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const incidentsController = require('../controllers/incidents.controller');

const router = express.Router();

router.use(authenticate);

// GET /api/incidents — all authenticated (scoped in controller)
router.get('/', incidentsController.getAll);

// GET /api/incidents/:id
router.get('/:id', incidentsController.getById);

// POST /api/incidents — miners and overmen report incidents
router.post('/', authorize(['ROLE_MINER', 'ROLE_OVERMAN']), [
  body('description').notEmpty().withMessage('Description is required')
], validate, incidentsController.create);

// PUT /api/incidents/:id — managers can update incidents
router.put('/:id', authorize(['ROLE_MINE_MANAGER']), incidentsController.update);

module.exports = router;
