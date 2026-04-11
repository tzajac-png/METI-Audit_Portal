/** After a row is opened, one of these processing statuses applies. */
export type AlignedPortalSubmissionStatus =
  | "reviewed"
  | "payment_collected_submitted_cards"
  | "holding_class_payment"
  | "cards_issued";

export const ALIGNED_PORTAL_SUBMISSION_LABELS: Record<
  AlignedPortalSubmissionStatus,
  string
> = {
  reviewed: "Reviewed",
  payment_collected_submitted_cards: "Payment collected & Submitted for cards",
  holding_class_payment: "Holding class for payment",
  cards_issued: "Cards issued",
};

export type AlignedSubmissionEntry = {
  rowKey: string;
  openedAt: string;
  status: AlignedPortalSubmissionStatus;
};
