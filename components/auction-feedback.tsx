import { useTranslations } from "next-intl";

import type { AuctionFeedback } from "@/hooks/use-auction";

const ERROR_KEYS: Record<string, string> = {
  UNAUTHORIZED: "errors.unauthorized",
  FORBIDDEN: "errors.forbidden",
  INVALID_INPUT: "errors.invalid",
  NOT_FOUND: "errors.notFound",
  CLOSED: "errors.closed",
  TOO_LOW: "errors.tooLow",
  RATE_LIMITED: "errors.rateLimited",
  UPSTREAM_ERROR: "errors.upstream",
};

export function FormatAuctionFeedback({ feedback }: { feedback: AuctionFeedback }) {
  const t = useTranslations();
  if (!feedback) {
    return null;
  }
  const text = feedback.kind === "error"
    ? t(ERROR_KEYS[feedback.code] ?? "errors.generic")
    : t(feedback.code === "EXTENDED" ? "bid.extended" : "bid.accepted");

  return (
    <p className={feedback.kind === "error" ? "form-error" : "form-success"} role={feedback.kind === "error" ? "alert" : "status"}>
      {text}
    </p>
  );
}
