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

// Distinct class (not just a BadRequestError message) so callers like the
// frontend can discriminate this specific case from the route's other
// BadRequestError throws via error.constructor.name, without string-matching
// on message text. The default message is a server-side diagnostic only
// (logged via request.log.error) — it is never shown to the end user, who
// sees the frontend's own translated copy instead. Deliberately worded
// unlike that copy so it can't be mistaken for user-facing text.
export class InvalidOrganizationEmailError extends BaseError {
  constructor(
    message = "Unrecognized or untrusted organization email domain.",
  ) {
    super(message, 400);
  }
}
