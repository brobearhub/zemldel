import { Container, Stack } from "@mui/material";
import type { RequestReminderDto } from "@/entities/request";
import type { ServiceDto } from "@/entities/service";
import { HomeStoriesStrip } from "@/widgets/home-stories";
import { FreeRequestsSection, ProMyServicesSection } from "@/widgets/pro-my-services";
import { RemindersListView } from "@/widgets/pro-requests/ui/RemindersListView";
import { CabinetNotices } from "@/widgets/cabinet-chrome";
import { ProviderFirstSteps, type FirstStepItem } from "@/widgets/provider-verification";
import { ProHomeSectionSwitch } from "./ProHomeSectionSwitch";

type Props = {
  services: ServiceDto[];
  reminders: RequestReminderDto[];
  firstSteps: { visible: boolean; progressLabel: string; steps: FirstStepItem[] } | null;
};

export function ProHomePage({ services, reminders, firstSteps }: Props) {
  return (
    <Container maxWidth="lg" disableGutters>
      <Stack spacing={3}>
        <CabinetNotices welcome="Профиль создан. Заполните профиль, добавьте услугу и откройте рабочий день." />
        {firstSteps?.visible ? (
          <ProviderFirstSteps progressLabel={firstSteps.progressLabel} steps={firstSteps.steps} />
        ) : null}
        <HomeStoriesStrip scope="provider" />
        <ProHomeSectionSwitch
          services={<ProMyServicesSection services={services} />}
          freeRequests={<FreeRequestsSection />}
          reminders={<RemindersListView initialReminders={reminders} showTitle={false} />}
        />
      </Stack>
    </Container>
  );
}
