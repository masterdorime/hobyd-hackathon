import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { RoomCard } from "@/components/room-card";
import { demoRoom } from "@/lib/demo-data";

export const instant = false;

export default async function LobbyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LobbyContent />;
}

function LobbyContent() {
  const t = useTranslations("lobby");
  const common = useTranslations("common");

  return (
    <main className="page-shell">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
        <span className="preview-badge">{common("preview")}</span>
      </section>
      <div className="room-grid">
        <RoomCard room={demoRoom} />
      </div>
      <p className="preview-note" role="note">{t("seedNotice")}</p>
    </main>
  );
}
