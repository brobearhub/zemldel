export type RequestRemarkStatus = "OPEN" | "DONE";
export type RequestRemarkAuthorSide = "CUSTOMER" | "PROVIDER";

export type RequestRemarkDto = {
  id: string;
  requestId: string;
  authorSide: RequestRemarkAuthorSide;
  status: RequestRemarkStatus;
  text: string;
  createdAt: string;
  doneAt: string | null;
  sentAt: string | null;
};

