import type { Dispatch, SetStateAction } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import type { RequestStatus } from "@/entities/request";
import type { EligibleCategory, InboxSettings, InboxStatus } from "@/widgets/pro-requests/model/types";

type StatusChip = { id: InboxStatus; label: string };

type Props = {
  isDesktop: boolean;
  statusChips: readonly StatusChip[];
  settings: InboxSettings;
  onChangeSettings: Dispatch<SetStateAction<InboxSettings>>;
  eligibleCategories: readonly EligibleCategory[];
  activeCategoryIds: readonly string[];
  includeFreeform: boolean;
  onToggleCategory: (categoryId: string) => void;
  onToggleFreeform: () => void;
  onResetFilters: () => void;
  showStatusChips?: boolean;
  statusFilters: readonly { status: RequestStatus; label: string }[];
  enabledStatuses: readonly RequestStatus[];
  onToggleStatus: (status: RequestStatus) => void;
};

export function ProRequestsFeedFilters({
  isDesktop,
  statusChips,
  settings,
  onChangeSettings,
  eligibleCategories,
  activeCategoryIds,
  includeFreeform,
  onToggleCategory,
  onToggleFreeform,
  onResetFilters,
  showStatusChips = true,
  statusFilters,
  enabledStatuses,
  onToggleStatus,
}: Props) {
  const isResetActive = activeCategoryIds.length === 0 && !includeFreeform;
  return (
    <Stack spacing={1.25}>
      {!isDesktop && showStatusChips ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          {statusChips.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              color={settings.status === chip.id ? "primary" : "default"}
              variant={settings.status === chip.id ? "filled" : "outlined"}
              onClick={() => onChangeSettings((current) => ({ ...current, status: chip.id }))}
              sx={{
                height: 40,
                fontWeight: 700,
              }}
            />
          ))}
        </Stack>
      ) : null}

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{
        alignItems: { md: "center" }
      }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <Chip
            label="Без категории"
            color={isResetActive ? "primary" : "default"}
            variant={isResetActive ? "filled" : "outlined"}
            onClick={onResetFilters}
          />
          <Chip
            label="Свободная заявка"
            color={includeFreeform ? "primary" : "default"}
            variant={includeFreeform ? "filled" : "outlined"}
            onClick={onToggleFreeform}
          />
          {eligibleCategories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              color={activeCategoryIds.includes(cat.id) ? "primary" : "default"}
              variant={activeCategoryIds.includes(cat.id) ? "filled" : "outlined"}
              onClick={() => onToggleCategory(cat.id)}
            />
          ))}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <Typography sx={{ fontWeight: 700, color: "text.secondary", mr: 0.5 }}>Статусы</Typography>
        {statusFilters.map((filter) => {
          const enabled = enabledStatuses.includes(filter.status);
          return (
            <Chip
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: 12,
                opacity: enabled ? 0.5 : 1,
              }}
              key={filter.status}
              label={filter.label}
              color="warning"
              variant={enabled ? "filled" : "outlined"}
              onClick={() => onToggleStatus(filter.status)}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

