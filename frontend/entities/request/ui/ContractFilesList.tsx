import type { ReactNode } from "react";
import { Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { RowList, RowListItem } from "@/shared/ui/RowList";

export type ContractFileStatus = "PENDING_CUSTOMER" | "APPROVED" | "REVISION_REQUESTED";

export type ContractFilesListItem = {
  id: string;
  originalName: string;
  status: ContractFileStatus;
  revisionMessage?: string | null;
  optimistic?: boolean;
};

export type ContractFilesListProps = {
  items: readonly ContractFilesListItem[];
  renderActions?: (item: ContractFilesListItem) => ReactNode;
  empty?: ReactNode;
  getStatusLabel?: (status: ContractFileStatus) => string;
  revisionLabel?: string;
};

function defaultStatusLabel(status: ContractFileStatus) {
  if (status === "APPROVED") return "Одобрен";
  if (status === "REVISION_REQUESTED") return "На доработку";
  return "Ожидает решения";
}

export function ContractFilesList({
  items,
  renderActions,
  empty,
  getStatusLabel = defaultStatusLabel,
  revisionLabel = "Комментарий",
}: ContractFilesListProps) {
  return (
    <RowList
      items={items}
      empty={empty}
      getKey={(f) => f.id}
      renderRow={(file, { isLast }) => {
        const optimistic = Boolean(file.optimistic);
        return (
          <RowListItem
            key={file.id}
            isLast={isLast}
            left={
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} sx={{ wordBreak: "break-word" }}>
                    {file.originalName}
                  </Typography>
                  <Chip
                    size="small"
                    color={optimistic ? "info" : undefined}
                    label={optimistic ? "Загружается…" : getStatusLabel(file.status)}
                  />
                </Stack>

                {file.status === "REVISION_REQUESTED" && file.revisionMessage ? (
                  <Typography variant="body2" color="text.secondary">
                    {revisionLabel}: {file.revisionMessage}
                  </Typography>
                ) : null}

                {optimistic ? <LinearProgress /> : null}
              </Stack>
            }
            right={optimistic ? null : renderActions ? renderActions(file) : null}
          />
        );
      }}
    />
  );
}

