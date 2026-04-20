import type { ServiceRequestProDto } from "@/entities/service-request";
import { getServiceRequestStatusLabel } from "@/entities/service-request";
import { formatServiceRequestDate, getServiceRequestTitle } from "@/widgets/pro-requests/lib/serviceRequestView";
import { FeedList } from "@/widgets/pro-requests/ui/FeedList";
import { FeedListItem } from "@/widgets/pro-requests/ui/FeedListItem";

type Props = {
  items: ServiceRequestProDto[];
  minRows?: number;
  allowLockedClick?: boolean;
};

export function ServiceRequestList({ items, minRows = 6, allowLockedClick }: Props) {
  return (
    <FeedList
      items={items}
      minRows={minRows}
      getKey={(item) => item.id}
      renderRow={(item, { isLast }) => {
        const href = `/pro/requests/${item.id}`;
        const disabled = allowLockedClick ? false : item.isLocked;
        const meta = formatServiceRequestDate(item.createdAt);
        const preview = item.message
          ? item.message
          : item.location
            ? `Локация: ${item.location}`
            : item.isLocked
              ? "Клиент уже работает с другой компанией."
              : "";
        return (
          <FeedListItem
            href={href}
            disabled={disabled}
            isLast={isLast}
            title={getServiceRequestTitle(item)}
            meta={meta}
            preview={preview || undefined}
          />
        );
      }}
    />
  );
}

