import type { ReactNode } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import type { RequestDocumentRequestDto } from "../dto/request-document-request.dto";
import { RowList, RowListItem } from "@/shared/ui/RowList";

type Props = {
  items: RequestDocumentRequestDto[];
  renderActions: (item: RequestDocumentRequestDto) => ReactNode;
  renderHint?: (item: RequestDocumentRequestDto) => ReactNode;
  empty?: ReactNode;
};

function statusLabel(status: RequestDocumentRequestDto["status"]) {
  return status === "UPLOADED" ? "Загружен" : "Ожидаем";
}

export function RequestDocumentsList({ items, renderActions, renderHint, empty }: Props) {
  return (
    <RowList
      items={items}
      empty={empty}
      getKey={(x) => x.id}
      renderRow={(d, { isLast }) => {
        const hasFile = d.status === "UPLOADED" && Boolean(d.originalName) && Boolean(d.mimeType);
        return (
          <RowListItem
            key={d.id}
            isLast={isLast}
            left={
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} sx={{ wordBreak: "break-word" }}>
                    {d.sortOrder}. {d.title}
                  </Typography>
                  <Chip size="small" label={statusLabel(d.status)} />
                </Stack>
                {hasFile ? (
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
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

