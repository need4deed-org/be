import { describe, expect, it } from "vitest";
import Postcode from "../../../../data/entity/location/postcode.entity";
import DistrictPostcode from "../../../../data/entity/m2m/district-postcode";
import { getDistrictLocationBucket } from "../../../../server/utils/data/district-map";

function createPostcode(postcode: Partial<Postcode> = {}): Postcode {
  return new Postcode({
    id: 1,
    value: "99999",
    latitude: null,
    longitude: null,
    districtPostcode: [],
    ...postcode,
  });
}

describe("getDistrictLocationBucket", () => {
  it("uses the first postcode district when no district is persisted", () => {
    const postcode = createPostcode({
      districtPostcode: [
        new DistrictPostcode({ id: 2, districtId: 8 }),
        new DistrictPostcode({ id: 1, districtId: 4 }),
      ],
    });

    expect(getDistrictLocationBucket({ postcode })).toEqual({ districtId: 4 });
  });

  it("counts a mapped Berlin postcode only once in its assigned district", () => {
    const postcode = createPostcode({
      districtPostcode: [
        new DistrictPostcode({ id: 1, districtId: 4 }),
        new DistrictPostcode({ id: 2, districtId: 8 }),
      ],
    });

    expect(getDistrictLocationBucket({ postcode })).toEqual({ districtId: 4 });
  });

  it("marks an unmapped Berlin postcode as unassigned", () => {
    const postcode = createPostcode({ value: "10115" });

    expect(getDistrictLocationBucket({ postcode })).toEqual({
      bucket: "unassignedBerlin",
    });
  });

  it("classifies an unmapped point inside Berlin as unassigned", () => {
    const postcode = createPostcode({
      latitude: 52.52,
      longitude: 13.405,
    });

    expect(getDistrictLocationBucket({ postcode })).toEqual({
      bucket: "unassignedBerlin",
    });
  });

  it("classifies a known postcode outside Berlin separately", () => {
    const postcode = createPostcode({
      value: "99999",
      latitude: 52,
      longitude: 13.405,
    });

    expect(getDistrictLocationBucket({ postcode })).toEqual({
      bucket: "outsideBerlin",
    });
  });

  it("classifies missing physical locations as remote", () => {
    expect(getDistrictLocationBucket({ postcode: null })).toEqual({
      bucket: "remote",
    });
  });
});
