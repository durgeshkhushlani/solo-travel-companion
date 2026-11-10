// Express 4 does not catch rejected promises; this forwards them to the error handler.
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
