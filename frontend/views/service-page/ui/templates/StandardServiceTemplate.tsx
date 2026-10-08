import { Box } from "@mui/material";
import type { ServiceDto } from "@/entities/service";
import { getPublicProviderProfile } from "@/entities/provider";
import { listPublicServiceReviews } from "@/entities/review/api/review.server";
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
      {providerId ? (
        <ProviderSection
          providerId={providerId}
          serviceId={service.id}
          isAuthenticated={isAuthenticated}
          imageSide="right"
        />
      ) : null}

      <ServiceReviewsBlock
        serviceId={service.id}
        ratingValue={service.rating ?? null}
        reviewCount={service.reviewCount ?? 0}
        cityLabel={service.provider?.city?.name ?? null}
      />

      <ServiceLeadSection
        serviceId={service.id}
        serviceTitle={service.title}
        isAuthenticated={isAuthenticated}
        initialCustomerEmail={initialEmail}
      />
    </Box>
  );
}

async function ServiceReviewsBlock({
  serviceId,
  ratingValue,
  reviewCount,
  cityLabel,
}: {
  serviceId: string;
  ratingValue: number | null;
  reviewCount: number;
  cityLabel?: string | null;
}) {
  const list = await listPublicServiceReviews(serviceId).catch(() => ({ items: [], nextCursor: null }));
  return (
    <ServiceReviewsSection
      ratingValue={ratingValue}
      reviewCount={reviewCount}
      reviews={list.items}
      cityLabel={cityLabel}
    />
  );
}

async function ProviderSection({
  providerId,
  serviceId,
  isAuthenticated,
  imageSide = "left",
}: {
  providerId: string;
  serviceId: string;
  isAuthenticated: boolean;
  imageSide?: "left" | "right";
}) {
  const provider = await getPublicProviderProfile(providerId);
  if (!provider) return null;
  return <ServiceProviderSection provider={provider} serviceId={serviceId} isAuthenticated={isAuthenticated} imageSide={imageSide} />;
}

