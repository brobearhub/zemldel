"use client";

import Image from "next/image";
import Link from "next/link";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box, Container, Stack, Typography } from "@mui/material";
import { getCategoryGuideImage } from "@/entities/service-category/model/category-guide-images";

export type ServiceCategoryRow = {
  id: string;
  name: string;
  shortName?: string | null;
  slug: string;
  parentId: string | null;
  sortOrder: number | null;
};

type Props = {
  categories: ServiceCategoryRow[];
  embedded?: boolean;
};

function compareCategories(a: ServiceCategoryRow, b: ServiceCategoryRow) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "ru");
}

export function ServiceCategoriesSection({ categories, embedded }: Props) {
  const rootCategories = categories.filter((category) => category.parentId == null).sort(compareCategories);
  if (!rootCategories.length) return null;

  const content = (
    <Stack spacing={{ xs: 3, md: 4 }}>
      <Typography
        component="h2"
        variant="h4"
        sx={{
          color: "text.primary",
          fontWeight: 600,
        }}
      >
        Выберите направление
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: { xs: 3, md: 3 },
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
          },
          alignItems: "stretch",
        }}
      >
        {rootCategories.map((category) => {
          const image = getCategoryGuideImage(category.slug);
          const children = categories
            .filter((child) => child.parentId === category.id)
            .sort(compareCategories);
          const href = `/service-categories/${category.id}`;

          return (
            <Box
              component="article"
              key={category.id}
              aria-labelledby={`service-category-${category.id}`}
              sx={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.paper",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              {image ? (
                <Box
                  sx={{
                    position: "relative",
                    aspectRatio: "2 / 1",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 599px) calc(100vw - 32px), (max-width: 899px) calc((100vw - 72px) / 2), (max-width: 1199px) calc((100vw - 96px) / 3), 368px"
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              ) : null}
              <Stack
                spacing={2}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  flex: 1,
                }}
              >
                <Typography
                  component="h3"
                  id={`service-category-${category.id}`}
                  sx={{
                    fontSize: { xs: 21, md: 22 },
                    lineHeight: 1.4,
                    fontWeight: 600,
                  }}
                >
                  <Box
                    component={Link}
                    href={href}
                    sx={{
                      color: "text.primary",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                      "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 4 },
                    }}
                  >
                    {category.name}
                  </Box>
                </Typography>
                {children.length > 0 ? (
                  <Box
                    component="ul"
                    sx={{
                      m: 0,
                      p: 0,
                      listStyle: "none",
                    }}
                  >
                    {children.map((child) => (
                      <Box
                        component="li"
                        key={child.id}
                        sx={{
                          borderTop: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Box
                          component={Link}
                          href={`/service-categories/${child.id}`}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            minHeight: 44,
                            py: 1.25,
                            color: "text.primary",
                            fontSize: 15,
                            lineHeight: 1.5,
                            overflowWrap: "anywhere",
                            textDecoration: "none",
                            "&:hover": { textDecoration: "underline" },
                            "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 2 },
                          }}
                        >
                          {child.name}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : null}
                <Box sx={{ flex: 1 }} />
                <Box
                  component={Link}
                  href={href}
                  aria-label={`Подробнее: ${category.name}`}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    alignSelf: "flex-start",
                    gap: 1,
                    minHeight: 44,
                    color: "text.primary",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                    "&:focus-visible": { outline: "2px solid currentColor", outlineOffset: 4 },
                  }}
                >
                  Подробнее
                  <ArrowForwardIcon sx={{ fontSize: 18 }} />
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );

  if (embedded) return content;

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
