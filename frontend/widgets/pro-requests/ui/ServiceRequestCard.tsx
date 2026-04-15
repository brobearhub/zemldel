import Link from "next/link";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { getServiceRequestStatusLabel, type ServiceRequestProDto } from "@/entities/service-request";
import { formatServiceRequestDate, getServiceRequestTitle } from "@/widgets/pro-requests/lib/serviceRequestView";

type Props = {
  item: ServiceRequestProDto;
};

export function ServiceRequestCard({ item }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap>
              {getServiceRequestTitle(item)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Создано: {formatServiceRequestDate(item.createdAt)} · Диалогов: {item.conversationsCount}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip
              size="small"
              label={getServiceRequestStatusLabel(item.status)}
              color={item.status === "LOCKED" || item.status === "ACTIVE" ? "success" : item.status === "CLOSED" ? "default" : "primary"}
              variant={item.status === "CLOSED" ? "outlined" : "filled"}
            />
            {item.isLocked ? (
              <Chip size="small" variant="outlined" label="Взято другим провайдером" />
            ) : (
              <Button component={Link} href={`/pro/requests/${item.id}`} size="small" variant="contained">
                Открыть
              </Button>
            )}
          </Stack>
        </Stack>

        {item.location ? (
          <Typography variant="body2" color="text.secondary">
            Локация: {item.location}
          </Typography>
        ) : null}

        {item.message ? (
          <Typography color="text.secondary">{item.message}</Typography>
        ) : item.isLocked ? (
          <Typography variant="body2" color="text.secondary">
            Заявка уже взята в работу.
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}

