import { describe, expect, it, vi } from "vitest";
import { errorEmailRecipient } from "../../../config/constants";
import { resolveOrAlert } from "../../../services/notify/resolve-or-alert";
import type { EmailTransport } from "../../../services/notify/types";

const LABELS = {
  dataLabel: "dealLanguage data",
  fieldLabel: "the volunteer's language",
  rowsLabel: "dealLanguage rows",
};

describe("resolveOrAlert", () => {
  it("returns the formatter's result without alerting on success", async () => {
    const email: EmailTransport = { send: vi.fn() };
    const formatter = vi.fn(() => "Deutsch, Englisch");

    const result = await resolveOrAlert(
      email,
      [],
      formatter,
      "",
      "test context",
      LABELS,
    );

    expect(result).toBe("Deutsch, Englisch");
    expect(email.send).not.toHaveBeenCalled();
  });

  it("falls back and alerts errorEmailRecipient when the formatter throws", async () => {
    const email: EmailTransport = { send: vi.fn() };
    const formatter = vi.fn(() => {
      throw new TypeError("Cannot read properties of null (reading 'id')");
    });

    const result = await resolveOrAlert(
      email,
      [],
      formatter,
      "",
      "sendEmailIntroduction, ov 42",
      LABELS,
    );

    expect(result).toBe("");
    expect(email.send).toHaveBeenCalledTimes(1);
    const alert = vi.mocked(email.send).mock.calls[0][0];
    expect(alert.to).toBe(errorEmailRecipient);
    expect(alert.subject).toContain("dealLanguage data");
    expect(alert.subject).toContain("sendEmailIntroduction, ov 42");
    expect(alert.text).toContain(
      "Cannot read properties of null (reading 'id')",
    );
    expect(alert.text).toContain("dealLanguage rows");
  });

  it("logs but does not throw when the alert transport itself fails", async () => {
    const email: EmailTransport = {
      send: vi.fn().mockRejectedValue(new Error("SMTP unreachable")),
    };
    const formatter = vi.fn(() => {
      throw new Error("boom");
    });

    const result = await resolveOrAlert(
      email,
      [],
      formatter,
      "fallback",
      "test context",
      LABELS,
    );

    expect(result).toBe("fallback");
  });
});
