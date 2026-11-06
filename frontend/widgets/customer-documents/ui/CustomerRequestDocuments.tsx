"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { getRequestStatusLabel, type RequestCustomerDto } from "@/entities/request";
import { pluralRu } from "@/shared/lib/plural-ru";
import { loadRequestDocuments, type CustomerDocumentItem } from "../model/request-documents";

function DocumentRow({ item, requestId }: { item: CustomerDocumentItem; requestId: string }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      sx={{
        py: 1.5,
        alignItems: { sm: "center" },
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          flex: 1,
          minWidth: 0,
          alignItems: "flex-start",
        }}
      >
        <DescriptionOutlinedIcon
          color="action"
          sx={{
            mt: 0.25,
            flexShrink: 0,
          }}
        />
        <Box
          sx={{
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
            }}
          >
            {item.title}
          </Typography>
          {item.filename && item.filename !== item.title ? (
            <Typography variant="body2">{item.filename}</Typography>
          ) : null}
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
            }}
          >
            {item.source}
            {item.href && item.sizeBytes !== null ? ` · ${Math.max(1, Math.round(item.sizeBytes / 1024))} КБ` : ""}
            {!item.href ? " · Нужно загрузить" : ""}
          </Typography>
        </Box>
      </Stack>
      <Button
        component="a"
        href={item.href ?? `/profile/requests/${requestId}#documents`}
        size="small"
        startIcon={item.href ? <DownloadOutlinedIcon /> : undefined}
        aria-label={item.href ? `Скачать ${item.title}` : `Загрузить ${item.title} в заявке`}
        sx={{
          flexShrink: 0,
          alignSelf: { xs: "flex-start", sm: "center" },
        }}
      >
        {item.href ? "Скачать" : "Перейти к загрузке"}
      </Button>
    </Stack>
  );
}

function RequestGroup({ request }: { request: RequestCustomerDto }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<CustomerDocumentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const title = request.serviceTitle || request.categoryName || request.message || "Заявка без названия";

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void loadRequestDocuments(request.id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setItems(result.items);
        setError(result.error);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Не удалось загрузить документы заявки.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [expanded, request.id, attempt]);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => setExpanded(next)}
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px !important",
        overflow: "hidden",
        "&::before": {
          display: "none",
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        aria-controls={`request-documents-${request.id}`}
        id={`request-documents-heading-${request.id}`}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            minWidth: 0,
            width: "100%",
            pr: 1,
          }}
        >
          <FolderOutlinedIcon color="action" />
          <Box
            sx={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 600,
                overflowWrap: "anywhere",
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              Заявка № {request.id.slice(0, 8)}
              {request.providerName ? ` · ${request.providerName}` : ""}
            </Typography>
          </Box>
          <Chip
            size="small"
            variant="outlined"
            label={getRequestStatusLabel(request.status)}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
            }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1}>
          <Button
            component={Link}
            href={`/profile/requests/${request.id}`}
            size="small"
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              alignSelf: "flex-start",
            }}
          >
            Открыть заявку
          </Button>
          {loading ? <Skeleton height={60} /> : error ? (
            <Alert
              severity="warning"
              action={(
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setAttempt((current) => current + 1)}
                >
                  Повторить
                </Button>
              )}
            >
              {error}
            </Alert>
          ) : null}
          {!loading && items?.length === 0 && !error ? (
            <Typography
              variant="body2"
              sx={{
                py: 1,
                color: "text.secondary",
              }}
            >
              В этой заявке пока нет документов.
            </Typography>
          ) : null}
          {!loading ? (
            <Stack divider={<Divider />}>
              {items?.map((item) => (
                <DocumentRow
                  key={item.id}
                  item={item}
                  requestId={request.id}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

type Props = {
  requests: RequestCustomerDto[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function CustomerRequestDocuments({ requests, loading, error, onRetry }: Props) {
  return (
    <Paper
      component="section"
      aria-labelledby="request-documents-heading"
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography
            id="request-documents-heading"
            component="h2"
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            Документы по заявкам
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              color: "text.secondary",
            }}
          >
            Договоры, подписи и файлы этапов работ. Раскройте заявку, чтобы посмотреть её документы.
          </Typography>
        </Box>
        {loading ? <Skeleton height={72} /> : error ? (
          <Alert
            severity="error"
            action={<Button onClick={onRetry}>Повторить</Button>}
          >
            {error}
          </Alert>
        ) : requests.length === 0 ? (
          <Typography
            sx={{
              color: "text.secondary",
              py: 2,
            }}
          >
            У вас пока нет заявок. Документы появятся здесь после их добавления в заявку.
          </Typography>
        ) : (
          <>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
              }}
            >
              {requests.length} {pluralRu(requests.length, ["заявка", "заявки", "заявок"])}
            </Typography>
            {requests.map((request) => (
              <RequestGroup
                key={request.id}
                request={request}
              />
            ))}
          </>
        )}
      </Stack>
    </Paper>
  );
}
