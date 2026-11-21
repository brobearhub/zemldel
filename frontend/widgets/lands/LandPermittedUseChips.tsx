import { Box, Chip } from "@mui/material";
import { findPermittedUse } from "@/entities/land/permitted-uses";

export function LandPermittedUseChips({
  values,
  onRemove,
}: {
  values: string[];
  onRemove?: (value: string) => void;
}) {
  return (
    <Box
      component="ul"
      aria-label="Выбранные ВРИ"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.75,
        listStyle: "none",
        m: 0,
        p: 0,
      }}
    >
      {values.map((value) => {
        const entry = findPermittedUse(value);
        return (
          <Box
            key={value}
            component="li"
            sx={{ maxWidth: "100%" }}
          >
            <Chip
              size="small"
              label={entry ? `${entry.code} · ${entry.name}` : value}
              onDelete={onRemove ? () => onRemove(value) : undefined}
              sx={{
                maxWidth: "100%",
                minHeight: 28,
                height: "auto",
                borderRadius: 1,
                "& .MuiChip-label": {
                  py: 0.375,
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                },
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
