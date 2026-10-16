import { Stack, Tooltip, Typography } from "@mui/material";
import { VerifiedBadgeIcon } from "@/shared/ui/VerifiedBadgeIcon";

type Props = {
  verified: boolean;
  /** Светлый текст на тёмной плашке. */
  onDark?: boolean;
};

const HINT = "Исполнитель ещё не подтвердил реквизиты. Это не оценка качества работ.";

export function ProfileTrustNote({ verified, onDark = false }: Props) {
  const color = onDark ? "common.white" : "text.primary";
  if (verified) {
    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        <VerifiedBadgeIcon size={18} />
        <Typography sx={{ color, fontWeight: 700 }}>Реквизиты проверены</Typography>
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Typography sx={{ color, fontWeight: 700 }}>Профиль не проверен</Typography>
      <Tooltip title={HINT}>
        <Typography
          component="span"
          sx={{ color, textDecoration: "underline", cursor: "help", fontSize: 14 }}
        >
          Что это значит
        </Typography>
      </Tooltip>
    </Stack>
  );
}
