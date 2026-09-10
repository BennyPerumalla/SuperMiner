const { Router } = require('express');
const spatialController = require('./spatial.controller');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');

const router = Router();

/**
 * @swagger
 * /api/spatial/violations/near-shaft/{shaft_id}:
 *   get:
 *     tags: [Spatial]
 *     summary: Find safety violations near a ventilation shaft
 *     description: |
 *       THE REQUIRED SPATIAL QUERY.
 *       Uses PostGIS ST_DWithin with geography cast for accurate
 *       meter-based distance calculations on Earth's surface.
 *       GiST index on incidents.location enables efficient spatial lookup.
 *     parameters:
 *       - in: path
 *         name: shaft_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the ventilation shaft sensor
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           default: 500
 *         description: Search radius in meters
 *     responses:
 *       200:
 *         description: List of violations with distances
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 violations:
 *                   - id: "uuid"
 *                     type: "safety_violation"
 *                     severity: "high"
 *                     description: "Workers without helmets"
 *                     distance_meters: 125.4
 *                     location: {type: "Point", coordinates: [87.1242, 24.9878]}
 *                 radius_meters: 500
 */
router.get(
  '/violations/near-shaft/:shaft_id',
  authenticate,
  authorize('incidents', 'read'),
  spatialController.findViolationsNearShaft
);

/**
 * @swagger
 * /api/spatial/incidents/nearby:
 *   get:
 *     tags: [Spatial]
 *     summary: Find incidents near a geographic point
 *     parameters:
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           default: 500
 *     responses:
 *       200:
 *         description: Nearby incidents with distances
 */
router.get(
  '/incidents/nearby',
  authenticate,
  authorize('incidents', 'read'),
  spatialController.findIncidentsNearPoint
);

/**
 * @swagger
 * /api/spatial/mines/{mine_id}/contains:
 *   get:
 *     tags: [Spatial]
 *     summary: Check if a point is within a mine boundary
 *     parameters:
 *       - in: path
 *         name: mine_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Boolean result
 */
router.get(
  '/mines/:mine_id/contains',
  authenticate,
  authorize('mines', 'read'),
  spatialController.checkPointInBoundary
);

/**
 * @swagger
 * /api/spatial/mines/{mine_id}/sensors:
 *   get:
 *     tags: [Spatial]
 *     summary: Get all sensors for a mine with locations
 *     parameters:
 *       - in: path
 *         name: mine_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sensors with GeoJSON locations
 */
router.get(
  '/mines/:mine_id/sensors',
  authenticate,
  authorize('mines', 'read'),
  spatialController.getMineSensors
);

module.exports = router;
