import { Api } from 'grammy';

export function createTelegramApi(token: string, timeoutSeconds: number): Api {
  // API client only: incoming updates use our authenticated webhook controller.
  // Delivery retries belong to MessengerWorker, not an SDK retry plugin.
  return new Api(token, { timeoutSeconds, sensitiveLogs: false });
}
