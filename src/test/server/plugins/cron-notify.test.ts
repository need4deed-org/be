import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import logger from "../../../logger";
import { createServer } from "../../../server";
import {
  buildCronEmailTransport,
  cronSlackTransport,
  emailedCronHeader,
} from "../../../server/plugins/notify";
import {
  BrevoEmailTransport,
  CRON_EMAIL_DRY_RUN,
  CRON_EMAIL_NOT_SENT,
  CRON_EMAIL_SENT,
  DRY_RUN_RECIPIENT,
  DryRunSlackTransport,
  SlackEmailTransport,
  SmtpEmailTransport,
} from "../../../services/notify";

// Templates come from the built-in content: no CDN in tests.
vi.mock("../../../data/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../data/utils")>();
  return {
    ...actual,
    fetchJsonFromUrl: vi.fn().mockRejectedValue(new Error("no CDN in tests")),
  };
});

vi.setConfig({ testTimeout: 30_000 });

const CRON_WEBHOOK = "https://hooks.example/cron";

const person = (name: string, email: string) => ({
  name,
  firstName: name,
  lastName: "",
  email,
  users: [],
});
const ov = {
  id: 1,
  volunteerId: 1,
  opportunityId: 1,
  volunteer: { id: 1, person: person("Vera", "vera@example.com") },
  opportunity: {
    id: 1,
    title: "Opportunity title",
    contactPerson: person("Con", "contact@example.com"),
  },
};
const opportunity = {
  id: 1,
  title: "Opportunity title",
  contactPerson: person("Con", "contact@example.com"),
  district: { title: "Mitte" },
  accompanying: { name: "Client", postcode: { value: "10115" } },
  onetimer: { date: new Date("2026-03-05T13:30:00.000Z") },
};

describe("fastify.cronNotify", () => {
  let fastify: FastifyInstance;
  const fetchMock = vi.fn(async () => new Response("ok"));
  const smtpSend = vi.spyOn(SmtpEmailTransport.prototype, "send");
  const brevoSend = vi.spyOn(BrevoEmailTransport.prototype, "send");

  beforeAll(async () => {
    process.env.SLACK_CRON_WEBHOOK_URL = CRON_WEBHOOK;
    process.env.NOTIFY_SLACK_DRY_RUN = "false";
    process.env.NOTIFY_EMAIL_DRY_RUN = "true";
    smtpSend.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", fetchMock);
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    delete process.env.SLACK_CRON_WEBHOOK_URL;
    delete process.env.NOTIFY_SLACK_DRY_RUN;
    delete process.env.NOTIFY_EMAIL_DRY_RUN;
    smtpSend.mockReset();
    vi.unstubAllGlobals();
    await fastify.close();
  });

  it.each([
    ["emailStale", () => fastify.cronNotify.emailStale(ov as never)],
    [
      "emailPostMatchCheckup",
      () => fastify.cronNotify.emailPostMatchCheckup(ov as never),
    ],
    [
      "emailRegularUpdate",
      () => fastify.cronNotify.emailRegularUpdate(opportunity as never),
    ],
  ])("%s posts to #cron-notifications and sends no email", async (_, run) => {
    fetchMock.mockClear();
    smtpSend.mockClear();
    brevoSend.mockClear();

    await run();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    expect(url).toBe(CRON_WEBHOOK);
    expect(JSON.parse(init.body).text).toBe("Cron email, not sent");
    expect(smtpSend).not.toHaveBeenCalled();
    expect(brevoSend).not.toHaveBeenCalled();
  });

  const postedHeader = () => {
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    expect(url).toBe(CRON_WEBHOOK);
    return JSON.parse(init.body).text;
  };

  const clearMocks = () => {
    fetchMock.mockClear();
    smtpSend.mockClear();
    brevoSend.mockClear();
  };

  it("emailAccompanyNotFound emails via SMTP_NOTIFY, then posts to #cron-notifications", async () => {
    clearMocks();

    await expect(
      fastify.cronNotify.emailAccompanyNotFound(opportunity as never),
    ).resolves.toBe("dry-run");

    expect(smtpSend).toHaveBeenCalledTimes(1);
    const sent = smtpSend.mock.calls[0][0];
    expect(sent.to).toBe(DRY_RUN_RECIPIENT);
    expect(sent.subject).toContain("contact@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(postedHeader()).toBe(CRON_EMAIL_DRY_RUN);
    expect(smtpSend.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0],
    );
    expect(brevoSend).not.toHaveBeenCalled();
  });

  it("emailAccompanyNotFound posts nothing when the email fails", async () => {
    clearMocks();
    smtpSend.mockRejectedValueOnce(new Error("smtp down"));

    await expect(
      fastify.cronNotify.emailAccompanyNotFound(opportunity as never),
    ).rejects.toThrow("smtp down");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("emailAccompanyNotFound fails and posts nothing when the email is suspended", async () => {
    clearMocks();
    const invalid = {
      ...opportunity,
      contactPerson: person("Con", "not-an-address"),
    };

    await expect(
      fastify.cronNotify.emailAccompanyNotFound(invalid as never),
    ).rejects.toThrow(/email suspended/);
    expect(smtpSend).toHaveBeenCalledTimes(1);
    expect(smtpSend.mock.calls[0][0].subject).toMatch(
      /^\[Suspended invalid email\]/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("emailAccompanyNotFound still succeeds when only the Slack post fails", async () => {
    clearMocks();
    fetchMock.mockRejectedValueOnce(new Error("slack down"));
    const error = vi.spyOn(logger, "error").mockImplementation(() => logger);
    try {
      await fastify.cronNotify.emailAccompanyNotFound(opportunity as never);

      expect(smtpSend).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining("not posted to #cron-notifications"),
      );
    } finally {
      error.mockRestore();
    }
  });

  it("no longer offers these emails on fastify.notify", () => {
    for (const name of [
      "emailStale",
      "emailPostMatchCheckup",
      "emailAccompanyNotFound",
      "emailRegularUpdate",
    ]) {
      expect(name in fastify.notify).toBe(false);
    }
  });
});

describe("emailedCronHeader", () => {
  it.each([
    ["really sent", { NOTIFY_EMAIL_DRY_RUN: "false" }, CRON_EMAIL_SENT],
    ["an email dry run", { NOTIFY_EMAIL_DRY_RUN: "true" }, CRON_EMAIL_DRY_RUN],
    ["no flag outside production", {}, CRON_EMAIL_DRY_RUN],
    ["no flag in production", { NODE_ENV: "production" }, CRON_EMAIL_SENT],
  ])("with %s", (_, env, header) => {
    expect(emailedCronHeader(env)).toBe(header);
  });
});

describe("cronSlackTransport", () => {
  it("uses Slack when the cron webhook is set", () => {
    const slack = { send: vi.fn() };
    expect(
      cronSlackTransport(slack, {
        NOTIFY_SLACK_DRY_RUN: "false",
        SLACK_CRON_WEBHOOK_URL: CRON_WEBHOOK,
      }),
    ).toBe(slack);
  });

  it("uses the dry-run Slack transport in a dry run", () => {
    const slack = new DryRunSlackTransport();
    expect(cronSlackTransport(slack, { NOTIFY_SLACK_DRY_RUN: "true" })).toBe(
      slack,
    );
  });

  it.each([
    ["no Slack at all", undefined],
    ["Slack without the cron webhook", { send: vi.fn() }],
  ])("with %s, warns once and returns nothing", (_, slack) => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);
    try {
      expect(
        cronSlackTransport(slack, {
          NOTIFY_SLACK_DRY_RUN: "false",
          SLACK_OPS_WEBHOOK_URL: "https://hooks.example/ops",
        }),
      ).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("buildCronEmailTransport", () => {
  it("posts through Slack with the given header", async () => {
    const slack = { send: vi.fn() };
    const transport = buildCronEmailTransport(slack, CRON_EMAIL_SENT);
    expect(transport).toBeInstanceOf(SlackEmailTransport);

    await transport.send({ to: "a@example.com", subject: "s", text: "t" });

    expect(slack.send).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "cron", text: CRON_EMAIL_SENT }),
    );
  });

  it("defaults to the not-sent header", async () => {
    const slack = { send: vi.fn() };
    await buildCronEmailTransport(slack).send({
      to: "a@example.com",
      subject: "s",
      text: "t",
    });

    expect(slack.send).toHaveBeenCalledWith(
      expect.objectContaining({ text: CRON_EMAIL_NOT_SENT }),
    );
  });

  it("drops the emails without a cron Slack transport", async () => {
    await expect(
      buildCronEmailTransport(undefined).send({
        to: "a@example.com",
        subject: "s",
        text: "t",
      }),
    ).resolves.toBeUndefined();
  });
});
