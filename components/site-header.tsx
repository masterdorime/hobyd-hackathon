import Image from "next/image";
import NextLink from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LanguageToggle } from "@/components/language-toggle";
import { Link } from "@/i18n/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

type Viewer = { id: string; name: string } | null;

function hasPublicConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

async function loadViewer(): Promise<Viewer> {
  if (!hasPublicConfig()) {
    return null;
  }

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      name: profile?.name ?? user.email?.split("@")[0] ?? "Collector",
    };
  } catch {
    return null;
  }
}

async function signOut() {
  "use server";
  if (hasPublicConfig()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/id");
}

export async function SiteHeader() {
  const [t, viewer] = await Promise.all([
    getTranslations("common"),
    loadViewer(),
  ]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand-link" href="/" aria-label="HOBYD lobby">
          <Image src="/hobyd-logo.png" alt="HOBYD" width={92} height={38} style={{ width: "auto", height: "auto" }} priority />
          <span className="brand-tagline">{t("brandDescription")}</span>
        </Link>
        <nav className="header-actions" aria-label="Account and language">
          <LanguageToggle />
          {viewer ? (
            <form className="account-control" action={signOut}>
              <span className="account-name">{viewer.name}</span>
              <button className="btn btn-secondary btn-small" type="submit">
                {t("logout")}
              </button>
            </form>
          ) : (
            <NextLink className="btn btn-secondary btn-small" href="/login">
              {t("login")}
            </NextLink>
          )}
        </nav>
      </div>
    </header>
  );
}
