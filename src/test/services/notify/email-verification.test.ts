import { UserRole } from "need4deed-sdk";
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

// Flat — this template is no longer split by recipient locale (be#838).
const manifest = {
  subject: "Verify your account",
  html: '<a href="{{verificationUrl}}">{{verificationUrl}}</a>',
  text: "verify: {{verificationUrl}}",
};

beforeEach(() => {
  vi.clearAllMocks();
  resetVerificationTemplateCache();
});

describe("sendEmailVerification", () => {
  it("uses the flat manifest entry and substitutes the URL", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(deps, user());

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Verify your account");
    expect(msg.text).toBe(`verify: ${expectedUrl}`);
    expect(msg.html).toBe(`<a href="${expectedUrl}">${expectedUrl}</a>`);
    expect(msg.html).not.toContain("{{verificationUrl}}");
  });

  it("caches the manifest within TTL (single fetch across two sends)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(deps, user());
    await sendEmailVerification(deps, user());

    expect(fetchJsonFromUrl).toHaveBeenCalledTimes(1);
  });

  it("falls back to built-in content when the manifest fetch fails, and still sends", async () => {
    vi.mocked(fetchJsonFromUrl).mockRejectedValue(new Error("CDN down"));

    await sendEmailVerification(deps, user());

    const msg = send.mock.calls[0][0];
    expect(msg.subject).toBe("Verify your Need4Deed account email");
    expect(msg.text).toContain(expectedUrl);
    expect(msg.text).not.toContain("{{verificationUrl}}");
  });

  it("falls back to built-in when the manifest entry is invalid (missing body)", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue({ subject: "no body here" });

    await sendEmailVerification(deps, user());

    expect(send.mock.calls[0][0].subject).toBe(
      "Verify your Need4Deed account email",
    );
  });

  it("throws when the user has no email", async () => {
    await expect(
      sendEmailVerification(deps, user({ email: undefined })),
    ).rejects.toThrow("User email is required");
  });

  it("appends ?role=agent to the URL for AGENT users", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(deps, user({ role: UserRole.AGENT }));

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain(`${expectedUrl}?role=agent`);
  });

  it("does not append a role param for non-agent users", async () => {
    vi.mocked(fetchJsonFromUrl).mockResolvedValue(manifest);

    await sendEmailVerification(deps, user({ role: UserRole.USER }));

    const msg = send.mock.calls[0][0];
    expect(msg.text).toContain(expectedUrl);
    expect(msg.text).not.toContain("?role=");
  });
});
