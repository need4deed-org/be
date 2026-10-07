import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import logger from "../../../logger";
import { createServer } from "../../../server";
import { buildCronEmailTransport } from "../../../server/plugins/notify";
import {
  BrevoEmailTransport,
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

// be#1088: the cron jobs' emails are posted to Slack #cron-notifications and
// never sent.
describe("fastify.cronNotify", () => {
  let fastify: FastifyInstance;
  const fetchMock = vi.fn(async () => new Response("ok"));
  const smtpSend = vi.spyOn(SmtpEmailTransport.prototype, "send");
  const brevoSend = vi.spyOn(BrevoEmailTransport.prototype, "send");

  beforeAll(async () => {
    process.env.SLACK_CRON_WEBHOOK_URL = CRON_WEBHOOK;
    process.env.NOTIFY_SLACK_DRY_RUN = "false";
    vi.stubGlobal("fetch", fetchMock);
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    delete process.env.SLACK_CRON_WEBHOOK_URL;
    delete process.env.NOTIFY_SLACK_DRY_RUN;
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
      "emailAccompanyNotFound",
      () => fastify.cronNotify.emailAccompanyNotFound(opportunity as never),
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

describe("buildCronEmailTransport", () => {
  it("posts through Slack when the cron webhook is set", () => {
    expect(
      buildCronEmailTransport(
        { send: vi.fn() },
        { NOTIFY_SLACK_DRY_RUN: "false", SLACK_CRON_WEBHOOK_URL: CRON_WEBHOOK },
      ),
    ).toBeInstanceOf(SlackEmailTransport);
  });

  it("posts through the dry-run Slack transport in a dry run", () => {
    expect(
      buildCronEmailTransport(new DryRunSlackTransport(), {
        NOTIFY_SLACK_DRY_RUN: "true",
      }),
    ).toBeInstanceOf(SlackEmailTransport);
  });

  it.each([
    ["no Slack at all", undefined],
    ["Slack without the cron webhook", { send: vi.fn() }],
  ])("with %s, warns once and drops the emails", async (_, slack) => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);
    try {
      // Another channel's webhook doesn't count.
      const transport = buildCronEmailTransport(slack, {
        NOTIFY_SLACK_DRY_RUN: "false",
        SLACK_OPS_WEBHOOK_URL: "https://hooks.example/ops",
      });
      await transport.send({ to: "a@example.com", subject: "s", text: "t" });

      expect(warn).toHaveBeenCalledTimes(1);
      if (slack) {
        expect(slack.send).not.toHaveBeenCalled();
      }
    } finally {
      warn.mockRestore();
    }
  });
});
