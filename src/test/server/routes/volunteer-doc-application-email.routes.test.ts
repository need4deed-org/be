import { FastifyInstance } from "fastify";
import { CommunicationType, UserRole } from "need4deed-sdk";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import {
  AttachmentUnavailableError,
  EmailSendError,
  SuspendedEmailError,
} from "../../../services/notify";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

const { failLog } = vi.hoisted(() => ({ failLog: { on: false } }));
vi.mock(
  "../../../server/utils/data/log-email-communication",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../server/utils/data/log-email-communication")
      >();
    return {
      logEmailCommunication: (
        ...args: Parameters<typeof actual.logEmailCommunication>
      ) =>
        failLog.on
          ? Promise.reject(new Error("db blip"))
          : actual.logEmailCommunication(...args),
    };
  },
);

describe("POST /volunteer/:id/doc/application-email", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const personIds: number[] = [];
  const dealIds: number[] = [];
  const volunteerIds: number[] = [];
  let volunteer: Volunteer;
  let volunteerNoEmail: Volunteer;
  let coordinatorUser: User;
  let coordinatorCookie: string;
  let volunteerCookie: string;
  let emailCgcApplication: MockInstance<
    FastifyInstance["notify"]["emailCgcApplication"]
  >;

  async function makePerson(firstName: string, email?: string) {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName, lastName: `Efz${suffix}`, email }),
    );
    personIds.push(person.id);
    return person;
  }

  async function makeVolunteer(person: Person) {
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    dealIds.push(deal.id);
    const saved = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: person.id }),
    );
    volunteerIds.push(saved.id);
    return saved;
  }

  async function makeUser(person: Person, role: UserRole, language = "en") {
    const email = `${role}-efz-${suffix}-${person.id}@test.need4deed.org`;
    const user = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
        language,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    const cookie = res.cookies.find((c) => c.name === accessCookieName);
    if (!cookie) {
      throw new Error(`login failed for ${role}`);
    }
    return { user, cookie: cookie.value };
  }

  const send = (id: number, cookie?: string) =>
    fastify.inject({
      method: "POST",
      url: `/volunteer/${id}/doc/application-email`,
      ...(cookie ? { cookies: { [accessCookieName]: cookie } } : {}),
    });

  const communications = (volunteerId: number) =>
    fastify.db.communicationRepository.findBy({
      volunteerId,
      communicationType: CommunicationType.CGC_APPLICATION_EMAIL,
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const volunteerPerson = await makePerson(
      "Vera",
      `vera-efz-${suffix}@example.com`,
    );
    volunteer = await makeVolunteer(volunteerPerson);
    volunteerCookie = (
      await makeUser(volunteerPerson, UserRole.VOLUNTEER, "de")
    ).cookie;

    volunteerNoEmail = await makeVolunteer(await makePerson("Nomail"));

    const coordinator = await makeUser(
      await makePerson("Cora"),
      UserRole.COORDINATOR,
    );
    coordinatorUser = coordinator.user;
    coordinatorCookie = coordinator.cookie;
  });

  afterAll(async () => {
    await fastify.db.volunteerRepository.delete(volunteerIds);
    await fastify.db.dealRepository.delete(dealIds);
    for (const personId of personIds) {
      await fastify.db.userRepository.delete({ personId });
    }
    await fastify.db.personRepository.delete(personIds);
    await fastify.close();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    failLog.on = false;
    emailCgcApplication = vi
      .spyOn(fastify.notify, "emailCgcApplication")
      .mockResolvedValue(undefined);
    await fastify.db.communicationRepository.delete({
      volunteerId: volunteer.id,
    });
  });

  it("emails the volunteer, logs the send and returns sentAt", async () => {
    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(201);
    expect(emailCgcApplication).toHaveBeenCalledWith({
      volunteerEmail: `vera-efz-${suffix}@example.com`,
      volunteerName: `Vera Efz${suffix}`,
      language: "de",
      coordinatorName: `Cora Efz${suffix}`,
      coordinatorEmail: coordinatorUser.email,
    });
    const [comm] = await communications(volunteer.id);
    expect(comm.userId).toBe(coordinatorUser.id);
    expect(new Date(res.json().data.sentAt).getTime()).toBe(
      comm.date.getTime(),
    );
  });

  it("refuses an immediate resend", async () => {
    await send(volunteer.id, coordinatorCookie);
    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(409);
    expect(emailCgcApplication).toHaveBeenCalledTimes(1);
    expect(await communications(volunteer.id)).toHaveLength(1);
  });

  it("allows a resend after the guard window", async () => {
    await send(volunteer.id, coordinatorCookie);
    const [comm] = await communications(volunteer.id);
    await fastify.db.communicationRepository.update(comm.id, {
      date: new Date(Date.now() - 2 * 60 * 1000),
    });

    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(201);
    expect(await communications(volunteer.id)).toHaveLength(2);
  });

  it("returns 502 and logs nothing when the send fails", async () => {
    emailCgcApplication.mockRejectedValue(
      new EmailSendError(new Error("smtp down")),
    );

    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({
      message: "Application email not sent: mail server did not accept it",
      reason: "send-failed",
    });
    expect(await communications(volunteer.id)).toHaveLength(0);
  });

  it("says when the application form could not be loaded", async () => {
    emailCgcApplication.mockRejectedValue(
      new AttachmentUnavailableError(
        "https://cdn.example/form.pdf",
        new Error("fetch failed"),
      ),
    );

    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({
      message: "Application email not sent: application form unavailable",
      reason: "attachment-unavailable",
    });
    expect(await communications(volunteer.id)).toHaveLength(0);
  });

  it("sends nothing when the send cannot be logged", async () => {
    failLog.on = true;

    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(500);
    expect(emailCgcApplication).not.toHaveBeenCalled();
  });

  it("alerts ops when a failed send's log entry cannot be removed", async () => {
    emailCgcApplication.mockRejectedValue(new Error("smtp down"));
    vi.spyOn(fastify.db.communicationRepository, "remove").mockRejectedValue(
      new Error("db blip"),
    );
    const opsAlert = vi
      .spyOn(fastify.notify, "opsAlert")
      .mockResolvedValue(undefined);

    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(502);
    expect(opsAlert).toHaveBeenCalledWith(
      expect.stringContaining("could not be removed"),
    );
  });

  it("does not blame the mail server when the email could not be built", async () => {
    emailCgcApplication.mockRejectedValue(new TypeError("bad template"));

    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({
      message: "Application email not sent: email could not be built",
      reason: "render-failed",
    });
    expect(await communications(volunteer.id)).toHaveLength(0);
  });

  it("says why when the email failed validation", async () => {
    emailCgcApplication.mockRejectedValue(
      new SuspendedEmailError(["subject is blank"]),
    );

    const res = await send(volunteer.id, coordinatorCookie);

    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({
      message: "Application email not sent: subject is blank",
      reason: "email-invalid",
    });
  });

  it("sends once when two requests arrive together", async () => {
    emailCgcApplication.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
    );

    const statuses = (
      await Promise.all([
        send(volunteer.id, coordinatorCookie),
        send(volunteer.id, coordinatorCookie),
      ])
    )
      .map((res) => res.statusCode)
      .sort();

    expect(statuses).toEqual([201, 409]);
    expect(emailCgcApplication).toHaveBeenCalledTimes(1);
    expect(await communications(volunteer.id)).toHaveLength(1);
  });

  it("rejects a volunteer without an email address", async () => {
    const res = await send(volunteerNoEmail.id, coordinatorCookie);

    expect(res.statusCode).toBe(400);
    expect(emailCgcApplication).not.toHaveBeenCalled();
    expect(await communications(volunteerNoEmail.id)).toHaveLength(0);
  });

  it("returns 404 for an unknown volunteer", async () => {
    const res = await send(2_000_000_000, coordinatorCookie);

    expect(res.statusCode).toBe(404);
  });

  it("is coordinators only", async () => {
    expect((await send(volunteer.id, volunteerCookie)).statusCode).toBe(403);
    expect((await send(volunteer.id)).statusCode).toBe(401);
    expect(emailCgcApplication).not.toHaveBeenCalled();
  });
});
