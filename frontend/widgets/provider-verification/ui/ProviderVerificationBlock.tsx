import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import StarIcon from "@mui/icons-material/Star";
import { Button, Chip, Paper, Stack, Typography } from "@mui/material";
import Link from "@/shared/ui/Link";
import { VerifiedBadgeIcon } from "@/shared/ui/VerifiedBadgeIcon";
import { UserLocalDate } from "@/shared/ui/UserLocalDate";
import { finishSentence, type ProviderVerificationView } from "../model/verification-view";

const VERIFICATION_PERKS = [
  {
    icon: (
      <RocketLaunchIcon
        aria-hidden
        sx={{ fontSize: 18, color: "text.primary", transform: "rotate(-45deg)" }}
      />
    ),
    label: "Выше в поиске",
  },
  {
    icon: <VerifiedBadgeIcon size={18} />,
    label: "Значок",
  },
  {
    icon: <StarIcon aria-hidden sx={{ fontSize: 16, color: "#C9A227" }} />,
    label: "Больше доверия",
  },
];

type Props = {
  view: ProviderVerificationView;
  /** В шапке профиля без отдельной карточки. */
  layout?: "card" | "aside";
};

export function ProviderVerificationBlock({ view, layout = "card" }: Props) {
  const aside = layout === "aside";
  const frameSx = aside
    ? { alignItems: { xs: "flex-start", md: "flex-end" }, textAlign: { xs: "left", md: "right" } }
    : { alignItems: "flex-start", textAlign: "left" };

  if (!view.available) {
    const message = <Typography>Проверка для физлиц появится позже</Typography>;
    return aside ? <Stack sx={frameSx}>{message}</Stack> : (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        {message}
      </Paper>
    );
  }

  if (view.status === "PENDING") {
    const message = (
      <Typography>
        Заявка на проверке, решение до 1 рабочего дня.
        {view.submittedAt ? <> Отправлена <UserLocalDate iso={view.submittedAt} /></> : null}
      </Typography>
    );
    return aside ? <Stack sx={frameSx}>{message}</Stack> : (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        {message}
      </Paper>
    );
  }

  if (view.status === "VERIFIED") {
    const badge = (
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: aside ? { xs: "flex-start", md: "flex-end" } : "flex-start" }}
      >
        <Chip color="success" label="Реквизиты проверены" />
        {view.verifiedAt ? (
          <Typography sx={{ color: "text.secondary" }}>
            <UserLocalDate iso={view.verifiedAt} />
          </Typography>
        ) : null}
        {aside ? (
          <Link href="/pro/profile/verification" sx={{ color: "text.primary", fontWeight: 700, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
            Изменить реквизиты
          </Link>
        ) : null}
      </Stack>
    );
    return aside ? badge : (
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        {badge}
      </Paper>
    );
  }

  const action = (
    <Stack spacing={1.5} sx={{ alignItems: "center", width: "fit-content", maxWidth: "100%" }}>
      <Typography
        sx={{
          fontWeight: 700,
          color: "text.primary",
          textAlign: "center",
          fontSize: { xs: 16, sm: 18 },
          lineHeight: 1.3,
        }}
      >
        Подтверждение профиля
      </Typography>
      {view.status === "REJECTED" ? (
        <Typography sx={{ color: "text.primary", textAlign: "center" }}>
          {finishSentence(
            view.rejectReason?.trim()
              ? `Заявку отклонили: ${view.rejectReason.trim()}`
              : "Заявку отклонили",
          )}
        </Typography>
      ) : null}
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap", justifyContent: "center" }}
      >
        {VERIFICATION_PERKS.map((perk) => (
          <Typography
            key={perk.label}
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.5,
              py: 0.75,
              borderRadius: 999,
              bgcolor: "background.default",
              color: "text.primary",
              fontWeight: 600,
              fontSize: 14,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {perk.icon}
            {perk.label}
          </Typography>
        ))}
      </Stack>
      <Button
        component="a"
        href="/pro/profile/verification"
        variant="contained"
        sx={{ alignSelf: "flex-end" }}
      >
        {view.status === "REJECTED" ? "Исправить и отправить снова →" : "Запросить проверку"}
      </Button>
    </Stack>
  );

  return aside ? action : (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      {action}
    </Paper>
  );
}
