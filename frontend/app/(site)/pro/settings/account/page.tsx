import ProfilePageContent from "@/widgets/profile/ui/ProfilePageContent";
import { ProviderProfileTabs } from "@/widgets/pro-dashboard/ui/ProviderProfileTabs";

export const metadata = { title: "Мои данные — Земледел" };

export default function ProviderAccountPage() {
  return (
    <>
      <ProviderProfileTabs />
      <ProfilePageContent providerSettings />
    </>
  );
}
