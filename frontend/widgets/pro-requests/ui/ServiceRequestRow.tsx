import Link from "next/link";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { Box, ListItem, ListItemButton, Stack, Typography } from "@mui/material";
import type { ServiceRequestProDto } from "@/entities/service-request";
import { getServiceRequestStatusLabel } from "@/entities/service-request";
import { formatServiceRequestDate, getServiceRequestTitle } from "@/widgets/pro-requests/lib/serviceRequestView";

type Props = {
  item: ServiceRequestProDto;
  isLast?: boolean;
  allowLockedClick?: boolean;
};

function buildPreview(item: ServiceRequestProDto) {
  if (item.message) return item.message;
  if (item.location) return `Локация: ${item.location}`;
  if (item.isLocked) return "Клиент уже работает с другой компанией.";
  return "";
}

export function ServiceRequestRow({ item, isLast, allowLockedClick }: Props) {
  const isClickable = allowLockedClick ? true : !item.isLocked;
  const href = `/pro/requests/${item.id}`;
  const preview = buildPreview(item);
  const meta = `${formatServiceRequestDate(item.createdAt)} · ${getServiceRequestStatusLabel(item.status)}`;

  return (
    <ListItem
      disablePadding
      sx={{
        borderBottom: isLast ? "none" : "1px solid",
        borderBottomColor: "divider",
      }}
    >
      <ListItemButton
        component={isClickable ? Link : "div"}
        href={isClickable ? href : undefined}
        disabled={!isClickable}
        sx={{
          px: 2,
          py: 1.25,
          minHeight: 86,
          alignItems: "stretch",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography fontWeight={800} noWrap>
              {getServiceRequestTitle(item)}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {meta}
            </Typography>
            {preview ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {preview}
              </Typography>
            ) : (
              <Box sx={{ height: 20 }} />
            )}
          </Box>

          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isClickable ? <ChevronRightRoundedIcon color="action" /> : <LockRoundedIcon color="disabled" fontSize="small" />}
          </Box>
        </Stack>
      </ListItemButton>
    </ListItem>
  );
}

