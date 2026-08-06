import { describe, expect, it, vi } from "vitest";
import { ValidatingEmailTransport } from "../../../services/notify/transports/validating";
import type { EmailTransport } from "../../../services/notify/types";

function buildTransports() {
  const deliverable: EmailTransport = { send: vi.fn() };
  const errorTransport: EmailTransport = { send: vi.fn() };
  const transport = new ValidatingEmailTransport(
    deliverable,
    errorTransport,
    "dev@need4deed.org",
  );
  return { deliverable, errorTransport, transport };
}

describe("ValidatingEmailTransport", () => {
  it("passes a valid message through to the deliverable transport unchanged", async () => {
    const { deliverable, errorTransport, transport } = buildTransports();
    const msg = {
      to: "person@example.com",
      subject: "Hello",
      text: "A valid body.",
    };

    await transport.send(msg);

    expect(deliverable.send).toHaveBeenCalledWith(msg);
    expect(errorTransport.send).not.toHaveBeenCalled();
  });

  it("suspends an invalid message and reports it to the error recipient instead", async () => {
    const { deliverable, errorTransport, transport } = buildTransports();
    const msg = {
      to: "person@example.com",
      cc: "cc@example.com",
      from: "notify@need4deed.org",
      subject: "Date: {{ date! }}",
      text: "some body",
    };

    await transport.send(msg);

    expect(deliverable.send).not.toHaveBeenCalled();
    expect(errorTransport.send).toHaveBeenCalledTimes(1);

    const report = vi.mocked(errorTransport.send).mock.calls[0][0];
    expect(report.to).toBe("dev@need4deed.org");
    expect(report.from).toBe("notify@need4deed.org");
    expect(report.subject).toBe("[Suspended invalid email] Date: {{ date! }}");
    expect(report.text).toContain(
      'subject has an unresolved placeholder: "Date: {{ date! }}"',
    );
    expect(report.text).toContain("To: person@example.com");
    expect(report.text).toContain("Cc: cc@example.com");
    expect(report.text).toContain("some body");
  });

  it("reports a blank subject with a placeholder fallback in the report subject line", async () => {
    const { errorTransport, transport } = buildTransports();

    await transport.send({ to: "person@example.com", subject: "", text: "x" });

    const report = vi.mocked(errorTransport.send).mock.calls[0][0];
    expect(report.subject).toBe("[Suspended invalid email] (no subject)");
    expect(report.text).toContain("subject is blank");
  });
});
