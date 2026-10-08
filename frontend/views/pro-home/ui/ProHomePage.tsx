import { Container, Stack } from "@mui/material";
import type { RequestReminderDto } from "@/entities/request";
import type { ServiceDto } from "@/entities/service";
import { HomeStoriesStrip } from "@/widgets/home-stories";
import { FreeRequestsSection, ProMyServicesSection } from "@/widgets/pro-my-services";
import { RemindersListView } from "@/widgets/pro-requests/ui/RemindersListView";
import { ProHomeSectionSwitch } from "./ProHomeSectionSwitch";

type Props = {
  services: ServiceDto[];
  reminders: RequestReminderDto[];
};

export function ProHomePage({ services, reminders }: Props) {
  return (
    <Container maxWidth="xl" disableGutters>
      <Stack spacing={3}>
        <HomeStoriesStrip />
        <ProHomeSectionSwitch
          services={<ProMyServicesSection services={services} />}
          freeRequests={<FreeRequestsSection />}
          reminders={<RemindersListView initialReminders={reminders} showTitle={false} />}
        />
      </Stack>
    </Container>
  );
}
