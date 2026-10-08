import { formatRequestDate, getRequestStatusLabel, type RequestProDto } from "@/entities/request";
import { FeedList } from "@/widgets/pro-requests/ui/FeedList";
import { FeedListItem } from "@/widgets/pro-requests/ui/FeedListItem";

type Props = {
  items: RequestProDto[];
  minRows?: number;
};

export function OrderList({ items, minRows = 6 }: Props) {
  return (
    <FeedList
      items={items}
      minRows={minRows}
      getKey={(order) => order.id}
      renderRow={(order, { isLast }) => {
        const href = `/pro/requests/${order.id}`;
        const ratingLabel = order.customerRating != null ? ` · ${order.customerRating.toFixed(1)}` : "";
        const meta = `${formatRequestDate(order.createdAt)} · ${getRequestStatusLabel(order.status)}${ratingLabel}`;
        const preview = order.customerName
          ? order.customerEmail
            ? `${order.customerName} · ${order.customerEmail}`
            : order.customerName
          : order.customerEmail || "";
        return (
          <FeedListItem
            href={href}
            disabled={false}
            isLast={isLast}
            title={order.serviceTitle || "Заявка"}
            meta={meta}
            preview={preview || undefined}
          />
        );
      }}
    />
  );
}
