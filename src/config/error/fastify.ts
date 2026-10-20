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

export class EmailNotSentError extends BaseError {
  constructor(message = "Email not sent", details?: Record<string, unknown>) {
    super(message, 502, true, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class InvalidOrganizationEmailError extends BaseError {
  constructor(
    message = "Unrecognized or untrusted organization email domain.",
  ) {
    super(message, 400);
  }
}

export class PersonAlreadyRegisteredError extends BaseError {
  constructor(
    message = "An account already exists for this email. Please log in instead.",
  ) {
    super(message, 400);
  }
}

export class AlreadyUsedTokenError extends BaseError {
  constructor(message = "Already used token.") {
    super(message, 409);
  }
}

export class EmailAlreadySentError extends BaseError {
  constructor(message = "Email already sent") {
    super(message, 409);
  }
}
