import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { Box, Rating, Stack, Typography } from "@mui/material";
import type { PublicProviderProfileDto } from "@/entities/provider";
import { formatReviewCount } from "@/entities/review";
import { providerHeroCaption, providerHeroGreeting, providerHeroIntro } from "../lib/provider-hero-copy";
import { CdnFillImage } from "@/shared/ui/cdn-image";

type Props = {
  provider: PublicProviderProfileDto;
};

export function ProviderPublicHero({ provider }: Props) {
  const greeting = providerHeroGreeting(provider.name, provider.type);
  const caption = providerHeroCaption(provider.name, provider.type);
  const cityName = provider.city?.name;
  const intro = providerHeroIntro(provider.about, provider.subtitle);
  const stats = provider.stats.filter((stat) => stat.value.trim() && stat.label.trim()).slice(0, 3);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "center", md: "center" },
        gap: { xs: 3.5, md: 8 },
        py: { xs: 1, md: 3 },
      }}
    >
      <Box
        sx={{
          order: { xs: 0, md: 2 },
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: { xs: 0.5, md: 1 },
          width: { xs: 230, sm: 270, md: 300 },          
          transform: "rotate(3deg)",
        }}
      >
        {cityName ? (
          <Typography
            sx={{
              px: 1,
              textAlign: "center",
              fontWeight: 600,
              fontSize: { xs: 10, md: 14 },
              lineHeight: 1,
            }}
          >
            {cityName}
          </Typography>
        ) : null}
        <Box
          sx={{
            width: "100%",
            bgcolor: "background.paper",
            px: 1.25,
            pt: 1.25,
            pb: 0.5,
            boxShadow: "18px 18px 0px  rgba(50, 94, 73, 0.64)",
            borderRadius: "10px 10px 10px 10px",
          }}
        >
        <Box
          sx={{
            position: "relative",
            aspectRatio: "3 / 4",
            overflow: "hidden",
            bgcolor: "action.hover",
            borderRadius: "10px 10px 10px 10px",
            transform: "rotate(-5deg) translate(-30px, -7px)",
          }}
        >
          {provider.image ? (
            <CdnFillImage
              src={provider.image}
              alt={provider.name}
              sizes="(max-width: 600px) 230px, (max-width: 900px) 270px, 300px"
              unoptimized={process.env.NODE_ENV !== "production"}
              style={{ objectFit: "cover", objectPosition: "center top" }}
            />
          ) : (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary.dark",
                bgcolor: "background.default",
              }}
            >
              <PersonRoundedIcon sx={{ fontSize: { xs: 72, md: 96 }, opacity: 0.45 }} />
            </Box>
          )}
        </Box>
        <Typography
          sx={{
            pt: { xs: 1.5, md: 2 },
            px: 1,
            textAlign: "center",
            fontWeight: 700,
            fontSize: { xs: 20, md: 26 },
            lineHeight: 1.2,
          }}
        >
          {caption}
        </Typography>
        {provider.subtitle?.trim() ? (
          <Typography variant="body2" sx={{ textAlign: "center", pb: 3, pt: 1 }}>
            {provider.subtitle.trim()}
          </Typography>
        ) : null}
        </Box>
      </Box>

      <Stack
        spacing={{ xs: 2, md: 3 }}
        sx={{ order: { xs: 1, md: 1 }, flex: "1 1 auto", minWidth: 0, width: { xs: "100%", md: "auto" } }}
      >
        <Typography
          component="h1"
          sx={{
            m: 0,
            fontWeight: 800,
            fontSize: { xs: 34, md: 48 },
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: "common.black",
          }}
        >
          {greeting}
        </Typography>

        {intro ? (
          <Typography
            sx={{
              maxWidth: 560,
              fontWeight: 500,
              fontSize: { xs: 18, md: 22 },
              lineHeight: 1.45,
            }}
          >
            {intro}
          </Typography>
        ) : null}

        {stats.length > 0 ? (
          <Stack
            spacing={1}
            direction="column"
            useFlexGap
            sx={{
              alignSelf: "flex-start",
              alignItems: "flex-start",
              width: "fit-content",
              maxWidth: "100%",
              transform: "rotate(-2deg)",
              pt: 4
            }}
          >
            {stats.map((stat, index: number) => (
              <Box
                key={`${stat.value}-${stat.label}`}
                sx={{
                  width: "fit-content",
                  px: 2,
                  py: 1,
                  bgcolor: "background.default",
                  color: "text.primary",
                  fontWeight: 700,
                  fontSize: { xs: 16, md: 20 },
                  lineHeight: 1.35,
                  ml: 3 - index,
                }}
              >
                {index > 0 ? "✓ " : null}
                {stat.value} {stat.label}
              </Box>
            ))}
          </Stack>
        ) : null}

        {provider.rating != null ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", pt: 4 }}>
            <Rating value={provider.rating} precision={0.1} readOnly size="small" />
            <Typography variant="body2">
              {provider.rating.toFixed(1)} · {formatReviewCount(provider.reviewCount)}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}
