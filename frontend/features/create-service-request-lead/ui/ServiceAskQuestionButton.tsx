"use client";

import { useState } from "react";
import { Alert, Button, CircularProgress, Stack, TextField } from "@mui/material";
import {
  collectCadastralNumbersFromParts,
  createEmptyCadastralParts,
  type CadastralNumberParts,
} from "@/entities/request";
import { CadastralNumberListEditor } from "@/shared/ui/CadastralNumberListEditor";
import { useServiceAskQuestion } from "@/features/create-service-request-lead/model/useServiceAskQuestion";
import { DEFAULT_SERVICE_QUESTION } from "@/features/create-service-request-lead";

type Props = {
  serviceId: string;
};

export function ServiceAskQuestionButton({ serviceId }: Props) {
  const form = useServiceAskQuestion({ serviceId });
  const [question, setQuestion] = useState("");
  const [cadastralNumbers, setCadastralNumbers] = useState<CadastralNumberParts[]>([createEmptyCadastralParts()]);

  return (
    <Stack spacing={2}>
      {form.error ? <Alert severity="warning">{form.error}</Alert> : null}

      <TextField
        label="Вопрос (необязательно)"
        placeholder={DEFAULT_SERVICE_QUESTION}
        multiline
        minRows={3}
        value={question}
        onChange={(e) => {
          form.setError(null);
          setQuestion(e.target.value);
        }}
        disabled={form.busy}
        fullWidth
      />

      <CadastralNumberListEditor
        value={cadastralNumbers}
        onChange={(next) => {
          form.setError(null);
          setCadastralNumbers(next);
        }}
        disabled={form.busy}
      />

      <Button
        type="button"
        variant="contained"
        disabled={form.busy}
        startIcon={form.busy ? <CircularProgress size={18} color="inherit" /> : null}
        onClick={() => {
          const cadastral = collectCadastralNumbersFromParts(cadastralNumbers);
          if (cadastral.partialError) {
            form.setError(cadastral.partialError);
            return;
          }
          void form.submit({ questionText: question, cadastralNumbers: cadastral.numbers });
        }}
        sx={{
          fontWeight: 500,
          letterSpacing: "0.46px",
          textTransform: "uppercase",
          py: "8px",
          px: "22px",
          boxShadow:
            "0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px -2px rgba(0,0,0,0.2)",
        }}
        fullWidth
      >
        Задать вопрос
      </Button>
    </Stack>
  );
}

