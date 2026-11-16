import { decomposeColor, rgbToHex } from "@mui/material/styles";

const REQUEST_PANEL_SHADE = 0.035;
const SECONDARY_TINT_WEIGHT = 0.18;

/** Opaque equivalent of the payment summary tint over a request details panel. */
export function getSecondaryBackground(primary: string, page: string): string {
  const tint = decomposeColor(primary).values;
  const panel = decomposeColor(page).values.slice(0, 3).map((channel) =>
    Math.round(channel * (1 - REQUEST_PANEL_SHADE)),
  );
  const channels = panel.map((channel, index) =>
    Math.round(
      channel * (1 - SECONDARY_TINT_WEIGHT) +
        tint[index] * SECONDARY_TINT_WEIGHT,
    ),
  );

  return rgbToHex(`rgb(${channels.join(", ")})`);
}
