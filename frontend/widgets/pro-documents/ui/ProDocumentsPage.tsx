"use client";

import { useEffect, useState } from "react";
import { Stack, Typography } from "@mui/material";
import {
  CustomerRequestDocuments,
  type DocumentRequest,
} from "@/widgets/customer-documents/ui/CustomerRequestDocuments";
import { ProviderDocumentLibrary } from "./ProviderDocumentLibrary";

export function ProDocumentsPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetch("/api/pro/documents/requests", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok || !Array.isArray(payload))
          throw new Error("Не удалось загрузить заявки.");
        if (!controller.signal.aborted)
          setRequests(payload as DocumentRequest[]);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Не удалось загрузить заявки.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <Stack spacing={3}>
      <Typography
        component="h1"
        variant="h1"
        sx={{
          fontWeight: 700,
        }}
      >
        Документы
      </Typography>
      <ProviderDocumentLibrary />
      <CustomerRequestDocuments
        audience="provider"
        requests={requests}
        loading={loading}
        error={error}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    </Stack>
  );
}
