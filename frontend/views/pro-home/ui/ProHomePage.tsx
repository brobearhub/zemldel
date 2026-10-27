import { Box, Stack, Typography } from "@mui/material";
import type { RequestReminderDto } from "@/entities/request";
import type { ServiceDto } from "@/entities/service";
import { HomeStoriesStrip } from "@/widgets/home-stories";
import { FreeRequestsSection, ProMyServicesSection } from "@/widgets/pro-my-services";
import { RemindersListView } from "@/widgets/pro-requests/ui/RemindersListView";
import { CabinetNotices } from "@/widgets/cabinet-chrome";
import { ProviderFirstSteps, type FirstSteps } from "@/widgets/provider-verification";
import { ProHomeSectionSwitch } from "./ProHomeSectionSwitch";

type Props = {
  services: ServiceDto[];
  reminders: RequestReminderDto[];
  firstSteps: FirstSteps | null;
};

export function ProHomePage({ services, reminders, firstSteps }: Props) {
  const firstStepsBlock = firstSteps?.visible ? (
    <ProviderFirstSteps
      progressLabel={firstSteps.progressLabel}
      steps={firstSteps.steps}
    />
  ) : null;

  return (
    <Box>
      <Stack spacing={3}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>
          Кабинет
        </Typography>
        <CabinetNotices welcome="Аккаунт исполнителя создан. Добавьте первую услугу, чтобы заказчики нашли вас." />
        <HomeStoriesStrip scope="provider" />
        <ProHomeSectionSwitch
          services={<ProMyServicesSection services={services} firstSteps={firstStepsBlock} />}
          freeRequests={<FreeRequestsSection />}
          reminders={<RemindersListView initialReminders={reminders} showTitle={false} />}
        />
      </Stack>
    </Box>
  );
}
