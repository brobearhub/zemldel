export type ReviewDirection = "CUSTOMER_TO_PROVIDER" | "PROVIDER_TO_CUSTOMER";

export type ReviewDto = {
  id: string;
  direction: ReviewDirection;
  rating: number;
  text: string | null;
  createdAt: string;
  authorDisplayName: string;
  serviceTitle: string | null;
  replyText: string | null;
  repliedAt: string | null;
};

export type ReviewListDto = {
  items: ReviewDto[];
  nextCursor: string | null;
};
