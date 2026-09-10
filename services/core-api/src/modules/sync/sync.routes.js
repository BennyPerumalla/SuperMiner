const { Router } = require('express');
const syncController = require('./sync.controller');
const authenticate = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const rateLimiter = require('../../middleware/rateLimiter');
const { pushBodySchema } = require('./sync.schema');

const router = Router();

/**
 * @swagger
 * /api/sync:
 *   get:
 *     tags: [Sync]
 *     summary: Pull changes since last sync (WatermelonDB)
 *     description: |
 *       Returns all changes (created, updated, deleted) across syncable
 *       tables since the client's last_pulled_at timestamp.
 *
 *       The returned `timestamp` should be stored and sent as
 *       `last_pulled_at` in the next pull request.
 *
 *       First sync: omit last_pulled_at or send 0.
 *     parameters:
 *       - in: query
 *         name: last_pulled_at
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Unix timestamp in milliseconds from last pull response
 *     responses:
 *       200:
 *         description: Changes since last sync
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     changes:
 *                       type: object
 *                       properties:
 *                         incidents:
 *                           type: object
 *                           properties:
 *                             created:
 *                               type: array
 *                             updated:
 *                               type: array
 *                             deleted:
 *                               type: array
 *                               items:
 *                                 type: string
 *                         inspections:
 *                           type: object
 *                         inspection_items:
 *                           type: object
 *                     timestamp:
 *                       type: integer
 *                       description: Server timestamp to use as next last_pulled_at
 */
router.get(
  '/',
  authenticate,
  authorize('sync', 'pull'),
  rateLimiter({ prefix: 'rl:sync:pull' }),
  syncController.pull
);

/**
 * @swagger
 * /api/sync:
 *   post:
 *     tags: [Sync]
 *     summary: Push local changes to server (WatermelonDB)
 *     description: |
 *       Receives changes made offline on the mobile device and
 *       applies them to the server database.
 *
 *       **Idempotent**: Safe to retry if the mobile client
 *       doesn't receive the 200 response.
 *
 *       **Server-wins**: If a record was modified on the server
 *       after the client's last pull, the server version is kept.
 *
 *       **Atomic**: All changes are applied in a single transaction.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [changes, lastPulledAt]
 *             properties:
 *               changes:
 *                 type: object
 *                 properties:
 *                   incidents:
 *                     type: object
 *                     properties:
 *                       created:
 *                         type: array
 *                         items:
 *                           type: object
 *                       updated:
 *                         type: array
 *                         items:
 *                           type: object
 *                       deleted:
 *                         type: array
 *                         items:
 *                           type: string
 *                           format: uuid
 *                   inspections:
 *                     type: object
 *                   inspection_items:
 *                     type: object
 *               lastPulledAt:
 *                 type: integer
 *                 description: Timestamp from the last successful pull
 *     responses:
 *       200:
 *         description: Push successful
 */
router.post(
  '/',
  authenticate,
  authorize('sync', 'push'),
  rateLimiter({ prefix: 'rl:sync:push' }),
  validate(pushBodySchema),
  syncController.push
);

module.exports = router;
