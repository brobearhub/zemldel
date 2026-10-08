"use client";

import { use, useEffect, useState } from "react";
import { Avatar, Container, Rating, Stack, Typography } from "@mui/material";
import { toPublicAssetSrc } from "@/shared/lib/public-asset-src";

type PublicUser = {
  id: string;
  name: string;
  image: string | null;
  cityName: string | null;
  reviewsWritten: Array<{ id: string; rating: number; text: string | null; createdAt: string; providerName: string | null }>;
  reviewsReceived: Array<{ id: string; rating: number; text: string | null; createdAt: string; providerName: string | null }>;
};

export default function PublicUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/users/${id}/public`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as PublicUser;
      })
      .then((payload) => {
        if (!alive) return;
        if (!payload) setMissing(true);
        else setProfile(payload);
      })
      .catch(() => {
        if (alive) setMissing(true);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {missing ? <Typography>Профиль скрыт.</Typography> : null}
      {profile ? (
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Avatar src={profile.image ? toPublicAssetSrc(profile.image) : undefined} sx={{ width: 96, height: 96 }} />
            <Stack>
              <Typography variant="h4">{profile.name}</Typography>
              {profile.cityName ? <Typography color="text.secondary">{profile.cityName}</Typography> : null}
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
