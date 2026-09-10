const { Router } = require('express');
const inspectionsController = require('./inspections.controller');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { createInspectionSchema, updateInspectionSchema } = require('./inspections.schema');

const router = Router();

/**
 * @swagger
 * /api/inspections:
 *   get:
 *     tags: [Inspections]
 *     summary: List inspections (tenant-scoped)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, submitted]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [routine, safety_audit, compliance_audit, incident_followup]
 *     responses:
 *       200:
 *         description: List of inspections
 */
router.get('/', authenticate, authorize('inspections', 'read'), inspectionsController.findAll);

/**
 * @swagger
 * /api/inspections/{id}:
 *   get:
 *     tags: [Inspections]
 *     summary: Get inspection by ID (includes items)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inspection with checklist items
 */
router.get('/:id', authenticate, authorize('inspections', 'read'), inspectionsController.findById);

/**
 * @swagger
 * /api/inspections:
 *   post:
 *     tags: [Inspections]
 *     summary: Create a new inspection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [routine, safety_audit, compliance_audit, incident_followup]
 *               mine_id:
 *                 type: string
 *                 format: uuid
 *                 description: Required for DGMS inspectors
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Inspection created
 */
router.post('/', authenticate, authorize('inspections', 'create'), validate(createInspectionSchema), inspectionsController.create);

/**
 * @swagger
 * /api/inspections/{id}:
 *   put:
 *     tags: [Inspections]
 *     summary: Update an inspection
 *     description: When status changes to 'submitted', an outbox event is created for the future Web3 worker.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Inspection updated
 */
router.put('/:id', authenticate, authorize('inspections', 'update'), validate(updateInspectionSchema), inspectionsController.update);

module.exports = router;
