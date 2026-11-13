import { SITE_HEADER_HEIGHT_PX } from "@/shared/config/site-layout";
import { authBackground } from "./auth-background";

export const authCardShellSx = {
  flex: "1 0 auto",
  width: "100%",
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  px: 2,
  py: {
    xs: `${SITE_HEADER_HEIGHT_PX.xs + 16}px`,
    sm: `${SITE_HEADER_HEIGHT_PX.sm + 24}px`,
    md: 10,
  },
  backgroundImage: authBackground("/hero-bg-house_static_day.jpg"),
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
} as const;
