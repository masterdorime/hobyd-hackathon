import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="page-shell win-shell">
      <section className="win-panel raised" aria-labelledby="forbidden-title">
        <span className="eyebrow">403 — ACCESS DENIED</span>
        <h1 id="forbidden-title">Bukan order kamu.</h1>
        <p className="win-description">Halaman checkout hanya tersedia untuk pemenang lelang terkait. This checkout belongs to another winner.</p>
        <Link className="btn btn-primary" href="/id">Kembali ke lobby</Link>
      </section>
    </main>
  );
}
