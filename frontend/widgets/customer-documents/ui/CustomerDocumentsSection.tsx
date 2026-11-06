"use client";

import { useEffect, useState } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { RequestCustomerDto } from "@/entities/request";
import { CustomerPassportSection } from "./CustomerPassportSection";
import { PassportPhotoCard } from "./PassportPhotoCard";
import { PassportAccessPanel } from "./PassportAccessPanel";
import { PassportAccessDialog } from "./PassportAccessDialog";
import { CustomerRequestDocuments } from "./CustomerRequestDocuments";

export function CustomerDocumentsSection() {
  const [requests, setRequests] = useState<RequestCustomerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hasPassport, setHasPassport] = useState(false);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [accessVersion, setAccessVersion] = useState(0);
  const [shareKind, setShareKind] = useState<"form" | "photo" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const response = await fetch("/api/requests", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok || !Array.isArray(payload)) {
          throw new Error("Не удалось загрузить заявки");
        }
        if (!controller.signal.aborted) setRequests(payload as RequestCustomerDto[]);
      } catch {
        if (!controller.signal.aborted) setError("Не удалось загрузить заявки. Попробуйте ещё раз.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [attempt]);

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 800,
                mb: 1,
              }}
            >
              Документы
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
              }}
            >
              Паспортные данные и файлы по вашим заявкам — в одном месте.
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
              alignItems: "start",
              gap: 2,
            }}
          >
            <CustomerPassportSection
              onSavedChange={setHasPassport}
              onShare={() => setShareKind("form")}
            />
            <PassportPhotoCard
              onShare={() => setShareKind("photo")}
              onSavedChange={setHasPhotos}
            />
          </Box>
          <PassportAccessPanel
            refreshKey={`${hasPassport}-${hasPhotos}-${accessVersion}`}
            requests={requests}
          />
        </Stack>
      </Paper>
      <CustomerRequestDocuments
        requests={requests}
        loading={loading}
        error={error}
        onRetry={() => setAttempt((value) => value + 1)}
      />
      {shareKind ? (
        <PassportAccessDialog
          initialKind={shareKind}
          requests={requests}
          loading={loading}
          error={error}
          hasPassport={hasPassport}
          onSaved={() => setAccessVersion((value) => value + 1)}
          onClose={() => setShareKind(null)}
        />
      ) : null}
    </Stack>
  );
}
