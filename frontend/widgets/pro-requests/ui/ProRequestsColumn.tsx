import { Stack, Typography } from "@mui/material";
import type { ServiceRequestProDto } from "@/entities/service-request";
import { ServiceRequestList } from "@/widgets/pro-requests/ui/ServiceRequestList";

type Props = {
  title: string;
  items: ServiceRequestProDto[];
  minRows?: number;
  allowLockedClick?: boolean;
};

export function ProRequestsColumn({
  title,
  items,
  minRows,
  allowLockedClick,
}: Props) {
  return (
    <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="h6" fontWeight={900}>
        {title}
      </Typography>
      <ServiceRequestList items={items} minRows={minRows} allowLockedClick={allowLockedClick} />
    </Stack>
  );
}

