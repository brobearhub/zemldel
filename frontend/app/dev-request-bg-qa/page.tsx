"use client";
import { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import PaymentIcon from "@mui/icons-material/Payment";
import PinDropOutlinedIcon from "@mui/icons-material/PinDropOutlined";
import { useColorMode } from "@/core/theme/ColorModeContext";
import { RequestPriceBlock } from "@/entities/request";
import { RequestDetailHeaderCard } from "@/shared/ui/RequestDetailHeaderCard";
import { RequestDetailPanelTriggers } from "@/shared/ui/RequestDetailPanelTriggers";

export default function RequestBgQa() {
  const { mode, darkPalette } = useColorMode();
  const [role, setRole] = useState("provider");
  const [opened, setOpened] = useState("");
  useEffect(() => setRole(new URLSearchParams(window.location.search).get("mode") === "customer" ? "customer" : "provider"), []);
  return (
    <Box component="main" data-qa-theme={mode} data-qa-palette={darkPalette} data-qa-role={role} sx={{ p: 2, maxWidth: 1400, mx: "auto" }}>
      <Box id="qa-secondary" sx={{ position: "absolute", visibility: "hidden", bgcolor: "background.secondary" }} />
      <Box id="qa-paper" sx={{ position: "absolute", visibility: "hidden", bgcolor: "background.paper" }} />
      <Box id="request-card">
        <RequestDetailHeaderCard
          title="Оформление разрешений на строительство"
          subtitle=""
          reference="03.11.2026, 07:45"
          requestLabel="Заявка № 21"
          statusLabel="Договор"
          body="Оформление разрешений на строительство"
          nextStep={<Alert severity="info" icon={false} sx={{ bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider" }}>Цена согласована. Подготовьте и отправьте договор в разделе документов.</Alert>}
          lead={<RequestPriceBlock totalAmountRubles={20000} servicePriceRubles={12000} serviceId="service" showReferencePrice={false} />}
          details={<Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", justifyContent: "space-around", gap: 2 }}><Typography>Новая</Typography><Typography>Обсуждение</Typography><Typography>Договор</Typography><Typography>В работе</Typography><Typography>Принятие</Typography><Typography>Завершен</Typography></Stack>}
          afterBody={<Button variant="outlined" color="inherit" size="small">Отказаться от заявки</Button>}
          footerEnd={<RequestDetailPanelTriggers items={[
            { id: "cadastral", label: "Кадастровый номер", endIcon: <PinDropOutlinedIcon /> },
            { id: "payment", label: "28 100 ₽", endIcon: <PaymentIcon /> },
            { id: "counterparty", label: role === "customer" ? "Исполнитель" : "Клиент", endIcon: <AssignmentIndIcon /> },
          ]} onOpen={setOpened} />}
        />
      </Box>
      <output aria-label="Открытая панель">{opened}</output>
    </Box>
  );
}
