import { Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import type { RegionalCapitalAdminItemDto } from "@/entities/city";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { RegionalCapitalsAdminClient } from "../ui/RegionalCapitalsAdminClient";

export default async function RegionalCapitalsAdminPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) notFound();

  let cities: RegionalCapitalAdminItemDto[];

  try {
    cities = await fetchBackendJsonAsUser<RegionalCapitalAdminItemDto[]>(
      "/admin/regional-capitals",
      session.user.id,
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Столицы
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Галочка ставит город в первый эшелон. Стрелки задают порядок этих городов у пользователя. Поиск ниже ищет по справочнику, без этого списка.
        </Typography>
      </Stack>

      <RegionalCapitalsAdminClient initialCities={cities} />
    </Stack>
  );
}
