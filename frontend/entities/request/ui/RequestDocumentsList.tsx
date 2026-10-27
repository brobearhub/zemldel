import type { ReactNode } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import type { RequestDocumentRequestDto } from "../dto/request-document-request.dto";
import { RowList, RowListItem } from "@/shared/ui/RowList";

type Props = {
  title: string;
  items: RequestDocumentRequestDto[];
  renderActions: (item: RequestDocumentRequestDto) => ReactNode;
  renderHint?: (item: RequestDocumentRequestDto) => ReactNode;
  empty?: ReactNode;
  /** Why: «ждём» звучит по-разному для того, кто загружает, и для того, кто ждёт. */
  pendingLabel?: string;
};

export function RequestDocumentsList({
  title,
  items,
  renderActions,
  renderHint,
  empty,
  pendingLabel = "Ожидаем",
}: Props) {
  return (
    <RowList
      title={title}
      items={items}
      empty={empty}
      getKey={(x) => x.id}
      renderRow={(d, { isLast, index }) => {
        const hasFile = d.status === "UPLOADED" && Boolean(d.originalName) && Boolean(d.mimeType);
        return (
          <RowListItem
            isLast={isLast}
            left={
              <Stack spacing={0.5}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{
                    alignItems: "center",
                    flexWrap: "wrap",
                    minWidth: 0
                  }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      wordBreak: "break-word"
                    }}>
                    {index + 1}. {d.title}
                  </Typography>
                  <Chip size="small" label={d.status === "UPLOADED" ? "Загружен" : pendingLabel} />
                </Stack>
                {hasFile ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      wordBreak: "break-word"
                    }}>
                    Файл: {d.originalName}
                  </Typography>
                ) : null}
                {renderHint ? renderHint(d) : null}
              </Stack>
            }
            right={renderActions(d)}
          />
        );
      }}
    />
  );
}

