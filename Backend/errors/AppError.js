export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) { return new AppError(message, 400, details); }
  static unauthorized(message) { return new AppError(message || 'Unauthorized', 401); }
  static forbidden(message) { return new AppError(message || 'Forbidden', 403); }
  static notFound(message) { return new AppError(message || 'Not found', 404); }
  static conflict(message) { return new AppError(message, 409); }
  static tooLarge(message) { return new AppError(message, 413); }
  static internal(message) { return new AppError(message || 'Internal Server Error', 500); }
}
