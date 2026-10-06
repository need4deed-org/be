import { describe, expect, it } from "vitest";
import { BadRequestError, UnauthorizedError } from "../../../config";
import { getErrorReply } from "../../../server/utils/error-reply";

const withProps = (name: string, props: Record<string, unknown>) =>
  Object.assign(Object.assign(new Error("boom"), { name }), props);

describe("getErrorReply()", () => {
  it("keeps a BaseError's status and message", () => {
    expect(getErrorReply(new UnauthorizedError("Permission denied."))).toEqual({
      statusCode: 403,
      body: { error: "UnauthorizedError", message: "Permission denied." },
    });
  });

  it("maps TypeORM EntityNotFoundError to 404", () => {
    const reply = getErrorReply(withProps("EntityNotFoundError", {}));
    expect(reply.statusCode).toBe(404);
    expect(reply.body.error).toBe("NotFoundError");
  });

  it("maps a Postgres unique violation to 409", () => {
    const reply = getErrorReply(
      withProps("QueryFailedError", { code: "23505", detail: "Key exists." }),
    );
    expect(reply.statusCode).toBe(409);
    expect(reply.body.error).toBe("ConflictError");
  });

  it("keeps other query failures as 500", () => {
    const reply = getErrorReply(
      withProps("QueryFailedError", { code: "42P01" }),
    );
    expect(reply.statusCode).toBe(500);
  });

  it("passes through plugin errors with a 4xx status", () => {
    const tooLarge = withProps("FastifyError", { statusCode: 413 });
    tooLarge.message = "request file too large";
    expect(getErrorReply(tooLarge)).toEqual({
      statusCode: 413,
      body: { message: "request file too large" },
    });
  });

  it("reports schema validation errors as 400", () => {
    const reply = getErrorReply(withProps("Error", { validation: [{}] }));
    expect(reply).toEqual({
      statusCode: 400,
      body: { message: "Validation failed." },
    });
  });

  it("hides unexpected errors behind a generic 500", () => {
    expect(getErrorReply(new TypeError("x is undefined"))).toEqual({
      statusCode: 500,
      body: { message: "Something went wrong." },
    });
    expect(getErrorReply(new BadRequestError("bad")).statusCode).toBe(400);
  });
});
