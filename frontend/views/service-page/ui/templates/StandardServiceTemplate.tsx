import { Box } from "@mui/material";
import type { ServiceDto } from "@/entities/service";
import { getPublicProviderProfile } from "@/entities/provider";
import { ServiceHeroSection, ServiceLeadSection, ServiceProviderSection, ServiceReviewsSection } from "@/widgets/service-page";
import { mapServiceToHeroVm } from "@/views/service-page/model/map-service-to-hero-vm";

type Props = {
  service: ServiceDto;
  session: { user?: { id?: string; email?: string | null } | null } | null;
};

export function StandardServiceTemplate({ service, session }: Props) {
  const heroVm = mapServiceToHeroVm(service);
  const isAuthenticated = Boolean(session?.user?.id);
  const initialEmail = session?.user?.email ?? null;
  const providerId = service.provider?.id ?? null;

  return (
    <Box component="main">
      <ServiceHeroSection vm={heroVm} />

      {/* Provider section (public profile). */}
      {providerId ? <ProviderSection providerId={providerId} /> : null}

      <ServiceReviewsSection
        ratingValue={service.rating ?? 4.9}
        reviewCountLabel={
          service.reviewCount != null ? `на основании ${service.reviewCount} отзывов` : "на основании отзывов"
        }
      />

      <ServiceLeadSection
        serviceId={service.id}
        isAuthenticated={isAuthenticated}
        initialCustomerEmail={initialEmail}
      />
    </Box>
  );
}

async function ProviderSection({ providerId }: { providerId: string }) {
  const provider = await getPublicProviderProfile(providerId);
  if (!provider) return null;
  return <ServiceProviderSection provider={provider} />;
}

