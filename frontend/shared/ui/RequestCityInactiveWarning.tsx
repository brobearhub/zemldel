import { Alert } from "@mui/material";
import type { RequestCityDto } from "@/entities/request";

type RequestCityInactiveWarningProps = {
  show: boolean;
  city?: RequestCityDto | null;
};

function formatCityLabel(city?: RequestCityDto | null): string {
  if (!city) return "выбранная локация";
  const region = city.regionName.trim();
  if (region) return `${city.name}, ${region}`;
  return city.name;
}

export function RequestCityInactiveWarning(props: RequestCityInactiveWarningProps) {
  if (!props.show) return null;

  return (
    <Alert severity="warning">
      {formatCityLabel(props.city)} больше не актуальна в справочнике ФИАС/ГАР. Заявка сохранена,
      но при необходимости выберите другую локацию в новых заявках.
    </Alert>
  );
}
