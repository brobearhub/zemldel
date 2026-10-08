import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { StoryMetric, StoryMetricId } from "../lib/story-metrics";

type Props = {
  metrics: StoryMetric[];
  activeId?: StoryMetricId | null;
  onSelect?: (id: StoryMetricId) => void;
};

export function StoryMetricCards({ metrics, activeId = null, onSelect }: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gridAutoRows: { xs: "minmax(88px, auto)", sm: "1fr" },
        gap: 1.5,
        width: "100%",
        height: { xs: "auto", sm: "100%" },
      }}
    >
      {metrics.map((metric) => {
        const metricId = metric.id;
        const interactive = metricId != null && onSelect != null;
        const active = interactive && metricId === activeId;
        const quiet = metric.value === "0";
        return (
          <Box
            key={metric.label}
            component={interactive ? "button" : "div"}
            type={interactive ? "button" : undefined}
            role={interactive ? undefined : "group"}
            aria-label={`${metric.label} ${metric.value}`}
            aria-pressed={interactive ? active : undefined}
            onClick={interactive ? () => onSelect(metricId) : undefined}
            sx={{
              gridColumn: metric.wide ? { xs: "auto", sm: "1 / -1" } : "auto",
              minWidth: 0,
              width: "100%",
              height: "100%",
              m: 0,
              p: 0,
              px: 2.5,
              border: 0,
              font: "inherit",
              textAlign: "left",
              cursor: interactive ? "pointer" : "default",
              bgcolor: active ? "text.primary" : "common.white",
              color: active ? "common.white" : "text.primary",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              boxShadow: (theme) => `0 10px 28px ${alpha(theme.palette.common.black, 0.05)}`,
              "&:hover": interactive
                ? { bgcolor: active ? "text.primary" : (theme) => alpha(theme.palette.text.primary, 0.06) }
                : undefined,
            }}
          >
            <Typography
              component="span"
              sx={{ fontWeight: 600, fontSize: 15, lineHeight: 1.25, color: active ? "inherit" : "text.secondary" }}
            >
              {metric.label}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontWeight: 800,
                fontSize: metric.wide ? 52 : 40,
                lineHeight: 1,
                color: active ? "inherit" : quiet ? "primary.main" : "text.primary",
                flex: "0 0 auto",
              }}
            >
              {metric.value}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
