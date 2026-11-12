import { keyframes, type Theme } from "@mui/material/styles";

const flow = keyframes`
  from { background-position: 100% 50%; }
  to { background-position: 0% 50%; }
`;

/** Shared left-to-right purple, red and orange flow for text and indicators. */
export const attentionGradientSx = {
  backgroundImage: (theme: Theme) => {
    const [purple, red, orange] = theme.palette.mode === "dark"
      ? ["#CE93D8", "#FF7676", "#FFB05D"]
      : ["#8E24AA", "#C62828", "#B6440A"];
    return `linear-gradient(90deg, ${purple}, ${red}, ${orange}, ${purple}, ${red}, ${orange}, ${purple})`;
  },
  backgroundSize: "200% 100%",
  animation: `${flow} 6s linear infinite`,
  "@media (prefers-reduced-motion: reduce)": {
    animation: "none",
  },
};

export const attentionTextSx = {
  ...attentionGradientSx,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  "@media (forced-colors: active)": {
    backgroundImage: "none",
    color: "CanvasText",
    WebkitTextFillColor: "CanvasText",
  },
};

// The application theme sizes badges for counters; dots need explicit dimensions.
export const attentionDotSx = {
  minWidth: 8,
  width: 8,
  height: 8,
  p: 0,
  borderRadius: "50%",
};
