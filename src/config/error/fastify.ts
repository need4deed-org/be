import {
  AdminUserActionErrorCode,
  ApiEmailTemplateSaveError,
  EmailTemplateSaveErrorCode,
} from "need4deed-sdk";
import { BaseError } from "./base";

export class AdminActionError extends BaseError {
  constructor(code: AdminUserActionErrorCode, message: string) {
    super(message, 400, true, { code });
  }
}

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

export class CdnUnavailableError extends BaseError {
  constructor(message = "The CDN is unavailable.") {
    super(message, 502);
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

export class DeactivatedVolunteerError extends BaseError {
  constructor(message = "Volunteer account has been deactivated.") {
    super(message, 409);
  }
}

const EMAIL_TEMPLATE_SAVE_STATUS: Partial<
  Record<EmailTemplateSaveErrorCode, number>
> = { not_editable: 403, version_conflict: 409 };

export class EmailTemplateSaveError extends BaseError {
  constructor({ code, message, ...details }: ApiEmailTemplateSaveError) {
    super(message, EMAIL_TEMPLATE_SAVE_STATUS[code] ?? 400, true, {
      code,
      ...details,
    });
  }
}
