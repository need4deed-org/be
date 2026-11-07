import districtGeometry from "../../../../public/data/district-geometry.json";
import berlinDistricts from "../../../../public/data/districts-berlin.json";
import Postcode from "../../../data/entity/location/postcode.entity";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import { firstDistrictPostcode } from "../../../data/utils/get-district";

type PostcodeWithDistricts = Postcode & {
  districtPostcode?: DistrictPostcode[];
};

type DistrictLocation = {
  districtId?: number;
  postcode?: PostcodeWithDistricts | null;
};

export type DistrictBucket =
  | { districtId: number }
  | { bucket: "unassignedBerlin" | "outsideBerlin" | "remote" };

type Coordinate = [number, number];
type LinearRing = Coordinate[];
type PolygonCoordinates = LinearRing[];
type MultiPolygonCoordinates = PolygonCoordinates[];

const berlinPostcodes = new Set(berlinDistricts.flatMap(({ plzs }) => plzs));

function isPointInRing(
  longitude: number,
  latitude: number,
  ring: LinearRing,
): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [currentLongitude, currentLatitude] = ring[i];
    const [previousLongitude, previousLatitude] = ring[j];
    const crosses =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude;

    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygon(
  longitude: number,
  latitude: number,
  polygon: PolygonCoordinates,
): boolean {
  const [outerRing, ...holes] = polygon;
  return (
    !!outerRing &&
    isPointInRing(longitude, latitude, outerRing) &&
    !holes.some((hole) => isPointInRing(longitude, latitude, hole))
  );
}

function isWithinBerlin(longitude: number, latitude: number): boolean {
  return districtGeometry.features.some(({ geometry }) => {
    const districtGeometry = geometry as
      | { type: "Polygon"; coordinates: PolygonCoordinates }
      | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };

    if (districtGeometry.type === "Polygon") {
      return isPointInPolygon(
        longitude,
        latitude,
        districtGeometry.coordinates,
      );
    }

    return districtGeometry.coordinates.some((polygon) =>
      isPointInPolygon(longitude, latitude, polygon),
    );
  });
}

export function getDistrictLocationBucket({
  districtId,
  postcode,
}: DistrictLocation): DistrictBucket {
  const mappedDistrictId =
    districtId ??
    (postcode?.districtPostcode
      ? firstDistrictPostcode(postcode.districtPostcode)?.districtId
      : undefined);

  if (mappedDistrictId !== undefined) {
    return { districtId: mappedDistrictId };
  }

  if (!postcode) {
    return { bucket: "remote" };
  }

  if (
    berlinPostcodes.has(postcode.value) ||
    (postcode.latitude !== null &&
      postcode.latitude !== undefined &&
      postcode.longitude !== null &&
      postcode.longitude !== undefined &&
      isWithinBerlin(postcode.longitude, postcode.latitude))
  ) {
    return { bucket: "unassignedBerlin" };
  }

  return { bucket: "outsideBerlin" };
}
