import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { RoomCard } from "@/components/room-card";
import { listRooms } from "@/lib/server/rooms";
import type { Room } from "@/lib/types";

export default async function LobbyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const rooms = await listRooms();

  return <LobbyContent rooms={rooms} />;
}

function LobbyContent({ rooms }: { rooms: Room[] }) {
  const t = useTranslations("lobby");

  return (
    <main className="page-shell">
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
      </section>
      {rooms.length === 0 ? <p className="empty-state well">{t("empty")}</p> : (
        <div className="room-grid">
          {rooms.map((room) => <RoomCard key={room.id} room={room} />)}
        </div>
      )}
    </main>
  );
}
