import Link from "next/link";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { RequestReminderDto } from "@/entities/request";
import type { ServiceDto } from "@/entities/service";
import { HomeStoriesStrip } from "@/widgets/home-stories";
import {
  FreeRequestsSection,
  ProMyServicesSection,
} from "@/widgets/pro-my-services";
import { RemindersListView } from "@/widgets/pro-requests/ui/RemindersListView";
import { CabinetNotices } from "@/widgets/cabinet-chrome";
import {
  ProviderFirstSteps,
  type FirstSteps,
} from "@/widgets/provider-verification";
import { ProHomeSectionSwitch } from "./ProHomeSectionSwitch";

type Props = {
  canCreateClientRequest?: boolean;
  services: ServiceDto[];
  reminders: RequestReminderDto[];
  firstSteps: FirstSteps | null;
};

export function ProHomePage({ services, reminders, firstSteps, canCreateClientRequest }: Props) {
  const firstStepsBlock = firstSteps?.visible ? (
    <ProviderFirstSteps
      progressLabel={firstSteps.progressLabel}
      steps={firstSteps.steps}
    />
  ) : null;

  return (
    <Box>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
          <Typography component="h1" variant="h1" sx={{ fontWeight: 700 }}>Лента заявок</Typography>
          {canCreateClientRequest && <Button component={Link} href="/pro/requests/new" variant="contained">Создать заявку для клиента</Button>}
        </Stack>
        <CabinetNotices welcome="Аккаунт исполнителя создан. Добавьте первую услугу, чтобы заказчики нашли вас." />
        <HomeStoriesStrip scope="provider" />
        <ProHomeSectionSwitch
          serviceIds={services
            .filter((service) => service.status !== "ARCHIVED")
            .map((service) => service.id)}
          services={<ProMyServicesSection services={services} />}
          freeRequests={<FreeRequestsSection />}
          reminders={
            <Stack spacing={3}>
              {firstStepsBlock}
              <RemindersListView
                initialReminders={reminders}
                showTitle={false}
              />
            </Stack>
          }
        />
      </Stack>
    </Box>
  );
}
