import type { Metadata } from "next";
import Image from "next/image";

import { SignupForm } from "@/components/signup-form";
import { resolveLoginDestination } from "@/lib/login-redirect";
import en from "@/messages/en.json";
import id from "@/messages/id.json";

export const metadata: Metadata = {
  title: "Daftar — HOBYD",
};

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const requested = typeof params.next === "string" ? params.next : undefined;
  const destination = resolveLoginDestination(requested);
  const messages = destination.startsWith("/en") ? en.auth : id.auth;

  return (
    <main className="login-page app-world">
      <section className="login-panel raised" aria-labelledby="signup-title">
        <Image src="/hobyd-logo.png" alt="HOBYD" width={92} height={38} style={{ width: "auto", height: "auto" }} priority />
        <span className="eyebrow">COLLECTOR ACCESS</span>
        <h1 id="signup-title">{messages.signupTitle}</h1>
        <p>{messages.signupDescription}</p>
        <SignupForm destination={destination} messages={messages} />
      </section>
    </main>
  );
}
