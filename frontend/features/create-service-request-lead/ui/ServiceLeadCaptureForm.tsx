"use client";

import Link from "next/link";
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import { useServiceLeadCapture } from "@/features/create-service-request-lead/model/useServiceLeadCapture";

type Props = {
  serviceId: string;
  isAuthenticated: boolean;
  initialCustomerEmail: string | null;
};

export function ServiceLeadCaptureForm({ serviceId, isAuthenticated, initialCustomerEmail }: Props) {
  const form = useServiceLeadCapture({ serviceId, isAuthenticated, initialCustomerEmail });

  return (
    <Stack component="form" spacing={2.25} onSubmit={(e) => { e.preventDefault(); void form.submit(); }}>
      {form.error ? <Alert severity="warning">{form.error}</Alert> : null}

      <TextField
        label="Электронная почта"
        type="email"
        required
        value={form.customerEmail}
        onChange={(e) => {
          form.setError(null);
          form.setCustomerEmail(e.target.value);
        }}
        disabled={form.busy}
        fullWidth
        size="medium"
      />

      <Button
        type="submit"
        variant="contained"
        disabled={form.busy || Boolean(form.validationError)}
        startIcon={form.busy ? <CircularProgress size={18} color="inherit" /> : null}
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
        Отправить заявку
      </Button>

      <Typography variant="caption" sx={{ color: "text.disabled", lineHeight: 1.66, letterSpacing: "0.4px" }}>
        Нажимая кнопку, вы соглашаетесь с{" "}
        <Typography component={Link} href="/privacy" variant="caption" sx={{ color: "inherit", textDecoration: "underline" }}>
          политикой обработки персональных данных
        </Typography>
        .
      </Typography>
    </Stack>
  );
}

