"use client";

import { Paper } from "@mui/material";
import type { RequestCustomerDto } from "@/entities/request";
import { ServiceRequestRow } from "@/widgets/pro-my-services/ui/ServiceRequestRow";
import { getCustomerRequestCardContent } from "../lib/customer-request-board";

type Props = {
  items: RequestCustomerDto[];
  deletingId: string | null;
  sendingId: string | null;
  onDelete: (item: RequestCustomerDto) => void;
  onReply: (item: RequestCustomerDto) => void;
};

export function CustomerRequestsFeed({
  items,
  deletingId,
  sendingId,
  onDelete,
  onReply,
}: Props) {
  return (
    <Paper elevation={0} sx={{ overflow: "hidden" }}>
      {items.map((item) => (
        <ServiceRequestRow
          key={item.id}
          request={item}
          title={getCustomerRequestCardContent(item).title}
          customerView
          deleting={deletingId === item.id}
          sending={sendingId === item.id}
          onDelete={onDelete}
          onReply={onReply}
        />
      ))}
    </Paper>
  );
}
