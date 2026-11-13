"use client";

import { FavoriteButton } from "@/features/favorites/FavoriteButton";

import { Box, Stack, Typography } from "@mui/material";
import { ServiceCard, type ServiceCardItem } from "@/entities/service";

type Props = {
  /** Category/section title */
  title: string;
  /** Optional subtitle under the title */
  subtitle?: string;
  /** Cards to render */
  items: ServiceCardItem[];
  /** Number of cards per row: 3 or 4 */
  columns: 3 | 4;
};

export function ServiceCardList({ title, subtitle, items, columns }: Props) {
  return (
    <Stack spacing={{ xs: 2, md: 2.5 }}>
      <Stack spacing={0.75}>
        <Typography
          component="h2"
          variant="h2"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontSize: { xs: "1.5rem", sm: "1.625rem", md: "1.75rem" },
            lineHeight: 1.15,
          }}
          // color="primary"
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            sx={{ color: "text.secondary", maxWidth: 860, lineHeight: 1.7 }}
          >
            {subtitle}
          </Typography>
        )}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: {
            xs: "1fr",
            sm:
              columns === 3
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(2, minmax(0, 1fr))",
            md: `repeat(${columns}, minmax(0, 1fr))`,
          },
          alignItems: "stretch",
        }}
      >
        {items.map((item) => (
          <ServiceCard
            key={item.id}
            item={item}
            favoriteAction={<FavoriteButton kind="services" id={item.id} />}
            imageSizes={columns === 3
              ? "(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw"
              : "(min-width: 900px) 25vw, (min-width: 600px) 50vw, 100vw"}
          />
        ))}
      </Box>
    </Stack>
  );
}
