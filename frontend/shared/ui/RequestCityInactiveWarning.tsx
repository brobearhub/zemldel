import { Alert } from "@mui/material";
import type { RequestCityDto } from "@/entities/request";
import { formatCityLabel } from "@/shared/lib/format-city-label";

type RequestCityInactiveWarningProps = {
  show: boolean;
  city?: RequestCityDto | null;
};

function inactiveCityLabel(city?: RequestCityDto | null): string {
  if (!city) return "выбранная локация";
  return formatCityLabel(city.name, city.regionName);
}

export function RequestCityInactiveWarning(props: RequestCityInactiveWarningProps) {
  if (!props.show) return null;

  return (
    <Alert severity="warning">
      {inactiveCityLabel(props.city)} больше не актуальна в справочнике ФИАС/ГАР. Заявка сохранена,
      но при необходимости выберите другую локацию в новых заявках.
    </Alert>
  );
}
