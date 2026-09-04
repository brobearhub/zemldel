import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { Button, Chip, Stack } from "@mui/material";
import type { EligibleCategory, InboxSettings, InboxStatus } from "@/widgets/pro-requests/model/types";

type StatusChip = { id: InboxStatus; label: string };

type Props = {
  isDesktop: boolean;
  statusChips: readonly StatusChip[];
  eligibleCategories: EligibleCategory[];
  settings: InboxSettings;
  onChangeSettings: Dispatch<SetStateAction<InboxSettings>>;
  showStatusChips?: boolean;
};

export function ProRequestsFeedFilters({
  isDesktop,
  statusChips,
  eligibleCategories,
  settings,
  onChangeSettings,
  showStatusChips = true,
}: Props) {
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
        <Button component={Link} href="/pro/services/create" variant="outlined" sx={{ whiteSpace: "nowrap" }}>
          Добавить категорию
        </Button>

        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <Chip
            label="Без категории"
            color={settings.categoryId === null ? "primary" : "default"}
            variant={settings.categoryId === null ? "filled" : "outlined"}
            onClick={() => onChangeSettings((current) => ({ ...current, categoryId: null }))}
          />
          {eligibleCategories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              color={settings.categoryId === cat.id ? "primary" : "default"}
              variant={settings.categoryId === cat.id ? "filled" : "outlined"}
              onClick={() => onChangeSettings((current) => ({ ...current, categoryId: cat.id }))}
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}

