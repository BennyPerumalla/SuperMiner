const express = require('express');
const { authenticate } = require('../middleware/auth');
const syncController = require('../controllers/sync.controller');

const router = express.Router();

// All sync routes require authentication
router.use(authenticate);

// GET /api/sync?last_pulled_at=0 — pull changes since timestamp
router.get('/', syncController.pull);

// POST /api/sync — push offline changes (idempotent)
router.post('/', syncController.push);

module.exports = router;
