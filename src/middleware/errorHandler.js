import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (statusCode === 500 && process.env.NODE_ENV !== 'test') {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    error: message
  });
}

export default errorHandler;
