export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  accountKind: "CUSTOMER" | "PROVIDER";
  createdAt: string;
};

export type AdminUsersPage = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type PassportAuditPage = {
  user: AdminUser;
  items: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    actorProviderId: string | null;
    requestId: string | null;
    createdAt: string;
    actorName: string | null;
    providerName: string | null;
    requestNumber: number | null;
    requestTitle: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export const PASSPORT_AUDIT_ACTIONS: Record<string, string> = {
  CUSTOMER_WRITE: "Сохранены данные паспорта",
  CUSTOMER_DELETE: "Удалены данные паспорта",
  CUSTOMER_PHOTO_WRITE: "Загружена фотография паспорта",
  CUSTOMER_PHOTO_READ: "Владельцу выдан файл фотографии паспорта",
  CUSTOMER_PHOTO_DELETE: "Удалена фотография паспорта",
  REQUEST_FORM: "Исполнитель запросил данные паспорта",
  REQUEST_PHOTO: "Исполнитель запросил фотографии паспорта",
  DECLINE_FORM: "Отклонён запрос данных паспорта",
  DECLINE_PHOTO: "Отклонён запрос фотографий паспорта",
  GRANT_FORM: "Предоставлен доступ к данным паспорта",
  GRANT_PHOTO: "Предоставлен доступ к фотографиям паспорта",
  REVOKE_FORM: "Отозван доступ к данным паспорта",
  REVOKE_PHOTO: "Отозван доступ к фотографиям паспорта",
  REQUEST_REVOKE_FORM: "Доступ к данным паспорта закрыт из-за изменения заявки",
  REQUEST_REVOKE_PHOTO: "Доступ к фотографиям паспорта закрыт из-за изменения заявки",
  PROVIDER_FORM_READ: "Исполнителю выданы данные паспорта",
  PROVIDER_PHOTO_READ: "Исполнителю выдан файл фотографии паспорта",
  PROVIDER_READ: "Исполнителю выданы данные паспорта по прежним правилам",
};
