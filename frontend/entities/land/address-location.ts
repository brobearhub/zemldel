import type { GeocodedPoint, PointPrecision } from "@/entities/geocoding/types";

export const LAND_CADASTRAL_NUMBER = /^\d{2}:\d{2}:\d{6,7}:\d{1,10}$/;

const accuracy: Record<PointPrecision, { caption: string; zoom: number }> = {
  exact: { caption: "Точка установлена по точным координатам адреса.", zoom: 16 },
  nearby_house: { caption: "Точка установлена по ближайшему дому.", zoom: 16 },
  street: { caption: "Точка установлена с точностью до улицы.", zoom: 15 },
  settlement: { caption: "Точка установлена с точностью до населённого пункта.", zoom: 12 },
  city: { caption: "Точка установлена с точностью до города.", zoom: 10 },
  unknown: { caption: "Точка установлена по адресу.", zoom: 14 },
};

export function addressPointAccuracy(point: GeocodedPoint) {
  return accuracy[point.precision];
}
