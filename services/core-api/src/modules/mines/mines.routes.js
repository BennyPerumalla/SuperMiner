const { Router } = require('express');
const minesController = require('./mines.controller');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { createMineSchema, updateMineSchema } = require('./mines.schema');

const router = Router();

/**
 * @swagger
 * /api/mines:
 *   get:
 *     tags: [Mines]
 *     summary: List mines visible to the current user
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended, closed]
 *       - in: query
 *         name: mine_type
 *         schema:
 *           type: string
 *           enum: [opencast, underground]
 *     responses:
 *       200:
 *         description: List of mines with GeoJSON geometries
 */
router.get('/', authenticate, authorize('mines', 'read'), minesController.findAll);

/**
 * @swagger
 * /api/mines/{id}:
 *   get:
 *     tags: [Mines]
 *     summary: Get mine by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mine details with GeoJSON
 *       404:
 *         description: Mine not found
 */
router.get('/:id', authenticate, authorize('mines', 'read'), minesController.findById);

/**
 * @swagger
 * /api/mines:
 *   post:
 *     tags: [Mines]
 *     summary: Create a new mine
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, subsidiary_id, mine_type]
 *             properties:
 *               name:
 *                 type: string
 *               subsidiary_id:
 *                 type: string
 *                 format: uuid
 *               mine_type:
 *                 type: string
 *                 enum: [opencast, underground]
 *               location:
 *                 type: object
 *                 description: GeoJSON Point
 *               boundary:
 *                 type: object
 *                 description: GeoJSON Polygon
 *     responses:
 *       201:
 *         description: Mine created
 */
router.post('/', authenticate, authorize('mines', 'update'), validate(createMineSchema), minesController.create);

/**
 * @swagger
 * /api/mines/{id}:
 *   put:
 *     tags: [Mines]
 *     summary: Update a mine
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mine updated
 */
router.put('/:id', authenticate, authorize('mines', 'update'), validate(updateMineSchema), minesController.update);

module.exports = router;
