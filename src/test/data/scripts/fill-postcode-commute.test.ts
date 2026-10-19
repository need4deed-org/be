import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import PostcodeCommute from "../../../data/entity/location/postcode-commute.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import {
  fetchVbbJourneys,
  journeysUrl,
  nextTuesdayDeparture,
  orderedPairs,
  parseArgs,
  runFill,
  shortestJourneyMinutes,
  VbbJourneysResponse,
} from "../../../data/scripts/fill-postcode-commute";
import { randomNumericSuffix } from "../../random";

const journey = (departure: string | null, arrival: string | null) => ({
  legs: [
    { departure, plannedDeparture: departure },
    { arrival, plannedArrival: arrival },
  ],
});

describe("fill-postcode-commute parseArgs", () => {
  it("defaults to filling missing pairs of all postcodes", () => {
    expect(parseArgs([])).toEqual({ refresh: false, dryRun: false });
  });

  it("recognizes --refresh, --dry-run and --postcodes", () => {
    expect(
      parseArgs(["--refresh", "--dry-run", "--postcodes", "10178,12043"]),
    ).toEqual({
      refresh: true,
      dryRun: true,
      postcodes: ["10178", "12043"],
    });
  });

  it("rejects --postcodes without a valid list", () => {
    expect(() => parseArgs(["--postcodes"])).toThrow(
      "--postcodes requires a comma-separated list",
    );
    expect(() => parseArgs(["--postcodes", "--refresh"])).toThrow(
      "--postcodes requires a comma-separated list",
    );
    expect(() => parseArgs(["--postcodes", "10178,abc"])).toThrow(
      "--postcodes must be a comma-separated list of 5-digit postcodes",
    );
  });

  it("rejects unknown arguments", () => {
    expect(() => parseArgs(["--apply"])).toThrow('Unknown argument "--apply"');
  });
});

describe("nextTuesdayDeparture", () => {
  it("is 10:00 Berlin summer time on the coming Tuesday", () => {
    expect(nextTuesdayDeparture(new Date(2026, 9, 19)).toISOString()).toBe(
      "2026-10-20T08:00:00.000Z",
    );
  });

  it("skips to next week when today is Tuesday, in winter time after the DST switch", () => {
    expect(nextTuesdayDeparture(new Date(2026, 9, 20)).toISOString()).toBe(
      "2026-10-27T09:00:00.000Z",
    );
  });

  it("skips a Tuesday that is a Berlin public holiday", () => {
    expect(nextTuesdayDeparture(new Date(2028, 9, 2)).toISOString()).toBe(
      "2028-10-10T08:00:00.000Z",
    );
  });
});

describe("orderedPairs", () => {
  it("returns both directions of every pair, without self pairs", () => {
    expect(orderedPairs(["a", "b", "c"])).toEqual([
      ["a", "b"],
      ["a", "c"],
      ["b", "a"],
      ["b", "c"],
      ["c", "a"],
      ["c", "b"],
    ]);
  });
});

describe("journeysUrl", () => {
  it("queries VBB journeys between the two postcode centres", () => {
    const url = new URL(
      journeysUrl(
        { id: 1, value: "10178", latitude: 52.5219, longitude: 13.4132 },
        { id: 2, value: "12043", latitude: 52.4769, longitude: 13.4317 },
        new Date("2026-10-20T08:00:00.000Z"),
      ),
    );
    expect(url.origin + url.pathname).toBe(
      "https://v6.vbb.transport.rest/journeys",
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      "from.latitude": "52.5219",
      "from.longitude": "13.4132",
      "from.address": "10178",
      "to.latitude": "52.4769",
      "to.longitude": "13.4317",
      "to.address": "12043",
      departure: "2026-10-20T08:00:00.000Z",
    });
  });
});

describe("shortestJourneyMinutes", () => {
  it("takes the shortest journey from first departure to last arrival", () => {
    expect(
      shortestJourneyMinutes({
        journeys: [
          journey("2026-10-20T10:00:00+02:00", "2026-10-20T10:31:00+02:00"),
          journey("2026-10-20T10:05:00+02:00", "2026-10-20T10:30:00+02:00"),
        ],
      }),
    ).toBe(25);
  });

  it("uses planned times over realtime ones", () => {
    expect(
      shortestJourneyMinutes({
        journeys: [
          {
            legs: [
              {
                departure: "2026-10-20T10:00:00+02:00",
                plannedDeparture: "2026-10-20T10:00:00+02:00",
              },
              {
                arrival: "2026-10-20T10:55:00+02:00",
                plannedArrival: "2026-10-20T10:30:00+02:00",
              },
            ],
          },
        ],
      }),
    ).toBe(30);
  });

  it("falls back to realtime times and skips journeys without times", () => {
    expect(
      shortestJourneyMinutes({
        journeys: [
          journey(null, "2026-10-20T10:20:00+02:00"),
          {
            legs: [
              {
                departure: "2026-10-20T10:00:00+02:00",
                plannedDeparture: null,
              },
              { arrival: "2026-10-20T10:40:00+02:00", plannedArrival: null },
            ],
          },
        ],
      }),
    ).toBe(40);
  });

  it("is null when there is no usable journey", () => {
    expect(shortestJourneyMinutes({})).toBeNull();
    expect(shortestJourneyMinutes({ journeys: [] })).toBeNull();
    expect(
      shortestJourneyMinutes({ journeys: [journey(null, null)] }),
    ).toBeNull();
  });
});

describe("fetchVbbJourneys", () => {
  const ok = (body: VbbJourneysResponse) =>
    new Response(JSON.stringify(body), { status: 200 });

  it("retries on 429 and 5xx, then returns the journeys", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(ok({ journeys: [] }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(fetchVbbJourneys("u", sleep, fetchFn)).resolves.toEqual({
      journeys: [],
    });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry other client errors", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 400 }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(fetchVbbJourneys("u", sleep, fetchFn)).rejects.toThrow(
      "HTTP 400",
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("gives up after five attempts", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(fetchVbbJourneys("u", sleep, fetchFn)).rejects.toThrow(
      "TypeError: fetch failed",
    );
    expect(fetchFn).toHaveBeenCalledTimes(5);
  });
});

describe("runFill", () => {
  let postcodes: Postcode[];
  let withoutCoordinates: Postcode;
  const values = () => [
    ...postcodes.map((postcode) => postcode.value),
    withoutCoordinates.value,
  ];
  const deps = (
    fetchJourneys: (url: string) => Promise<VbbJourneysResponse>,
    maxConsecutiveFailures = 10,
  ) => ({
    fetchJourneys,
    sleep: () => Promise.resolve(),
    departure: new Date("2026-10-20T08:00:00.000Z"),
    maxConsecutiveFailures,
  });
  const commuteRows = () =>
    dataSource.getRepository(PostcodeCommute).find({
      where: { fromPostcodeId: In(postcodes.map((postcode) => postcode.id)) },
    });
  const minutesFor = (url: string) =>
    new URL(url).searchParams.get("to.address") === postcodes[2].value
      ? 40
      : 20;
  const answer = (minutes: number): VbbJourneysResponse => ({
    journeys: [
      journey(
        "2026-10-20T10:00:00+02:00",
        new Date(
          Date.parse("2026-10-20T10:00:00+02:00") + minutes * 60_000,
        ).toISOString(),
      ),
    ],
  });

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    postcodes = await dataSource.getRepository(Postcode).save(
      [0, 1, 2].map(
        (i) =>
          new Postcode({
            value: `9${randomNumericSuffix(4)}`,
            latitude: 52.5 + i / 100,
            longitude: 13.4,
          }),
      ),
    );
    withoutCoordinates = await dataSource
      .getRepository(Postcode)
      .save(new Postcode({ value: `9${randomNumericSuffix(4)}` }));
  });

  afterAll(async () => {
    await dataSource.getRepository(Postcode).delete({
      id: In([...postcodes, withoutCoordinates].map(({ id }) => id)),
    });
  });

  it("reports the pending pairs of postcodes with coordinates on a dry run, without fetching", async () => {
    const fetchJourneys = vi.fn();
    const report = await runFill(
      dataSource,
      { refresh: false, dryRun: true, postcodes: values() },
      deps(fetchJourneys),
    );
    expect(report.pending).toBe(6);
    expect(fetchJourneys).not.toHaveBeenCalled();
  });

  it("saves the minutes of every ordered pair", async () => {
    const report = await runFill(
      dataSource,
      { refresh: false, dryRun: false, postcodes: values() },
      deps((url) => Promise.resolve(answer(minutesFor(url)))),
    );
    expect(report).toMatchObject({
      pending: 6,
      saved: 6,
      noJourney: [],
      failed: [],
    });
    const rows = await commuteRows();
    expect(rows).toHaveLength(6);
    expect(
      rows.find(
        (row) =>
          row.fromPostcodeId === postcodes[0].id &&
          row.toPostcodeId === postcodes[2].id,
      )?.minutes,
    ).toBe(40);
  });

  it("skips pairs already filled unless --refresh", async () => {
    const fetchJourneys = vi.fn().mockResolvedValue(answer(55));

    const resumed = await runFill(
      dataSource,
      { refresh: false, dryRun: false, postcodes: values() },
      deps(fetchJourneys),
    );
    expect(resumed.pending).toBe(0);
    expect(fetchJourneys).not.toHaveBeenCalled();

    const refreshed = await runFill(
      dataSource,
      { refresh: true, dryRun: false, postcodes: values() },
      deps(fetchJourneys),
    );
    expect(refreshed.saved).toBe(6);
    expect(new Set((await commuteRows()).map((row) => row.minutes))).toEqual(
      new Set([55]),
    );
  });

  it("reports pairs without a journey or with a failed request and keeps going", async () => {
    await dataSource
      .getRepository(PostcodeCommute)
      .delete({ fromPostcodeId: postcodes[0].id });
    const fetchJourneys = vi
      .fn()
      .mockResolvedValueOnce({ journeys: [] })
      .mockRejectedValueOnce(new Error("HTTP 500"));

    const report = await runFill(
      dataSource,
      { refresh: false, dryRun: false, postcodes: values() },
      deps(fetchJourneys),
    );
    expect(report).toMatchObject({
      pending: 2,
      saved: 0,
      noJourney: [{ from: postcodes[0].value, to: postcodes[1].value }],
      failed: [
        { from: postcodes[0].value, to: postcodes[2].value, error: "HTTP 500" },
      ],
      stoppedEarly: false,
    });
  });

  it("stops after too many consecutive failed pairs", async () => {
    const fetchJourneys = vi.fn().mockRejectedValue(new Error("HTTP 503"));

    const report = await runFill(
      dataSource,
      { refresh: true, dryRun: false, postcodes: values() },
      deps(fetchJourneys, 2),
    );
    expect(fetchJourneys).toHaveBeenCalledTimes(2);
    expect(report).toMatchObject({ pending: 6, saved: 0, stoppedEarly: true });
    expect(report.failed).toHaveLength(2);
  });

  it("counts only consecutive failures towards the stop", async () => {
    const fetchJourneys = vi
      .fn()
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValueOnce(answer(20))
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValue(answer(20));

    const report = await runFill(
      dataSource,
      { refresh: true, dryRun: false, postcodes: values() },
      deps(fetchJourneys, 2),
    );
    expect(report).toMatchObject({ pending: 6, saved: 4, stoppedEarly: false });
    expect(report.failed).toHaveLength(2);
  });
});
