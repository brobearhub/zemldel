import { BadRequestException } from '@nestjs/common';

export const JOB_TITLE_MAX_LENGTH = 120;

export function normalizeJobTitle(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function requireJobTitle(value: unknown): string {
  const title = normalizeJobTitle(value);
  if (!title || title.length > JOB_TITLE_MAX_LENGTH) {
    throw new BadRequestException({
      message: 'Укажите должность длиной до 120 символов',
      fieldErrors: { jobTitle: 'Укажите должность длиной до 120 символов' },
    });
  }
  return title;
}
