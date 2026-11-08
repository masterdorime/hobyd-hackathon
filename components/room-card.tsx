import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Room } from "@/lib/types";

export function RoomCard({ room }: { room: Room }) {
  const t = useTranslations("lobby");
  const common = useTranslations("common");

  return (
    <article className="room-card raised" aria-labelledby={`room-${room.id}`}>
      <div className="room-card-topline">
        <span className="status-live">
          <span className="status-dot" aria-hidden="true" />
          {room.status === "live" ? common("live") : room.status.toUpperCase()}
        </span>
        <span className="utility-text">ROOM / LIVE AUCTION</span>
      </div>
      <div>
        <h2 id={`room-${room.id}`}>{room.title}</h2>
        <p className="room-seller">{room.seller_name}</p>
      </div>
      <div className="room-card-bottom">
        <span className="muted">Video + realtime bidding</span>
        <Link className="btn btn-primary btn-small" href={`/room/${room.id}`}>
          {t("enterRoom")}
          <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </article>
  );
}
