import Image from "next/image";
import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { LanguageToggle } from "@/components/language-toggle";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  const t = useTranslations("common");

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand-link" href="/" aria-label="HOBYD lobby">
          <Image src="/hobyd-logo.png" alt="HOBYD" width={92} height={38} priority />
          <span className="brand-tagline">{t("brandDescription")}</span>
        </Link>
        <nav className="header-actions" aria-label="Account and language">
          <LanguageToggle />
          <NextLink className="btn btn-secondary btn-small" href="/login">
            {t("login")}
          </NextLink>
        </nav>
      </div>
    </header>
  );
}
