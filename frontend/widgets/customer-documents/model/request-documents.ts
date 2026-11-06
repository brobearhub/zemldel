import type { RequestDocumentRequestDto, WorkStageDto } from "@/entities/request";
import type { CustomerContractBundleItem } from "@/entities/request/api/customer-contract-bundles";
import type { ProContractFileItem } from "@/entities/request/api/pro-contract-files";

export type CustomerDocumentItem = {
  id: string;
  title: string;
  filename: string | null;
  source: string;
  href: string | null;
  sizeBytes: number | null;
};

async function fetchRows<T>(url: string, signal: AbortSignal): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store", signal });
  const payload: unknown = await response.json();
  if (!response.ok || !Array.isArray(payload)) throw new Error("Не удалось загрузить документы");
  return payload as T[];
}

export async function loadRequestDocuments(requestId: string, signal: AbortSignal) {
  const base = `/api/requests/${encodeURIComponent(requestId)}`;
  const results = await Promise.allSettled([
    fetchRows<ProContractFileItem>(`${base}/contract-files`, signal),
    fetchRows<CustomerContractBundleItem>(`${base}/contract-bundles`, signal),
    fetchRows<RequestDocumentRequestDto>(`${base}/document-requests`, signal),
    fetchRows<WorkStageDto>(`${base}/work-stages`, signal),
  ]);
  const [contracts, bundles, documents, stages] = results;
  const rows = new Map<string, CustomerDocumentItem>();
  const addContract = (file: { id: string; originalName: string; sizeBytes: number }, source: string) => {
    rows.set(`contract:${file.id}`, {
      id: `contract:${file.id}`,
      title: file.originalName,
      filename: null,
      source,
      href: `${base}/contract-files/${encodeURIComponent(file.id)}/download`,
      sizeBytes: file.sizeBytes,
    });
  };

  if (contracts.status === "fulfilled") {
    contracts.value.forEach((file) => addContract(file, "Договор"));
  }
  if (bundles.status === "fulfilled") {
    bundles.value.forEach((bundle) => {
      addContract(bundle.document, "Договор");
      if (bundle.signature) addContract(bundle.signature, "Подпись к договору");
    });
  }
  if (documents.status === "fulfilled") {
    documents.value.forEach((document) => {
      rows.set(`requested:${document.id}`, {
        id: `requested:${document.id}`,
        title: document.title,
        filename: document.originalName,
        source: "Документ заказчика",
        href: document.status === "UPLOADED" && document.originalName
          ? `${base}/document-requests/${encodeURIComponent(document.id)}/download`
          : null,
        sizeBytes: document.sizeBytes,
      });
    });
  }
  if (stages.status === "fulfilled") {
    stages.value.forEach((stage) => {
      const stageBase = `${base}/work-stages/${encodeURIComponent(stage.id)}`;
      stage.files.forEach((file) => {
        rows.set(`stage-file:${file.id}`, {
          id: `stage-file:${file.id}`,
          title: file.originalName,
          filename: null,
          source: stage.title,
          href: `${stageBase}/files/${encodeURIComponent(file.id)}/download`,
          sizeBytes: file.sizeBytes,
        });
      });
      stage.docSlots.forEach((slot) => {
        rows.set(`stage-slot:${slot.id}`, {
          id: `stage-slot:${slot.id}`,
          title: slot.title,
          filename: slot.originalName,
          source: stage.title,
          href: slot.status === "UPLOADED" && slot.originalName
            ? `${stageBase}/doc-slots/${encodeURIComponent(slot.id)}/download`
            : null,
          sizeBytes: slot.sizeBytes,
        });
      });
    });
  }

  const sources = ["договоры", "пакеты договоров", "документы заказчика", "документы этапов"];
  const failed = results.flatMap((result, index) => result.status === "rejected" ? [sources[index]] : []);
  return {
    items: [...rows.values()],
    error: failed.length ? `Не удалось загрузить: ${failed.join(", ")}.` : null,
  };
}
