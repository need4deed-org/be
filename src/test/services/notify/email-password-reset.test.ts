import { Lang } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { urlPasswordReset } from "../../../config/constants";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  resetPasswordResetTemplateCache,
  sendPasswordReset,
} from "../../../services/notify/events/email-password-reset";

vi.mock("../../../data/utils", () => ({
  fetchJsonFromUrl: vi.fn(),
}));

const send = vi.fn();
const deps = { email: { send }, jwt: { sign: () => "tok" } } as any;
const user = (over: any = {}) => ({ id: 1, email: "u@x.de", ...over });
const expectedUrl = `${urlPasswordReset}?token=${encodeURIComponent("tok")}`;

const manifest = {
  en: {
    subject: "Password Reset",
    html: '<a href="{{resetUrl}}">{{resetUrl}}</a>',
    text: "reset: {{resetUrl}}",
  },
  de: {
    subject: "Passwort zurücksetzen",
    html: '<a href="{{resetUrl}}">{{resetUrl}}</a>',
    text: "zurücksetzen: {{resetUrl}}",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  resetPasswordResetTemplateCache();
});

describe("sendPasswordReset", () => {
  it("uses the manifest entry for the user's locale and substitutes the URL", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendPasswordReset(deps, user({ language: Lang.DE }));

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Passwort zurücksetzen");
    expect(msg.text).toBe(`zurücksetzen: ${expectedUrl}`);
    expect(msg.html).toBe(`<a href="${expectedUrl}">${expectedUrl}</a>`);
    expect(msg.html).not.toContain("{{resetUrl}}");
  });

  it("falls back to the default locale (en) for an unsupported language", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendPasswordReset(deps, user({ language: "fr" }));

    expect(send.mock.calls[0][0].subject).toBe("Password Reset");
  });

  it("caches the manifest within TTL (single fetch across two sends)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendPasswordReset(deps, user({ language: Lang.EN }));
    await sendPasswordReset(deps, user({ language: Lang.DE }));

    expect(fetchJsonFromUrl).toHaveBeenCalledTimes(1);
  });

  it("falls back to built-in content when the manifest fetch fails, and still sends", async () => {
    vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("CDN down"));

    await sendPasswordReset(deps, user({ language: Lang.DE }));

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Passwort zurücksetzen");
    expect(msg.text).toContain(expectedUrl);
    expect(msg.text).not.toContain("{{resetUrl}}");
  });

  it("falls back to built-in when the manifest entry is invalid (missing body)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      en: { subject: "no body here" },
    });

    await sendPasswordReset(deps, user({ language: Lang.EN }));

    expect(send.mock.calls[0][0].subject).toBe("Password Reset");
  });

  it("throws when the user has no email", async () => {
    await expect(
      sendPasswordReset(deps, user({ email: undefined })),
    ).rejects.toThrow("User email is required");
  });
});
