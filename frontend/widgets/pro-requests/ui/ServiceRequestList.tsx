import type { RequestProDto } from "@/entities/request";
import { resolveRequestPriceView } from "@/entities/request";
import { formatServiceRequestDate, getServiceRequestTitle } from "@/widgets/pro-requests/lib/serviceRequestView";
import { FeedList } from "@/widgets/pro-requests/ui/FeedList";
import { FeedListItem } from "@/widgets/pro-requests/ui/FeedListItem";

type Props = {
  items: RequestProDto[];
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
        const ratingLabel =
          item.customerRating != null ? ` · заказчик ${item.customerRating.toFixed(1)}` : "";
        const meta = `${formatServiceRequestDate(item.createdAt)}${ratingLabel}`;
        const preview = item.message
          ? item.message
          : item.customerName
            ? item.customerName
            : item.location
              ? `Локация: ${item.location}`
              : item.isLocked
                ? "Клиент уже работает с другой компанией."
                : "";
        const price = resolveRequestPriceView({
          totalAmountRubles: item.totalAmountRubles,
          servicePriceRubles: item.servicePriceRubles,
        });
        return (
          <FeedListItem
            href={href}
            disabled={disabled}
            isLast={isLast}
            title={getServiceRequestTitle(item)}
            caption={price.headline}
            serviceHref={item.serviceId && !item.isLocked ? `/services/${item.serviceId}` : null}
            meta={meta}
            preview={preview || undefined}
          />
        );
      }}
    />
  );
}
