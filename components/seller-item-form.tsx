"use client";

import { useTranslations } from "next-intl";

export function SellerItemForm() {
  const t = useTranslations("item");

  return (
    <section className="seller-panel raised" aria-labelledby="seller-form-title">
      <div className="seller-panel-heading">
        <div>
          <span className="section-label">SELLER CONTROL</span>
          <h2 id="seller-form-title">{t("createTitle")}</h2>
        </div>
        <button className="btn btn-primary btn-small" type="button" disabled>{t("goLive")}</button>
      </div>
      <form className="seller-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          <span>{t("titleLabel")}</span>
          <input type="text" placeholder={t("titlePlaceholder")} maxLength={120} disabled />
        </label>
        <label>
          <span>{t("startPriceLabel")}</span>
          <input type="number" min={1} step={1} inputMode="numeric" placeholder="1500000" disabled />
        </label>
        <label className="seller-file-input">
          <span>{t("imageLabel")}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled />
          <small>{t("imageHelp")}</small>
        </label>
        <button className="btn btn-secondary" type="submit" disabled>{t("createAction")}</button>
      </form>
      <p className="form-note" role="note">{t("formPreview")}</p>
    </section>
  );
}
