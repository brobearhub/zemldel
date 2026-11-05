import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerAuthSession } from "@/core/auth";
import { BackendApiError, fetchBackendJson, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { Container, Rating, Stack, Typography } from "@mui/material";
import { CdnAvatar } from "@/shared/ui/cdn-image";
import { displayCityName } from "@/shared/lib/format-city-label";

type PublicUser = {
  id: string;
  name: string;
  image: string | null;
  cityName: string | null;
  reviewsWritten: Array<{ id: string; rating: number; text: string | null; createdAt: string; providerName: string | null }>;
  reviewsReceived: Array<{ id: string; rating: number; text: string | null; createdAt: string; providerName: string | null }>;
};

export const metadata: Metadata = {
  title: "Профиль пользователя — Земледел",
  robots: { index: false, follow: true },
};

export default async function PublicUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerAuthSession();
  let profile: PublicUser;
  try {
    const path = `/users/${encodeURIComponent(id)}/public`;
    profile = session?.user?.id
      ? await fetchBackendJsonAsUser<PublicUser>(path, session.user.id)
      : await fetchBackendJson<PublicUser>(path);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {profile ? (
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <CdnAvatar src={profile.image ?? undefined} sx={{ width: 96, height: 96 }} />
            <Stack>
              <Typography
                variant="h4"
                component="h1"
              >
                {profile.name}
              </Typography>
              {profile.cityName ? (
                <Typography color="text.secondary">{displayCityName(profile.cityName)}</Typography>
              ) : null}
            </Stack>
          </Stack>
          <ReviewList title="Отзывы пользователя" items={profile.reviewsWritten} />
          <ReviewList title="Отзывы о пользователе" items={profile.reviewsReceived} />
        </Stack>
      ) : null}
    </Container>
  );
}

function ReviewList({
  title,
  items,
}: {
  title: string;
  items: PublicUser["reviewsWritten"];
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="h6">{title}</Typography>
      {items.length === 0 ? <Typography color="text.secondary">Пока нет отзывов.</Typography> : null}
      {items.map((review) => (
        <Stack key={review.id} spacing={0.5}>
          <Rating value={review.rating} readOnly size="small" />
          {review.providerName ? <Typography variant="body2">{review.providerName}</Typography> : null}
          {review.text ? <Typography variant="body1">{review.text}</Typography> : null}
        </Stack>
      ))}
    </Stack>
  );
}
