import { Api } from 'grammy';
import { Agent } from 'node:https';

const ipv4Agent = new Agent({ family: 4, keepAlive: true });

export function createTelegramApi(token: string, timeoutSeconds: number): Api {
  // The same IPv4 transport is used by setup, polling and outgoing replies.
  // Delivery retries belong to MessengerWorker, not an SDK retry plugin.
  return new Api(token, {
    timeoutSeconds,
    sensitiveLogs: false,
    baseFetchConfig: { agent: ipv4Agent },
  });
}
