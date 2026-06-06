import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrevoEmailTransport } from "../../../services/notify/transports/email-brevo";

const msg = {
  to: "user@example.com",
  subject: "Account Created",
  text: "verify: https://x/y",
  html: "<p>verify</p>",
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BrevoEmailTransport", () => {
  it("POSTs to the Brevo API with the api-key header and mapped payload", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 201 });

    await new BrevoEmailTransport("secret-key").send({
      ...msg,
      from: "no-reply@need4deed.org",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(init.headers["api-key"]).toBe("secret-key");
    expect(JSON.parse(init.body)).toEqual({
      sender: { email: "no-reply@need4deed.org" },
      to: [{ email: "user@example.com" }],
      subject: "Account Created",
      htmlContent: "<p>verify</p>",
      textContent: "verify: https://x/y",
    });
  });

  it("throws (without calling fetch) when the api key is missing", async () => {
    await expect(new BrevoEmailTransport("").send(msg)).rejects.toThrow(
      /BREVO_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws with status and body on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"message":"Invalid sender"}'),
    });

    await expect(
      new BrevoEmailTransport("secret-key").send(msg),
    ).rejects.toThrow(/Brevo email failed \(400\): .*Invalid sender/);
  });
});
