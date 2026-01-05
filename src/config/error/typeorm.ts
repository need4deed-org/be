import { BaseError } from "./base";

export class DatabaseError extends BaseError {
  public readonly detail?: string;
  public readonly code?: string; // SQL State code

  constructor(
    message: string,
    statusCode = 500,
    detail?: string,
    code?: string,
  ) {
    super(message, statusCode);
    this.detail = detail;
    this.code = code;
  }
}

export class EntityNotFoundError extends DatabaseError {
  constructor(entityName: string, criteria: unknown) {
    super(
      `${entityName} with criteria ${JSON.stringify(criteria)} was not found`,
      404,
    );
  }
}

export class ConflictError extends DatabaseError {
  constructor(detail: string) {
    // Used for Unique Constraint violations (SQL State 23505)
    super("Conflict: Resource already exists", 409, detail);
  }
}
