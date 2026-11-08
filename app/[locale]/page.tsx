import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { RoomCard } from "@/components/room-card";
import { StartLiveForm } from "@/components/start-live-form";
import { Link } from "@/i18n/navigation";
import { getRoomByOwner, listLiveRooms } from "@/lib/server/rooms";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";

export default async function LobbyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createServerSupabase();
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;
  const [rooms, ownerRoom] = await Promise.all([
    listLiveRooms(),
    user ? getRoomByOwner(user.id) : Promise.resolve(null),
  ]);

  return (
    <LobbyContent
      rooms={rooms}
      ownerRoom={ownerRoom}
      authenticated={Boolean(user)}
      locale={locale}
    />
  );
}

function LobbyContent({
  rooms,
  ownerRoom,
  authenticated,
  locale,
}: {
  rooms: Room[];
  ownerRoom: Room | null;
  authenticated: boolean;
  locale: string;
}) {
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

      {!authenticated ? (
        <section className="start-live-guest well">
          <p>{t("loginToStart")}</p>
          <NextLink className="btn btn-primary btn-small" href={`/login?next=${encodeURIComponent(`/${locale}`)}`}>
            {t("loginAction")}
          </NextLink>
        </section>
      ) : ownerRoom?.status === "live" ? (
        <section className="start-live-guest well">
          <div>
            <span className="section-label">{t("creatorLabel")}</span>
            <p>{t("alreadyLive")}</p>
          </div>
          <Link className="btn btn-primary btn-small" href={`/room/${ownerRoom.id}`}>
            {t("openOwnRoom")} <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </section>
      ) : (
        <StartLiveForm room={ownerRoom} />
      )}

      <section className="lobby-live" aria-labelledby="live-rooms-title">
        <div className="section-line">
          <h2 className="section-label" id="live-rooms-title">{t("liveRooms")}</h2>
          <span className="utility-text">{rooms.length}</span>
        </div>
        {rooms.length === 0 ? <p className="empty-state well">{t("empty")}</p> : (
          <div className="room-grid">
            {rooms.map((room) => <RoomCard key={room.id} room={room} />)}
          </div>
        )}
      </section>
    </main>
  );
}
