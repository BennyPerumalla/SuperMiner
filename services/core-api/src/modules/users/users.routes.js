const { Router } = require('express');
const usersController = require('./users.controller');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { updateUserSchema } = require('./users.schema');

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List users (tenant-scoped)
 *     responses:
 *       200:
 *         description: List of users (password_hash excluded)
 */
router.get('/', authenticate, authorize('users', 'read'), usersController.findAll);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/:id', authenticate, authorize('users', 'read'), usersController.findById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', authenticate, authorize('users', 'update'), validate(updateUserSchema), usersController.update);

router.delete('/:id', authenticate, authorize('users', 'update'), usersController.remove);

module.exports = router;
