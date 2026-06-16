"use client";

import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
export type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
  placements: Array<"HOME">;
};

type Props = {
  categories: ServiceCategoryRow[];
  embedded?: boolean;
};

export function ServiceCategoriesSection({ categories, embedded }: Props) {
  if (!categories.length) return null;

  const content = (
    <Stack spacing={{ xs: 2.5, md: 3 }}>      
      <Box
        sx={{
          display: "grid",
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
          },
          alignItems: "stretch",
        }}
      >
        {categories.map((c) => (
          <Button
            component={Link}
            href={`/service-categories/${c.id}`}
            key={c.id}
            variant="outlined"
            sx={{
              p: 2.5,
              width: "100%",
              height: "100%",
              borderRadius: 2,
              bgcolor: "background.paper",
              borderColor: "divider",
              textTransform: "none",
              gap: 1.5,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 26px rgba(0,0,0,0.05)",
              transition: "transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease",
              "&:hover": {
                bgcolor: "action.hover",
                borderColor: "divider",
                boxShadow: "0 18px 45px rgba(0,0,0,0.10)",
                transform: "translateY(-2px)",
              },
            }}
          >
            <ElectricalServicesIcon color="primary" />
            <Typography sx={{ lineHeight: 1.25 }}>{c.name}</Typography>
          </Button>
        ))}
      </Box>
    </Stack>
  );

  if (embedded) {
    return (
      <Box component="section" sx={{ py: 0 }}>
        {content}
      </Box>
    );
  }

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 7, md: 10 },
        bgcolor: "background.default",
      }}
    >
      <Container>{content}</Container>
    </Box>
  );
}

