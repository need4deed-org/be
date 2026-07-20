import { Lang, UserRole } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { urlEmailVerification } from "../../../config/constants";
import { fetchJsonFromUrl } from "../../../data/utils";
import {
  resetVerificationTemplateCache,
  sendEmailVerification,
} from "../../../services/notify/events/email-verification";

vi.mock("../../../data/utils", () => ({
  fetchJsonFromUrl: vi.fn(),
}));

const send = vi.fn();
const deps = { email: { send }, jwt: { sign: () => "tok" } } as any;
const user = (over: any = {}) => ({ id: 1, email: "u@x.de", ...over });
const expectedUrl = `${urlEmailVerification}/tok`;

const manifest = {
  en: {
    subject: "Verify your account",
    html: '<a href="{{verificationUrl}}">{{verificationUrl}}</a>',
    text: "verify: {{verificationUrl}}",
  },
  de: {
    subject: "Konto bestätigen",
    html: '<a href="{{verificationUrl}}">{{verificationUrl}}</a>',
    text: "bestätige: {{verificationUrl}}",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  resetVerificationTemplateCache();
});

describe("sendEmailVerification", () => {
  it("uses the manifest entry for the user's locale and substitutes the URL", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(deps, user({ language: Lang.DE }));

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Konto bestätigen");
    expect(msg.text).toBe(`bestätige: ${expectedUrl}`);
    expect(msg.html).toBe(`<a href="${expectedUrl}">${expectedUrl}</a>`);
    expect(msg.html).not.toContain("{{verificationUrl}}");
  });

  it("falls back to the default locale (en) for an unsupported language", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(deps, user({ language: "fr" }));

    expect(send.mock.calls[0][0].subject).toBe("Verify your account");
  });

  it("caches the manifest within TTL (single fetch across two sends)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(deps, user({ language: Lang.EN }));
    await sendEmailVerification(deps, user({ language: Lang.DE }));

    expect(fetchJsonFromUrl).toHaveBeenCalledTimes(1);
  });

  it("falls back to built-in content when the manifest fetch fails, and still sends", async () => {
    vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("CDN down"));

    await sendEmailVerification(deps, user({ language: Lang.DE }));

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Konto erstellt"); // built-in de
    expect(msg.text).toContain(expectedUrl);
    expect(msg.text).not.toContain("{{verificationUrl}}");
  });

  it("falls back to built-in when the manifest entry is invalid (missing body)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({
      en: { subject: "no body here" },
    });

    await sendEmailVerification(deps, user({ language: Lang.EN }));

    expect(send.mock.calls[0][0].subject).toBe("Account Created"); // built-in en
  });

  it("throws when the user has no email", async () => {
    await expect(
      sendEmailVerification(deps, user({ email: undefined })),
    ).rejects.toThrow("User email is required");
  });

  it("appends ?role=agent to the URL for AGENT users", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(
      deps,
      user({ role: UserRole.AGENT, language: Lang.EN }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain(`${expectedUrl}?role=agent`);
  });

  it("does not append a role param for non-agent users", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(
      deps,
      user({ role: UserRole.USER, language: Lang.EN }),
    );

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain(expectedUrl);
    expect(msg.text).not.toContain("?role=");
  });
});
