import type { ServiceDto } from "@/entities/service";
import { resolveServiceTemplateId } from "@/views/service-page/model/service-template-registry";
import { StandardServiceTemplate } from "@/views/service-page/ui/templates/StandardServiceTemplate";

type SessionLike = { user?: { id?: string; email?: string | null } | null } | null;

type Props = {
  service: ServiceDto;
  session: SessionLike;
};

export function ServicePageView({ service, session }: Props) {
  const templateId = resolveServiceTemplateId(service);

  // Future: add more templates into this switch and register them by categoryId.
  switch (templateId) {
    case "standard":
    default:
      return <StandardServiceTemplate service={service} session={session} />;
  }
}

