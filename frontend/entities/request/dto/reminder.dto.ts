export type RequestReminderDto = {
  id: string;
  requestId: string;
  providerId: string;
  text: string;
  remindAt: string;
  isDone: boolean;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
  request: {
    id: string;
    message: string | null;
    location: string | null;
    service: { title: string } | null;
    category: { name: string } | null;
  };
};

export type CreateReminderPayload = {
  text: string;
  remindAt: string;
};

export type UpdateReminderPayload = {
  text?: string;
  remindAt?: string;
  isDone?: boolean;
};
