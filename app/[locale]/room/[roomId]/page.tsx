import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

import { BidFeed } from "@/components/bid-feed";
import { ItemPanel } from "@/components/item-panel";
import { LiveVideo } from "@/components/live-video";
import { SellerItemForm } from "@/components/seller-item-form";
import { demoBids, demoItem, demoRoom } from "@/lib/demo-data";

export const instant = false;

type RoomPageProps = { params: Promise<{ locale: string; roomId: string }> };

export default async function RoomPage({ params }: RoomPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoomPreview />;
}

function RoomPreview() {
  const room = useTranslations("room");
  const common = useTranslations("common");

  return (
    <main className="page-shell page-shell-room">
      <section className="room-title-row">
        <div>
          <span className="eyebrow">{common("preview")}</span>
          <h1>{demoRoom.title}</h1>
          <p>{room("hostedBy", { seller: demoRoom.seller_name })}</p>
        </div>
        <span className="status-live"><span className="status-dot" />{common("live")}</span>
      </section>
      <div className="live-layout">
        <div className="stream-column">
          <LiveVideo sellerName={demoRoom.seller_name} itemTitle={demoItem.title} />
          <BidFeed bids={demoBids} />
        </div>
        <ItemPanel item={demoItem} bids={demoBids} previewSeconds={8} />
      </div>
      <SellerItemForm />
    </main>
  );
}
