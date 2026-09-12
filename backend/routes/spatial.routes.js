const express = require('express');
const { authenticate } = require('../middleware/auth');
const spatialController = require('../controllers/spatial.controller');

const router = express.Router();

// All spatial routes require authentication
router.use(authenticate);

// Find incidents near a point (lat/lng/radius)
router.get('/incidents/nearby', spatialController.incidentsNearby);

// Find violations near a ventilation shaft (the key spatial query from the brief)
router.get('/violations/near-shaft/:shaftId', spatialController.violationsNearShaft);

// Get mine boundary as GeoJSON
router.get('/mines/:id/boundary', spatialController.mineBoundary);

module.exports = router;
