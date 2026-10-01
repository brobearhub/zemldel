import type { ServiceDto } from "@/entities/service";

export type ServiceTemplateId = "standard";

/**
 * categoryId -> templateId.
 * Why: Strategy registry for exact-match category templates with a safe default.
 */
const serviceTemplateRegistry: Partial<Record<string, ServiceTemplateId>> = {};

export function resolveServiceTemplateId(service: Pick<ServiceDto, "categoryId">): ServiceTemplateId {
  return serviceTemplateRegistry[service.categoryId] ?? "standard";
}

