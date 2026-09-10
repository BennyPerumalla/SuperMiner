// =============================================================
// Validation Middleware (Zod)
// =============================================================
// WHY ZOD OVER JOI:
// - Zod schemas infer TypeScript types (future migration path).
// - Zod is more composable (.merge, .extend, .pick, .omit).
// - Zod has stricter parsing — no silent type coercion.
// - Joi allows "123" to pass as a number by default; Zod doesn't.
//
// WHY NOT express-validator:
// - express-validator is imperative (chain of function calls).
// - Zod is declarative (define the shape, parse against it).
// - Declarative schemas are easier to test, share, and document.
//
// HOW THIS MIDDLEWARE WORKS:
// It takes a Zod schema and returns Express middleware.
// The middleware parses the request body (or query/params)
// against the schema. If validation fails, it throws a
// ValidationError with structured error details.
// =============================================================

const { ValidationError } = require('../utils/errors');

/**
 * Creates validation middleware from a Zod schema.
 *
 * Usage:
 *   const { z } = require('zod');
 *   const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
 *   router.post('/login', validate(schema), controller.login);
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Which part of the request to validate
 * @returns {Function} Express middleware
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Transform Zod errors into a more readable format
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      return next(new ValidationError(errors));
    }

    // Replace the source with parsed data (strips unknown fields,
    // applies defaults, coerces types where defined).
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
