"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Alert, IconButton, Snackbar, Tooltip } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import type { ChatMessageDto } from "@/entities/chat/dto/chat.dto";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { RequestCustomerDto, RequestProDto } from "@/entities/request";
import { formatProviderIdentity } from "@/entities/provider/lib/provider-identity";

export function DownloadChatPdfButton({ conversationId, serviceRequestId, title, viewerRole, counterpartyName, requestInfo }: {
  conversationId?: string | null;
  serviceRequestId?: string;
  title: string;
  viewerRole?: "CUSTOMER" | "PROVIDER";
  counterpartyName?: string | null;
  requestInfo?: RequestCustomerDto | RequestProDto;
}) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    if (!conversationId || busy) return;
    setBusy(true);
    try {
      const messages: ChatMessageDto[] = [];
      let before: string | undefined;
      do {
        const params = new URLSearchParams({ limit: "100" });
        if (before) params.set("before", before);
        const response = await fetch(`/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Не удалось загрузить историю");
        const page: ChatMessageDto[] = await response.json();
        messages.unshift(...page);
        const next = page[0]?.id;
        if (page.length < 100 || !next || next === before) break;
        before = next;
      } while (true);

      const pdfMake = (await import("pdfmake/build/pdfmake")).default;
      const fonts = (await import("pdfmake/build/vfs_fonts")).default;
      (pdfMake as unknown as { addVirtualFileSystem: (vfs: unknown) => void }).addVirtualFileSystem(fonts);
      let previousDate = "";
      const account = session?.user;
      const providerMembership = account?.memberships?.find((membership) => membership.providerId === account.activeProviderId);
      const personName = [account?.person?.lastName, account?.person?.firstName, account?.person?.middleName].filter(Boolean).join(" ");
      const ownerName = viewerRole === "PROVIDER" && providerMembership
        ? (providerMembership.providerPerson
          ? [providerMembership.providerPerson.lastName, providerMembership.providerPerson.firstName, providerMembership.providerPerson.middleName].filter(Boolean).join(" ")
          : personName || account?.name?.trim() || formatProviderIdentity(providerMembership).title)
        : personName || account?.name?.trim() || "Имя не указано";
      const ownerDetails = [account?.email, account?.phone, account?.id ? `ID аккаунта: ${account.id}` : null].filter(Boolean).join(" · ") || "Дополнительные данные профиля не указаны";
      const peers = new Map<string, { name: string; id: string }>();
      for (const message of messages) {
        if (message.senderUserId && message.senderUserId !== currentUserId) {
          peers.set(message.senderUserId, {
            name: message.senderName?.trim() || "Имя не указано",
            id: message.senderUserId,
          });
        }
      }
      const exportedAt = new Date();
      const range = messages.length ? `${new Date(messages[0].createdAt).toLocaleString("ru-RU")} — ${new Date(messages[messages.length - 1].createdAt).toLocaleString("ru-RU")}` : "Нет сообщений";
      const customer = requestInfo?.customerName || (viewerRole === "CUSTOMER" ? ownerName : counterpartyName) || "Клиент не указан";
      const requestProviderName = requestInfo?.providerName || counterpartyName || title || "Исполнитель не указан";
      const providerEntity = /^(ООО|ОАО|ЗАО|ПАО|НАО|АО|НКО|АНО|ГУП|МУП|ТСЖ|СНТ|КФХ|ИП)\b/i.test(requestProviderName.trim());
      const providerMessageName = [...peers.values()][0]?.name;
      const provider = viewerRole === "PROVIDER" && providerMembership
        ? providerMembership.providerType === "COMPANY"
          ? `${ownerName} от ${formatProviderIdentity(providerMembership).title}`
          : ownerName
        : providerEntity && providerMessageName && providerMessageName !== requestProviderName
          ? `${providerMessageName} от ${requestProviderName}`
          : requestProviderName;
      const requestNumber = requestInfo?.number ? `№ ${requestInfo.number}` : `ID ${requestInfo?.id || serviceRequestId || "не указан"}`;
      const requestSubject = requestInfo?.serviceTitle || requestInfo?.categoryName || (requestInfo?.subjectType === "FREEFORM" ? "Свободная заявка" : "Услуга не указана");
      const otherPartyDetails = viewerRole === "PROVIDER"
        ? [(requestInfo as RequestProDto | undefined)?.customerEmail, (requestInfo as RequestProDto | undefined)?.customerPhone]
        : [(requestInfo as RequestCustomerDto | undefined)?.providerEmail, (requestInfo as RequestCustomerDto | undefined)?.providerPhone];
      const content: Content[] = [
        { text: "ВЫГРУЗКА ПЕРЕПИСКИ", fontSize: 9, bold: true, color: "#6e7471", margin: [0, 0, 0, 4] },
        { text: "Сведения о заявке и услуге", fontSize: 12, bold: true, margin: [0, 0, 0, 5] },
        { text: `Заявка ${requestNumber} · ${requestSubject}`, fontSize: 10, bold: true, margin: [0, 0, 0, 8] },
        { text: [{ text: "Клиент: " }, { text: customer, bold: true }], fontSize: 10 },
        { text: [{ text: "Исполнитель услуги: " }, { text: provider, bold: true }], fontSize: 10 },
        ...(requestInfo?.location ? [{ text: `Место оказания услуги: ${requestInfo.location}`, fontSize: 10 } as Content] : []),
        ...(requestInfo?.message ? [{ text: `Описание заявки: ${requestInfo.message}`, fontSize: 10, margin: [0, 2, 0, 2] as [number, number, number, number] } as Content] : []),
        { text: "Сайт оказания услуги: zemledel.ru", fontSize: 10, margin: [0, 0, 0, 8] },
        { text: "Участники переписки", fontSize: 12, bold: true, margin: [0, 0, 0, 5] },
        { text: `${viewerRole === "PROVIDER" ? "Исполнитель услуги" : "Клиент"} (сторона, выполнившая выгрузку): ${ownerName}`, fontSize: 10, bold: true },
        { text: ownerDetails, fontSize: 9, color: "#555555", margin: [0, 2, 0, 6] },
      ];
      if (peers.size) {
        for (const peer of peers.values()) {
          content.push({ text: `${viewerRole === "PROVIDER" ? "Клиент" : "Исполнитель услуги"}: ${peer.name}`, fontSize: 10, bold: true });
          content.push({ text: `ID аккаунта: ${peer.id}`, fontSize: 9, color: "#555555", margin: [0, 2, 0, 4] });
          if (otherPartyDetails.filter(Boolean).length) content.push({ text: otherPartyDetails.filter(Boolean).join(" · "), fontSize: 9, color: "#555555", margin: [0, 0, 0, 4] });
        }
      } else {
        content.push({ text: `Собеседник: ${title}. ID аккаунта собеседника не найден в сообщениях.`, fontSize: 10, margin: [0, 0, 0, 5] });
      }
      content.push({ text: `ID чата: ${conversationId}`, fontSize: 9, color: "#555555", margin: [0, 3, 0, 0] });
      if (serviceRequestId && serviceRequestId !== "direct") content.push({ text: `ID заявки: ${serviceRequestId}`, fontSize: 9, color: "#555555" });
      content.push({ text: `Сообщений: ${messages.length} · Период: ${range}`, fontSize: 9, color: "#555555" });
      content.push({ text: `Файл сформирован: ${exportedAt.toLocaleString("ru-RU")}`, fontSize: 9, color: "#555555", margin: [0, 0, 0, 4] });
      content.push({ text: "Сообщения приведены в хронологическом порядке. Для каждого сообщения указаны автор и время, полученные из данных чата.", fontSize: 9, color: "#555555", margin: [0, 0, 0, 12] });
      content.push({ text: "Переписка", fontSize: 13, bold: true, margin: [0, 0, 0, 6] });
      for (const message of messages) {
        const date = new Date(message.createdAt);
        const day = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
        if (day !== previousDate) {
          content.push({ text: day, alignment: "center", color: "#718077", fontSize: 9, margin: [0, 8, 0, 8] });
          previousDate = day;
        }
        const mine = message.senderUserId === currentUserId;
        const bubble: Content[] = [{
          columns: [
            { text: message.senderName?.trim() || (mine ? "Вы" : "Участник"), bold: true, color: mine ? "#315c49" : "#FF4B14", fontSize: 9 },
            { text: date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }), alignment: "right", color: "#78867e", fontSize: 8 },
          ],
          columnGap: 8,
          margin: [0, 0, 0, 4],
        }];
        if (message.repliedTo) bubble.push({ text: `${message.repliedTo.senderName ?? "Участник"}: ${message.repliedTo.bodySnippet}`, color: "#668071", fontSize: 9, margin: [0, 0, 0, 4] });
        bubble.push({ text: message.body, fontSize: 10 });
        const bubbleColumn = { width: "78%", table: { widths: ["*"], body: [[{ stack: bubble, fillColor: mine ? "#e2f0e6" : "#f1f3f1", margin: [8, 6, 8, 6] as [number, number, number, number] }]] }, layout: "noBorders" };
        const spacer = { width: "22%", text: "" };
        content.push({ columns: mine ? [spacer, bubbleColumn] : [bubbleColumn, spacer], margin: [0, 0, 0, 6] });
      }
      if (!messages.length) content.push({ text: "Сообщений пока нет", color: "#718077" });
      const document: TDocumentDefinitions = { content, pageMargins: [36, 36, 36, 36], defaultStyle: { font: "Roboto" } };
      await pdfMake.createPdf(document).download("chat.pdf");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Tooltip title="Скачать чат в PDF">
      <span>
        <IconButton aria-label="Скачать чат в PDF" size="small" disabled={!conversationId || busy} onClick={() => void download()}>
          <FileDownloadIcon />
        </IconButton>
      </span>
    </Tooltip>
    <Snackbar open={error} autoHideDuration={6000} onClose={() => setError(false)}>
      <Alert severity="error" onClose={() => setError(false)}>Не удалось скачать чат. Попробуйте ещё раз.</Alert>
    </Snackbar>
  </>;
}
