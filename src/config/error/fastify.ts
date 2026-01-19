import { BaseError } from "./base";

export class BadRequestError extends BaseError {
  constructor(message = "Bad Request") {
    super(message, 400);
  }
}

export class UnauthenticatedError extends BaseError {
  constructor(message = "Unauthenticated") {
    super(message, 401);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = "Unauthorized") {
    super(message, 403);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}
