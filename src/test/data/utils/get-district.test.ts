import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import {
  getDistrictByTitle,
  getDistrictCentroids,
  getDistrictFromPostcode,
} from "../../../data/utils/get-district";
import { createServer } from "../../../server";

describe("getDistrictFromPostcode", () => {
  let fastify: FastifyInstance;
  let postcode: Postcode;
  let districtA: District;
  let districtB: District;
  let firstMapping: DistrictPostcode;
  let secondMapping: DistrictPostcode;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  // be#864: Date.now() % 10000 only has 10,000 possible values and is
  // correlated across parallel Vitest workers that start at nearly the same
  // wall-clock moment, so two workers can collide on the same postcode
  // value. Math.random() over a much wider space (like `suffix` above)
  // decorrelates workers and shrinks the collision odds to negligible.
  const numericSuffix = String(Math.floor(Math.random() * 1e6)).padStart(
    6,
    "0",
  );

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const districtRepository = dataSource.getRepository(District);
    const postcodeRepository = dataSource.getRepository(Postcode);
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);

    postcode = await postcodeRepository.save(
      new Postcode({ value: `1${numericSuffix}` }),
    );
    districtA = await districtRepository.save(
      new District({ title: `Test District A ${suffix}` }),
    );
    districtB = await districtRepository.save(
      new District({ title: `Test District B ${suffix}` }),
    );

    // Deliberately map this one postcode to two different districts — a
    // postcode can legitimately straddle more than one district, and
    // getDistrictFromPostcode needs a deterministic tie-break (be#827)
    // rather than whatever row Postgres happens to return first.
    firstMapping = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: postcode.id,
        districtId: districtA.id,
      }),
    );
    secondMapping = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: postcode.id,
        districtId: districtB.id,
      }),
    );
  });

  afterAll(async () => {
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);
    const districtRepository = dataSource.getRepository(District);
    const postcodeRepository = dataSource.getRepository(Postcode);

    await districtPostcodeRepository.delete({ id: firstMapping.id });
    await districtPostcodeRepository.delete({ id: secondMapping.id });
    await districtRepository.delete({ id: districtA.id });
    await districtRepository.delete({ id: districtB.id });
    await postcodeRepository.delete({ id: postcode.id });
    await fastify.close();
  });

  it("resolves to the district from the lowest DistrictPostcode id when a postcode maps to more than one district", async () => {
    expect(firstMapping.id).toBeLessThan(secondMapping.id);

    const result = await getDistrictFromPostcode({
      id: postcode.id,
    } as Postcode);

    expect(result?.id).toBe(districtA.id);
  });

  it("resolves by postcode value when only the value is given, not an id", async () => {
    const result = await getDistrictFromPostcode({
      value: postcode.value,
    } as Postcode);

    expect(result?.id).toBe(districtA.id);
  });

  it("resolves when given a bare postcode id (number), not a Postcode object", async () => {
    const result = await getDistrictFromPostcode(postcode.id);

    expect(result?.id).toBe(districtA.id);
  });

  it("returns null for a postcode with no district mapping", async () => {
    const postcodeRepository = dataSource.getRepository(Postcode);
    const unmapped = await postcodeRepository.save(
      new Postcode({ value: `2${numericSuffix}` }),
    );

    const result = await getDistrictFromPostcode({
      id: unmapped.id,
    } as Postcode);

    expect(result).toBeNull();

    await postcodeRepository.delete({ id: unmapped.id });
  });

  it("returns null when given null/undefined", async () => {
    expect(await getDistrictFromPostcode(null)).toBeNull();
    expect(await getDistrictFromPostcode(undefined)).toBeNull();
  });
});

describe("getDistrictByTitle", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("returns null for a title with no matching district", async () => {
    const result = await getDistrictByTitle(
      `Nonexistent District ${Date.now()}`,
    );
    expect(result).toBeNull();
  });
});

describe("getDistrictCentroids", () => {
  let fastify: FastifyInstance;
  let districtGeocoded: District;
  let districtUngeocoded: District;
  let postcodeA: Postcode;
  let postcodeB: Postcode;
  let postcodeNoCoords: Postcode;
  let mappingA: DistrictPostcode;
  let mappingB: DistrictPostcode;
  let mappingUngeocoded: DistrictPostcode;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const numericSuffix = String(Math.floor(Math.random() * 1e6)).padStart(
    6,
    "0",
  );

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const districtRepository = dataSource.getRepository(District);
    const postcodeRepository = dataSource.getRepository(Postcode);
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);

    districtGeocoded = await districtRepository.save(
      new District({ title: `Test Centroid District ${suffix}` }),
    );
    districtUngeocoded = await districtRepository.save(
      new District({ title: `Test Centroid District Ungeocoded ${suffix}` }),
    );

    postcodeA = await postcodeRepository.save(
      new Postcode({
        value: `1${numericSuffix}`,
        latitude: 52.4,
        longitude: 13.3,
      }),
    );
    postcodeB = await postcodeRepository.save(
      new Postcode({
        value: `2${numericSuffix}`,
        latitude: 52.6,
        longitude: 13.5,
      }),
    );
    postcodeNoCoords = await postcodeRepository.save(
      new Postcode({ value: `3${numericSuffix}` }),
    );

    mappingA = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: postcodeA.id,
        districtId: districtGeocoded.id,
      }),
    );
    mappingB = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: postcodeB.id,
        districtId: districtGeocoded.id,
      }),
    );
    mappingUngeocoded = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: postcodeNoCoords.id,
        districtId: districtUngeocoded.id,
      }),
    );
  });

  afterAll(async () => {
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);
    const districtRepository = dataSource.getRepository(District);
    const postcodeRepository = dataSource.getRepository(Postcode);

    await districtPostcodeRepository.delete({ id: mappingA.id });
    await districtPostcodeRepository.delete({ id: mappingB.id });
    await districtPostcodeRepository.delete({ id: mappingUngeocoded.id });
    await districtRepository.delete({ id: districtGeocoded.id });
    await districtRepository.delete({ id: districtUngeocoded.id });
    await postcodeRepository.delete({ id: postcodeA.id });
    await postcodeRepository.delete({ id: postcodeB.id });
    await postcodeRepository.delete({ id: postcodeNoCoords.id });
    await fastify.close();
  });

  it("returns an empty map for an empty input", async () => {
    const result = await getDistrictCentroids([]);
    expect(result.size).toBe(0);
  });

  it("averages lat/lon across a district's geocoded postcodes", async () => {
    const result = await getDistrictCentroids([districtGeocoded.id]);
    const centroid = result.get(districtGeocoded.id);
    expect(centroid?.latitude).toBeCloseTo(52.5);
    expect(centroid?.longitude).toBeCloseTo(13.4);
  });

  it("returns null lat/lon for a district whose postcodes have no coordinates", async () => {
    const result = await getDistrictCentroids([districtUngeocoded.id]);
    expect(result.get(districtUngeocoded.id)).toEqual({
      latitude: null,
      longitude: null,
    });
  });

  it("resolves multiple districts in one batch", async () => {
    const result = await getDistrictCentroids([
      districtGeocoded.id,
      districtUngeocoded.id,
    ]);
    expect(result.get(districtGeocoded.id)?.latitude).toBeCloseTo(52.5);
    expect(result.get(districtUngeocoded.id)).toEqual({
      latitude: null,
      longitude: null,
    });
  });
});
