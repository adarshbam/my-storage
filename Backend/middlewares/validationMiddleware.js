import { z } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      const parsed = schema.query.parse(req.query);
      Object.keys(req.query).forEach((key) => delete req.query[key]);
      Object.assign(req.query, parsed);
    }
    if (schema.params) {
      const parsed = schema.params.parse(req.params);
      Object.keys(req.params).forEach((key) => delete req.params[key]);
      Object.assign(req.params, parsed);
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
