import { createHash } from 'node:crypto';
import type { MessengerPlatform } from '@prisma/client';

export function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function id(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value))
    return String(value);
  if (typeof value === 'string' && value.length > 0 && value.length <= 200)
    return value;
  return null;
}

function displayName(...values: unknown[]): string {
  return (
    values.find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    ) ?? 'Пользователь'
  ).slice(0, 150);
}

export type MessengerEvent = {
  kind: 'start' | 'message' | 'stop' | 'callback';
  callbackId?: string;
  eventOrder?: number;
  externalUserId: string;
  chatId: string;
  displayName: string;
  messageId?: string;
  text?: string;
  payload?: string;
  replyId?: string;
  timestamp?: number;
};

export function parseMessengerEvent(
  platform: MessengerPlatform,
  input: unknown,
): MessengerEvent | null {
  const update = record(input);
  if (platform === 'TELEGRAM') {
    const membership = record(update.my_chat_member);
    const callback = record(update.callback_query);
    const message = record(callback.message ?? update.message);
    const chat = record(message.chat ?? membership.chat);
    const from = record(callback.from ?? message.from ?? membership.from);
    const externalUserId = id(from.id);
    const chatId = id(chat.id);
    if (
      !externalUserId ||
      !chatId ||
      from.is_bot === true ||
      chat.type !== 'private' ||
      externalUserId !== chatId
    )
      return null;
    const base = {
      externalUserId,
      chatId,
      eventOrder: Number.isSafeInteger(update.update_id)
        ? Number(update.update_id)
        : undefined,
      displayName: displayName(from.first_name, from.username, externalUserId),
    };
    if (record(membership.new_chat_member).status === 'kicked')
      return { ...base, kind: 'stop' };
    const messageId = id(message.message_id);
    if (!messageId) return null;
    if (id(callback.id)) {
      if (typeof callback.data !== 'string' || base.eventOrder === undefined)
        return null;
      return {
        ...base,
        kind: 'callback',
        callbackId: id(callback.id)!,
        messageId,
        payload: callback.data,
      };
    }
    const text = typeof message.text === 'string' ? message.text : '';
    const start = /^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]+))?\s*$/.exec(text);
    return {
      ...base,
      kind: start ? 'start' : 'message',
      messageId,
      text,
      payload: start?.[1],
      replyId: id(record(message.reply_to_message).message_id) ?? undefined,
      timestamp:
        typeof message.date === 'number' ? message.date * 1000 : undefined,
    };
  }
  const message = record(update.message);
  const recipient = record(message.recipient);
  const callback = record(update.callback);
  const user = record(callback.user ?? update.user ?? message.sender);
  const externalUserId = id(user.user_id);
  const chatId = id(update.chat_id ?? recipient.chat_id);
  if (!externalUserId || !chatId || user.is_bot === true) return null;
  // Принимаем текст только из личных диалогов, не из групп/каналов.
  if (
    ['message_created', 'message_callback'].includes(
      String(update.update_type),
    ) &&
    recipient.chat_type !== 'dialog'
  )
    return null;
  const base = {
    externalUserId,
    chatId,
    displayName: displayName(user.name, user.first_name, externalUserId),
  };
  if (update.update_type === 'bot_stopped') return { ...base, kind: 'stop' };
  if (update.update_type === 'bot_started')
    return {
      ...base,
      kind: 'start',
      payload: typeof update.payload === 'string' ? update.payload : undefined,
    };
  if (update.update_type === 'message_callback') {
    if (
      !id(callback.callback_id) ||
      !id(record(message.body).mid) ||
      typeof callback.payload !== 'string' ||
      !Number.isSafeInteger(callback.timestamp)
    )
      return null;
    return {
      ...base,
      kind: 'callback',
      callbackId: id(callback.callback_id)!,
      messageId: id(record(message.body).mid)!,
      payload: callback.payload,
      eventOrder: Number(callback.timestamp),
      timestamp: Number(callback.timestamp),
    };
  }
  if (update.update_type !== 'message_created') return null;
  const body = record(message.body);
  const messageId = id(body.mid);
  if (!messageId) return null;
  const link = record(message.link);
  return {
    ...base,
    kind: 'message',
    eventOrder: Number.isSafeInteger(message.timestamp)
      ? Number(message.timestamp)
      : undefined,
    messageId,
    text: typeof body.text === 'string' ? body.text : '',
    replyId:
      link.type === 'reply'
        ? (id(record(link.message).mid) ?? undefined)
        : undefined,
    timestamp:
      typeof message.timestamp === 'number' ? message.timestamp : undefined,
  };
}

export function incomingMessageUuid(
  platform: MessengerPlatform,
  chatId: string,
  messageId: string,
): string {
  const bytes = createHash('sha256')
    .update(JSON.stringify([platform, chatId, messageId]))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function splitMessage(body: string): string[] {
  const characters = Array.from(body);
  const parts: string[] = [];
  // 1500 code points помещаются в лимит Telegram даже при emoji из двух UTF-16 units.
  for (let i = 0; i < characters.length; i += 1500)
    parts.push(characters.slice(i, i + 1500).join(''));
  return parts;
}
