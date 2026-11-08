"use client";

import { useTranslations } from "next-intl";

export function LiveVideo({ sellerName, itemTitle }: { sellerName: string; itemTitle: string }) {
  const t = useTranslations("room");

  return (
    <section aria-labelledby="live-video-heading">
      <div className="section-line">
        <h2 className="section-label" id="live-video-heading">{t("sellerCamera")}</h2>
        <span className="status-live"><span className="status-dot" />{t("cameraOn")}</span>
      </div>
      <div className="video-housing raised">
        <div className="live-video">
          <div className="video-status">● {t("cameraOn")}</div>
          <div className="slab-object" aria-hidden="true">
            <div className="slab-label"><strong>HOBYD</strong><span>LIVE LOT</span></div>
            <div className="card-art">CHARIZARD<small>BASE SET</small></div>
          </div>
          <div className="video-foot">
            <strong>{sellerName} — Seller</strong>
            <span>{t("videoIsolated")}</span>
          </div>
          <span className="sr-only">{itemTitle}</span>
        </div>
      </div>
    </section>
  );
}
