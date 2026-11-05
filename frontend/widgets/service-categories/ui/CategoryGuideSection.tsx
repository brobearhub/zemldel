import Link from "@/shared/ui/Link";
import { Box, Stack, Typography } from "@mui/material";
import type { CategoryGuide } from "@/entities/service-category/model/category-guides";
import { getCategoryGuide } from "@/entities/service-category/model/category-guides";

type Props = {
  guide: CategoryGuide;
  childrenCategories: Array<{ id: string; name: string; slug: string }>;
};

export function CategoryGuideSection({ guide, childrenCategories }: Props) {
  return (
    <Stack spacing={3}>
      {childrenCategories.length > 0 ? (
        <Box
          component="nav"
          aria-label="Услуги этого раздела"
        >
          <Typography
            component="h2"
            variant="h5"
            sx={{ mb: 2 }}
          >
            Услуги этого раздела
          </Typography>
          <Stack
            component="ul"
            spacing={2}
            sx={{ pl: 2.5 }}
          >
            {childrenCategories.map((category) => (
              <Box
                component="li"
                key={category.id}
              >
                <Link
                  href={`/service-categories/${category.id}`}
                  sx={{ fontWeight: 700 }}
                >
                  {category.name}
                </Link>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.5,
                    color: "text.secondary",
                  }}
                >
                  {getCategoryGuide(category.slug)?.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}
      {guide.sections.map((section) => (
        <Box
          component="section"
          key={section.heading}
        >
          <Typography
            component="h2"
            variant="h5"
            sx={{ mb: 1 }}
          >
            {section.heading}
          </Typography>
          <Typography sx={{ lineHeight: 1.75 }}>
            {section.text}
          </Typography>
        </Box>
      ))}
      <Box component="section">
        <Typography
          component="h2"
          variant="h5"
          sx={{ mb: 1 }}
        >
          Что подготовить для обсуждения
        </Typography>
        <Box
          component="ul"
          sx={{
            pl: 2.5,
            m: 0,
          }}
        >
          {guide.preparation.map((item) => (
            <Typography
              component="li"
              key={item}
              sx={{
                mb: 1,
                lineHeight: 1.75,
              }}
            >
              {item}
            </Typography>
          ))}
        </Box>
      </Box>
      <Box component="section">
        <Typography
          component="h2"
          variant="h5"
          sx={{ mb: 1 }}
        >
          {guide.question.title}
        </Typography>
        <Typography sx={{ lineHeight: 1.75 }}>
          {guide.question.answer}
        </Typography>
      </Box>
    </Stack>
  );
}
