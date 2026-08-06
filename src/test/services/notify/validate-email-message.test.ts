import { describe, expect, it } from "vitest";
import { validateEmailMessage } from "../../../services/notify/validate-email-message";

const validMessage = {
  to: "person@example.com",
  subject: "A valid subject",
  text: "A valid body.",
};

describe("validateEmailMessage", () => {
  it("returns no problems for a well-formed message", () => {
    expect(validateEmailMessage(validMessage)).toEqual([]);
  });

  it("flags a blank to", () => {
    expect(validateEmailMessage({ ...validMessage, to: "" })).toEqual([
      '"to" is blank',
    ]);
  });

  it("flags a to with no @", () => {
    const problems = validateEmailMessage({
      ...validMessage,
      to: "not-an-email",
    });
    expect(problems).toEqual([
      '"to" doesn\'t look like an email address: "not-an-email"',
    ]);
  });

  it("accepts an array to, joining for the report", () => {
    expect(
      validateEmailMessage({
        ...validMessage,
        to: ["a@example.com", "b@example.com"],
      }),
    ).toEqual([]);
  });

  it("flags a blank subject", () => {
    expect(validateEmailMessage({ ...validMessage, subject: "  " })).toEqual([
      "subject is blank",
    ]);
  });

  it("flags an unresolved placeholder in the subject", () => {
    const problems = validateEmailMessage({
      ...validMessage,
      subject: "Hi {{ name }}",
    });
    expect(problems).toEqual([
      'subject has an unresolved placeholder: "Hi {{ name }}"',
    ]);
  });

  it("flags an unresolved required (!) placeholder in the subject", () => {
    const problems = validateEmailMessage({
      ...validMessage,
      subject: "Date: {{ date! }}",
    });
    expect(problems).toEqual([
      'subject has an unresolved placeholder: "Date: {{ date! }}"',
    ]);
  });

  it("flags when neither text nor html is set", () => {
    expect(
      validateEmailMessage({ to: validMessage.to, subject: "Subject" }),
    ).toEqual(["neither text nor html body is set"]);
  });

  it("does not flag a message with only html set", () => {
    expect(
      validateEmailMessage({
        to: validMessage.to,
        subject: "Subject",
        html: "<p>body</p>",
      }),
    ).toEqual([]);
  });

  it("flags an unresolved placeholder in text", () => {
    expect(
      validateEmailMessage({ ...validMessage, text: "Hi {{ name }}" }),
    ).toEqual(["text has an unresolved placeholder"]);
  });

  it("flags an unresolved placeholder in html", () => {
    expect(
      validateEmailMessage({
        ...validMessage,
        html: "<p>Hi {{ name }}</p>",
      }),
    ).toEqual(["html has an unresolved placeholder"]);
  });

  it("never flags the literal word 'undefined' in legitimate user content", () => {
    expect(
      validateEmailMessage({
        ...validMessage,
        subject: "My undefined project",
        text: "Comment: undefined is a fine variable name to type here.",
      }),
    ).toEqual([]);
  });

  it("collects multiple problems at once", () => {
    const problems = validateEmailMessage({
      to: "",
      subject: "",
      text: undefined,
      html: undefined,
    });
    expect(problems).toEqual([
      '"to" is blank',
      "subject is blank",
      "neither text nor html body is set",
    ]);
  });
});
