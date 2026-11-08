import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { RoomCategory } from "@/lib/room-categories";
import { RoomCategoryMessageKeys } from "@/lib/room-categories";
import type { Room } from "@/lib/types";

export function categoryLabel(category: RoomCategory | null, translate: (key: string) => string) {
  return category ? translate(RoomCategoryMessageKeys[category]) : null;
}

export function RoomCard({ room }: { room: Room }) {
  const t = useTranslations("lobby");
  const common = useTranslations("common");
  const category = useTranslations("categories");

  return (
    <article className="room-card raised" aria-labelledby={`room-${room.id}`}>
      <div className="room-thumb">
        {room.thumbnail_url ? (
          <Image src={room.thumbnail_url} alt="" width={480} height={270} unoptimized />
        ) : (
          <span className="room-thumb-fallback" aria-hidden="true">
            {room.title.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className="room-card-topline">
        <span className="status-live">
          <span className="status-dot" aria-hidden="true" />
          {room.status === "live" ? common("live") : room.status.toUpperCase()}
        </span>
        <span className="utility-text">{categoryLabel(room.category, category)}</span>
      </div>
      <div>
        <h2 id={`room-${room.id}`}>{room.title}</h2>
        <p className="room-seller">{room.seller_name}</p>
      </div>
      <div className="room-card-bottom">
        <span className="muted">{t("videoAndBids")}</span>
        <Link className="btn btn-primary btn-small" href={`/room/${room.id}`}>
          {t("enterRoom")}
          <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
    </article>
  );
}
