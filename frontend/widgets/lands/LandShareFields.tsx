import { Box, Typography } from "@mui/material";
import { MAX_LAND_SHARE_PARTS, type LandDetails } from "@/entities/land/types";
import type { LandEditorInputs } from "./LandEditorControls";

type Props = {
  details: Pick<LandDetails, "shareNumerator" | "shareDenominator">;
  inputs: LandEditorInputs;
};

export function LandShareFields({ details, inputs }: Props) {
  const example =
    details.shareNumerator == null && details.shareDenominator == null;
  const parts = example ? 1 : details.shareNumerator;
  const total = example ? 4 : details.shareDenominator;
  let chart: string | undefined;
  let dividerCount = 0;
  let caption = "—";

  if (
    parts != null &&
    total != null &&
    Number.isInteger(parts) &&
    Number.isInteger(total) &&
    parts > 0 &&
    parts < total &&
    total <= MAX_LAND_SHARE_PARTS
  ) {
    const end = `${(parts / total) * 100}%`;
    chart = `conic-gradient(currentColor 0 ${end}, transparent ${end} 100%)`;
    dividerCount = total;
    caption = example ? "Пример ¼" : `${parts} из ${total}`;
  }
  // Narrow the strokes on dense charts so the colored share stays visible.
  const dividerScale = dividerCount > 12 ? 12 / dividerCount : 1;

  return (
    <Box
      component="fieldset"
      sx={{
        border: 0,
        m: 0,
        p: 0,
        minWidth: 0,
      }}
    >
      <Typography
        component="legend"
        variant="subtitle2"
        sx={{
          p: 0,
          mb: 1,
          fontWeight: 750,
        }}
      >
        Продаваемая доля в праве
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "center",
          gap: {
            xs: 1.5,
            sm: 2.5,
          },
          p: {
            xs: 1.5,
            sm: 2,
          },
          borderRadius: 2,
          bgcolor: "action.hover",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "clamp(3.75rem, 30%, 7.5rem) minmax(0, 1fr)",
            columnGap: 1.5,
            rowGap: 0.5,
            "& .MuiTextField-root": {
              display: "grid",
              gridColumn: "1 / -1",
              gridTemplateColumns: "subgrid",
              alignItems: "center",
            },
            "& .MuiInputBase-root": { gridArea: "1 / 1" },
            "& .MuiInputLabel-root": {
              gridArea: "1 / 2",
              mb: 0,
            },
            "& .MuiFormHelperText-root": { gridColumn: "1 / -1" },
            "& input": {
              px: 1,
              textAlign: "center",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            },
          }}
        >
          {inputs.detail("shareNumerator", "Сколько частей продаёте", {
            type: "number",
            min: 1,
            max: MAX_LAND_SHARE_PARTS,
            step: 1,
            placeholder: example ? "1" : undefined,
          })}
          <Box
            aria-hidden="true"
            sx={{
              gridColumn: 1,
              height: 2,
              bgcolor: "text.primary",
            }}
          />
          {inputs.detail("shareDenominator", "Всего равных частей", {
            type: "number",
            min: 2,
            max: MAX_LAND_SHARE_PARTS,
            step: 1,
            placeholder: example ? "4" : undefined,
            helper: `От 2 до ${MAX_LAND_SHARE_PARTS} долей.`,
          })}
        </Box>
        <Box
          component="figure"
          sx={{
            m: 0,
            width: {
              xs: 68,
              sm: 84,
            },
            display: "grid",
            justifyItems: "center",
            gap: 0.5,
          }}
        >
          <Box
            aria-hidden="true"
            style={{ backgroundImage: chart }}
            sx={{
              position: "relative",
              overflow: "hidden",
              width: {
                xs: 56,
                sm: 72,
              },
              aspectRatio: "1",
              borderRadius: "50%",
              bgcolor: "divider",
              color: "success.main",
              "& > span": {
                position: "absolute",
                top: 0,
                left: "50%",
                width: 2,
                height: "50%",
                translate: "-50% 0",
                transformOrigin: "center bottom",
                bgcolor: "background.paper",
              },
            }}
          >
            {Array.from({ length: dividerCount }, (_, index) => (
              <span
                key={index}
                style={{
                  transform: `rotate(${index / dividerCount}turn) scaleX(${dividerScale})`,
                }}
              />
            ))}
          </Box>
          <Typography
            component="figcaption"
            aria-live="polite"
            aria-atomic="true"
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              textAlign: "center",
              overflowWrap: "anywhere",
            }}
          >
            {caption}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1 }}
      >
        Площадь в паспорте относится ко всему участку.
      </Typography>
    </Box>
  );
}
