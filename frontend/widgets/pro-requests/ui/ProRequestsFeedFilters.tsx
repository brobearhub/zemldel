import { Box, Button, Chip, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { RequestStatus } from "@/entities/request";
import type { EligibleCategory } from "@/widgets/pro-requests/model/types";

type Props = {
  isDesktop: boolean;
  eligibleCategories: readonly EligibleCategory[];
  activeCategoryIds: readonly string[];
  includeFreeform: boolean;
  includeUncategorized: boolean;
  onToggleCategory: (categoryId: string) => void;
  onToggleFreeform: () => void;
  onToggleUncategorized: () => void;
  onResetFilters: () => void;
  statusFilters: readonly { status: RequestStatus; label: string; count: number }[];
  enabledStatuses: readonly RequestStatus[];
  onToggleStatus: (status: RequestStatus) => void;
  mobileStatus: RequestStatus;
  onSelectMobileStatus: (status: RequestStatus) => void;
};

export function ProRequestsFeedFilters({
  isDesktop,
  eligibleCategories,
  activeCategoryIds,
  includeFreeform,
  includeUncategorized,
  onToggleCategory,
  onToggleFreeform,
  onToggleUncategorized,
  onResetFilters,
  statusFilters,
  enabledStatuses,
  onToggleStatus,
  mobileStatus,
  onSelectMobileStatus,
}: Props) {
  const isResetActive = activeCategoryIds.length === 0 && !includeFreeform && !includeUncategorized;
  const categories = [
    { id: "all", label: "Все", selected: isResetActive, onClick: onResetFilters },
    { id: "uncategorized", label: "Без категории", selected: includeUncategorized, onClick: onToggleUncategorized },
    { id: "freeform", label: "Свободная заявка", selected: includeFreeform, onClick: onToggleFreeform },
    ...eligibleCategories.map((category) => ({
      id: category.id,
      label: category.name,
      selected: activeCategoryIds.includes(category.id),
      onClick: () => onToggleCategory(category.id),
    })),
  ];

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        aria-label="Категории заявок"
        sx={{
          flexWrap: { xs: "nowrap", md: "wrap" },
          overflowX: { xs: "auto", md: "visible" },
          pb: { xs: 0.5, md: 0 },
        }}
      >
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.label}
            onClick={category.onClick}
            aria-pressed={category.selected}
            variant={category.selected ? "filled" : "outlined"}
            sx={{
              maxWidth: { xs: "none", md: "100%" },
              flexShrink: 0,
              height: "auto",
              minHeight: 36,
              py: 0.5,
              color: category.selected ? "background.paper" : "text.secondary",
              bgcolor: (theme) => category.selected
                ? theme.palette.mode === "light" ? theme.palette.text.primary : theme.palette.primary.main
                : theme.palette.background.paper,
              borderColor: "divider",
              "&:hover, &.Mui-focusVisible": {
                bgcolor: (theme) => category.selected
                  ? theme.palette.mode === "light" ? alpha(theme.palette.text.primary, 0.9) : theme.palette.primary.light
                  : theme.palette.action.hover,
              },
              "& .MuiChip-label": {
                fontSize: 14,
                lineHeight: 1.4,
                whiteSpace: { xs: "nowrap", md: "normal" },
              },
            }}
          />
        ))}
      </Stack>
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        aria-label={isDesktop ? "Видимые колонки доски" : "Статус заявок"}
        sx={{
          flexWrap: { xs: "nowrap", md: "wrap" },
          overflowX: { xs: "auto", md: "visible" },
          pb: { xs: 0.5, md: 0 },
        }}
      >
        {statusFilters.map((filter) => {
          const selected = isDesktop
            ? enabledStatuses.includes(filter.status)
            : mobileStatus === filter.status;
          const emphasized = selected && (!isDesktop || filter.status === "NEW");
          return (
            <Button
              key={filter.status}
              size="small"
              aria-pressed={selected}
              onClick={() => isDesktop
                ? onToggleStatus(filter.status)
                : onSelectMobileStatus(filter.status)}
              sx={{
                gap: 0.75,
                px: 1.5,
                py: 0.875,
                fontSize: 14,
                flexShrink: 0,
                whiteSpace: "nowrap",
                fontWeight: selected ? 700 : 400,
                color: emphasized ? "background.paper" : selected ? "text.primary" : "text.secondary",
                bgcolor: (theme) => emphasized
                  ? theme.palette.mode === "light" ? theme.palette.text.primary : theme.palette.primary.main
                  : selected ? alpha(theme.palette.primary.main, 0.2) : "transparent",
                "&:hover": {
                  bgcolor: (theme) => emphasized
                    ? theme.palette.mode === "light" ? alpha(theme.palette.text.primary, 0.9) : theme.palette.primary.light
                    : alpha(theme.palette.primary.main, 0.3),
                },
              }}
            >
              {filter.label}
              <Box
                component="span"
                sx={{
                  px: 0.625,
                  borderRadius: 0.5,
                  fontSize: 13,
                  fontWeight: 700,
                  bgcolor: (theme) => emphasized
                    ? alpha(theme.palette.background.paper, 0.2)
                    : selected ? alpha(theme.palette.primary.main, 0.25) : "transparent",
                }}
              >
                {filter.count}
              </Box>
            </Button>
          );
        })}
      </Stack>
    </Stack>
  );
}
