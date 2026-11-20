import type {
  GeocodedPoint,
  PointPrecision,
} from '../geocoding/geocoding.ports';

// The original /lands API exposes numeric accuracy codes.
const legacyAccuracy: Record<PointPrecision, string | null> = {
  exact: '0',
  nearby_house: '1',
  street: '2',
  settlement: '3',
  city: '4',
  unknown: null,
};

export function legacyPoint(point: GeocodedPoint | null) {
  return (
    point && {
      latitude: point.latitude,
      longitude: point.longitude,
      qcGeo: legacyAccuracy[point.precision],
    }
  );
}
