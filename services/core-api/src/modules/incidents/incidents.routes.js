const { Router } = require('express');
const incidentsController = require('./incidents.controller');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { createIncidentSchema, updateIncidentSchema } = require('./incidents.schema');

const router = Router();

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     tags: [Incidents]
 *     summary: List incidents (tenant-scoped)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of incidents
 */
router.get('/', authenticate, authorize('incidents', 'read'), incidentsController.findAll);

/**
 * @swagger
 * /api/incidents/{id}:
 *   get:
 *     tags: [Incidents]
 *     summary: Get incident by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Incident details
 */
router.get('/:id', authenticate, authorize('incidents', 'read'), incidentsController.findById);

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     tags: [Incidents]
 *     summary: Report a new incident
 *     description: Creates a new safety incident. mine_id and reported_by are set server-side from the JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, severity, description, occurred_at]
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: Mobile-generated UUID (for sync)
 *               type:
 *                 type: string
 *                 enum: [safety_violation, gas_leak, roof_fall, equipment_failure, fire, flooding, ppe_violation, electrical_hazard, blasting_incident, other]
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               description:
 *                 type: string
 *               occurred_at:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: object
 *                 description: "GeoJSON Point: {type: 'Point', coordinates: [lng, lat]}"
 *     responses:
 *       201:
 *         description: Incident created
 */
router.post('/', authenticate, authorize('incidents', 'create'), validate(createIncidentSchema), incidentsController.create);

/**
 * @swagger
 * /api/incidents/{id}:
 *   put:
 *     tags: [Incidents]
 *     summary: Update an incident
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Incident updated
 */
router.put('/:id', authenticate, authorize('incidents', 'update'), validate(updateIncidentSchema), incidentsController.update);

router.delete('/:id', authenticate, authorize('incidents', 'update'), incidentsController.remove);

module.exports = router;
