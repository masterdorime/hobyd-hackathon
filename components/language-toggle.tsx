"use client";

import { useLocale, useTranslations } from "next-intl";

import { buildLocalePath } from "@/lib/locale-path";

export function LanguageToggle() {
  const t = useTranslations("common");
  const locale = useLocale();
  const targetLocale = locale === "id" ? "en" : "id";

  function switchLocale() {
    const { pathname, search } = window.location;
    window.location.assign(buildLocalePath(pathname, targetLocale, search));
  }

  return (
    <button
      className="language-toggle"
      type="button"
      onClick={switchLocale}
      aria-label={`${t("language")}: ${targetLocale.toUpperCase()}`}
    >
      {targetLocale.toUpperCase()}
    </button>
  );
}
