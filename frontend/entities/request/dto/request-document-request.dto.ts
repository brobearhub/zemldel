export type RequestDocumentRequestStatus = "REQUESTED" | "UPLOADED";

export type RequestDocumentRequestDto = {
  id: string;
  title: string;
  sortOrder: number;
  status: RequestDocumentRequestStatus;

  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  uploadedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

