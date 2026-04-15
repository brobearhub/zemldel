import { formatOrderDate, getOrderStatusLabel, type OrderDto } from "@/entities/order";
import { FeedList } from "@/widgets/pro-requests/ui/FeedList";
import { FeedListItem } from "@/widgets/pro-requests/ui/FeedListItem";

type Props = {
  items: OrderDto[];
  minRows?: number;
};

export function OrderList({ items, minRows = 6 }: Props) {
  return (
    <FeedList
      items={items}
      minRows={minRows}
      getKey={(order) => order.id}
      renderRow={(order, { isLast }) => {
        const href = `/pro/orders/${order.id}`;
        const meta = `${formatOrderDate(order.createdAt)} · ${getOrderStatusLabel(order.status)}`;
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
            title={order.serviceTitle || "Заказ"}
            meta={meta}
            preview={preview || undefined}
          />
        );
      }}
    />
  );
}

