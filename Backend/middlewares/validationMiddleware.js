import { z } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      const parsed = schema.query.parse(req.query);
      Object.defineProperty(req, "query", {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    if (schema.params) {
      const parsed = schema.params.parse(req.params);
      Object.defineProperty(req, "params", {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed (NoSQL Injection Prevention)",
        details: error.flatten().fieldErrors,
      });
    }
    next(error);
  }
};
