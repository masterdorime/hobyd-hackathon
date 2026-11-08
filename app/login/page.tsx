import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { resolveLoginDestination } from "@/lib/login-redirect";
import en from "@/messages/en.json";
import id from "@/messages/id.json";

export const metadata: Metadata = {
  title: "Masuk — HOBYD",
};
type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requested = typeof params.next === "string" ? params.next : undefined;
  const destination = resolveLoginDestination(requested);
  const messages = destination.startsWith("/en") ? en.auth : id.auth;

  return (
    <main className="login-page app-world">
      <section className="login-panel raised" aria-labelledby="login-title">
        <Image src="/hobyd-logo.png" alt="HOBYD" width={92} height={38} style={{ width: "auto", height: "auto" }} priority />
        <span className="eyebrow">COLLECTOR ACCESS</span>
        <h1 id="login-title">{messages.title}</h1>
        <p>{messages.description}</p>
        <LoginForm destination={destination} messages={messages} />
        <Link className="login-back" href={destination}>{messages.back}</Link>
      </section>
    </main>
  );
}
