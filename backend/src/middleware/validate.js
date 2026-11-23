const { z } = require('zod');

/**
 * Express 5 makes req.query (and sometimes req.params) getter-only.
 * Reassigning them throws: "Cannot set property query of #<IncomingMessage>".
 */
const replaceReadonly = (req, key, value) => {
  try {
    req[key] = value;
  } catch {
    Object.defineProperty(req, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
};

const validate = (schema) => (req, res, next) => {
  try {
    const shape = {};

    if (schema.body) shape.body = schema.body;
    if (schema.query) shape.query = schema.query;
    if (schema.params) shape.params = schema.params;

    const validator = z.object(shape);
    const parsed = validator.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    if (parsed.query !== undefined) {
      replaceReadonly(req, 'query', parsed.query);
    }
    if (parsed.params !== undefined) {
      replaceReadonly(req, 'params', parsed.params);
    }

    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = (err.issues || []).map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        issues,
      });
    }

    next(err);
  }
};

module.exports = validate;
