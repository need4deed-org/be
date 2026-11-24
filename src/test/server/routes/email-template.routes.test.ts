import { FastifyInstance } from "fastify";
import {
  EmailTemplateLayout,
  EmailTemplateName,
  Lang,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { accessCookieName } from "../../../config/constants";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import type { CdnStorage } from "../../../services/cdn-storage";
import { EMAIL_TEMPLATES } from "../../../services/notify/email-templates";
import { randomNumericSuffix } from "../../random";

const bucket = vi.hoisted(() => ({
  files: new Map<string, string>(),
  enabled: true,
}));

vi.mock("../../../services/cdn-storage", () => ({
  getCdnStorage: (): CdnStorage | null =>
    bucket.enabled
      ? {
          read: async (key) => bucket.files.get(key) ?? null,
          write: async (key, body) => {
            bucket.files.set(key, body);
          },
        }
      : null,
}));

const PASSWORD = "test_password";
const STALE_KEY = "emails/stale.json";
const TAGGED_KEY = "emails/tagged.json";

const staleFile = {
  subject: "Noch dabei, {{ volunteerName }}?",
  text: "Hallo {{ volunteerName }}, wie geht's?",
  html: "<p>Hallo {{ volunteerName }}</p>",
};

describe("admin email templates", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const emails: string[] = [];
  const cookies: Partial<Record<UserRole, string>> = {};

  const login = async (role: UserRole) => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Template", lastName: `${role}${suffix}` }),
    );
    const email = `email-template-${role}-${suffix}@test.need4deed.org`;
    emails.push(email);
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
  };

  const request = (
    method: "GET" | "PUT",
    url: string,
    payload?: object,
    role = UserRole.ADMIN,
  ) =>
    fastify.inject({
      method,
      url: `/admin/email-template${url}`,
      cookies: { [accessCookieName]: cookies[role] as string },
      ...(payload ? { payload } : {}),
    });

  const getStale = async () =>
    (await request("GET", `/${EmailTemplateName.STALE}`)).json().data;

  const putStale = async (template: object, version?: string) =>
    request("PUT", `/${EmailTemplateName.STALE}`, {
      version: version ?? (await getStale()).version,
      template,
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    cookies[UserRole.ADMIN] = await login(UserRole.ADMIN);
    cookies[UserRole.COORDINATOR] = await login(UserRole.COORDINATOR);
  });

  afterAll(async () => {
    const users = await fastify.db.userRepository.find({
      where: { email: In(emails) },
    });
    await fastify.db.userRepository.remove(users);
    await fastify.db.personRepository.delete({
      id: In(users.map((u) => u.personId)),
    });
    await fastify.close();
  });

  beforeEach(() => {
    bucket.enabled = true;
    bucket.files.clear();
    bucket.files.set(STALE_KEY, JSON.stringify(staleFile));
    EMAIL_TEMPLATES[EmailTemplateName.STALE].loader.resetCache();
  });

  it("is for admins only", async () => {
    const res = await request("GET", "/", undefined, UserRole.COORDINATOR);
    expect(res.statusCode).toBe(403);
  });

  it("lists every template with its stored layout", async () => {
    bucket.files.set(
      TAGGED_KEY,
      JSON.stringify({
        en: { subject: "s", text: "t" },
        de: { subject: "s", text: "t" },
      }),
    );
    const res = await request("GET", "/");
    expect(res.statusCode).toBe(200);
    const { editable, templates } = res.json().data;
    expect(editable).toBe(true);
    expect(templates).toHaveLength(Object.values(EmailTemplateName).length);
    expect(templates).toContainEqual({
      name: EmailTemplateName.STALE,
      layout: EmailTemplateLayout.SINGLE,
    });
    expect(templates).toContainEqual({
      name: EmailTemplateName.TAGGED,
      layout: EmailTemplateLayout.PER_LANGUAGE,
    });
  });

  it("returns the stored text, its placeholders and that it has html", async () => {
    const data = await getStale();
    expect(data).toMatchObject({
      name: EmailTemplateName.STALE,
      editable: true,
      hasHtml: true,
      labelKeys: [],
      placeholders: [{ name: "volunteerName", required: true }],
      template: {
        layout: EmailTemplateLayout.SINGLE,
        content: { subject: staleFile.subject, text: staleFile.text },
      },
    });
    expect(data.version).toEqual(expect.any(String));
  });

  it("falls back to the builtin labels for a template stored without them", async () => {
    bucket.files.set(
      TAGGED_KEY,
      JSON.stringify({
        en: { subject: "s", text: "t" },
        de: { subject: "s", text: "t", labels: { someone: "Eine Person" } },
      }),
    );
    const { data } = (
      await request("GET", `/${EmailTemplateName.TAGGED}`)
    ).json();
    expect(data.labelKeys).toContain("someone");
    expect(data.template.content[Lang.EN].labels.someone).toBe("Someone");
    expect(data.template.content[Lang.DE].labels.someone).toBe("Eine Person");
  });

  it("saves plain text, keeps the old file in history and serves the new text at once", async () => {
    const template = {
      layout: EmailTemplateLayout.SINGLE,
      content: {
        subject: "Neu {{ volunteerName }}",
        text: "Hi {{ volunteerName }}",
      },
    };
    const res = await putStale(template);
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      hasHtml: false,
      cdnCacheSeconds: 300,
      template,
    });

    expect(JSON.parse(bucket.files.get(STALE_KEY) as string)).toEqual(
      template.content,
    );
    const history = [...bucket.files.keys()].filter((key) =>
      key.startsWith("emails/_history/stale/"),
    );
    expect(history).toHaveLength(1);
    expect(JSON.parse(bucket.files.get(history[0]) as string)).toEqual(
      staleFile,
    );
    expect(
      await EMAIL_TEMPLATES[EmailTemplateName.STALE].loader.load(),
    ).toEqual(template.content);
  });

  it("switches a single-language template to one text per language", async () => {
    const content = {
      [Lang.EN]: {
        subject: "Hi {{ volunteerName }}",
        text: "EN {{ volunteerName }}",
      },
      [Lang.DE]: {
        subject: "Hallo {{ volunteerName }}",
        text: "DE {{ volunteerName }}",
      },
    };
    const res = await putStale({
      layout: EmailTemplateLayout.PER_LANGUAGE,
      content,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(bucket.files.get(STALE_KEY) as string)).toEqual(content);
  });

  it("refuses a save based on an outdated version", async () => {
    const res = await putStale(
      {
        layout: EmailTemplateLayout.SINGLE,
        content: {
          subject: "{{ volunteerName }}",
          text: "{{ volunteerName }}",
        },
      },
      "outdated",
    );
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("version_conflict");
    expect(JSON.parse(bucket.files.get(STALE_KEY) as string)).toEqual(
      staleFile,
    );
  });

  it("refuses an unknown placeholder", async () => {
    const res = await putStale({
      layout: EmailTemplateLayout.SINGLE,
      content: {
        subject: "{{ volunteerName }}",
        text: "{{ volunteerName }} {{ password }} {{ volunteerName.fr }}",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: "unknown_placeholder",
      placeholders: ["password", "volunteerName.fr"],
    });
  });

  it("refuses dropping a placeholder the stored text uses, naming the language", async () => {
    const res = await putStale({
      layout: EmailTemplateLayout.PER_LANGUAGE,
      content: {
        [Lang.EN]: { subject: "Hi", text: "Hi {{ volunteerName }}" },
        [Lang.DE]: { subject: "Hallo", text: "Hallo" },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      code: "missing_placeholder",
      lang: Lang.DE,
      placeholders: ["volunteerName"],
    });
  });

  it("refuses blank fields and unknown labels", async () => {
    const blank = await putStale({
      layout: EmailTemplateLayout.SINGLE,
      content: { subject: " ", text: "{{ volunteerName }}" },
    });
    expect(blank.json()).toMatchObject({
      code: "blank_field",
      fields: ["subject"],
    });

    const label = await putStale({
      layout: EmailTemplateLayout.SINGLE,
      content: {
        subject: "{{ volunteerName }}",
        text: "{{ volunteerName }}",
        labels: { someone: "Jemand" },
      },
    });
    expect(label.json()).toMatchObject({
      code: "unknown_label",
      fields: ["labels.someone"],
    });
  });

  it("refuses to save without CDN write access", async () => {
    bucket.enabled = false;
    const res = await request("PUT", `/${EmailTemplateName.STALE}`, {
      version: "any",
      template: {
        layout: EmailTemplateLayout.SINGLE,
        content: {
          subject: "{{ volunteerName }}",
          text: "{{ volunteerName }}",
        },
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("not_editable");
  });
});
