import type { RequestStatus } from '@prisma/client';

export const READABLE_REQUEST_STATUSES = new Set<RequestStatus>([
  'ACTIVE',
  'ACCEPTANCE_PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'CLOSED',
]);
