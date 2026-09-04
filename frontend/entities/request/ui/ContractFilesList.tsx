import type { ReactNode } from "react";
import { Chip, LinearProgress, Stack, Typography } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
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
  title: string;
  items: readonly ContractFilesListItem[];
  renderActions?: (item: ContractFilesListItem) => ReactNode;
  empty?: ReactNode;
  getStatusLabel?: (status: ContractFileStatus) => string;
  revisionLabel?: string;
  actionsPlacement?: "right" | "below";
  showDocumentIcon?: boolean;
};

function defaultStatusLabel(status: ContractFileStatus) {
  if (status === "APPROVED") return "Одобрен";
  if (status === "REVISION_REQUESTED") return "На доработку";
  return "Ожидает решения";
}

export function ContractFilesList({
  title,
  items,
  renderActions,
  empty,
  getStatusLabel = defaultStatusLabel,
  revisionLabel = "Комментарий",
  actionsPlacement = "right",
  showDocumentIcon = false,
}: ContractFilesListProps) {
  return (
    <RowList
      title={title}
      items={items}
      empty={empty}
      getKey={(f) => f.id}
      renderRow={(file, { isLast }) => {
        const optimistic = Boolean(file.optimistic);
        const actionsNode = optimistic ? null : renderActions ? renderActions(file) : null;
        return (
          <RowListItem
            isLast={isLast}
            minHeight={actionsPlacement === "below" ? 112 : 76}
            sx={actionsPlacement === "below" ? { "& > .MuiBox-root": { py: 2.5 } } : undefined}
            left={
              <Stack spacing={actionsPlacement === "below" ? 2.25 : 0} sx={{ width: "100%", minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1.25}
                  sx={{
                    alignItems: "flex-start",
                    width: "100%",
                    minWidth: 0
                  }}>
                  {showDocumentIcon ? (
                    <DescriptionOutlinedIcon
                      fontSize="small"
                      color="action"
                      sx={{ mt: "2px", flexShrink: 0 }}
                    />
                  ) : null}

                  <Stack spacing={1} sx={{ width: "100%", minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      useFlexGap
                      sx={{
                        alignItems: "center",
                        justifyContent: actionsPlacement === "below" ? "space-between" : "flex-start",
                        flexWrap: "wrap",
                        minWidth: 0,
                        width: "100%"
                      }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          wordBreak: "break-word",
                          minWidth: 0,
                          flex: actionsPlacement === "below" ? "1 1 auto" : undefined
                        }}>
                        {file.originalName}
                      </Typography>
                      <Chip
                        size="small"
                        color={optimistic ? "info" : undefined}
                        label={optimistic ? "Загружается…" : getStatusLabel(file.status)}
                        sx={actionsPlacement === "below" ? { flexShrink: 0 } : undefined}
                      />
                    </Stack>

                    {file.status === "REVISION_REQUESTED" && file.revisionMessage ? (
                      <Typography
                        variant="body1"
                        sx={{
                          color: "text.primary",
                          fontWeight: 600
                        }}>
                        {revisionLabel}: {file.revisionMessage}
                      </Typography>
                    ) : null}

                    {optimistic ? <LinearProgress /> : null}
                  </Stack>
                </Stack>

                {actionsPlacement === "below" && actionsNode ? (
                  <Stack
                    direction="row"
                    spacing={3}
                    useFlexGap
                    sx={{
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "flex-start",

                      // вровень с иконкой/левым краем строки
                      "& .MuiButton-text": { pl: 0 }
                    }}>
                    {actionsNode}
                  </Stack>
                ) : null}
              </Stack>
            }
            right={actionsPlacement === "right" ? actionsNode : null}
          />
        );
      }}
    />
  );
}

