// Parses one part of the request (body by default) with a zod schema and replaces it with the
// parsed value, so handlers only ever see trusted data.
export const validate =
  (schema, part = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
    }
    req[part] = result.data;
    next();
  };
