"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, ChatMessageWithName } from "@/lib/types";

export function ChatPanel({
  roomId,
  authenticated,
  loginHref,
  live,
}: {
  roomId: string;
  authenticated: boolean;
  loginHref: string;
  live: boolean;
}) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessageWithName[]>([]);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  function receive(message: ChatMessageWithName) {
    setMessages((current) => current.some((item) => item.id === message.id)
      ? current
      : [...current, message].slice(-60));
  }

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/chat`);
        if (!response.ok) return;
        const initial = await response.json() as ChatMessageWithName[];
        if (!cancelled) setMessages(initial.reverse());
      } catch {
        // Chat remains an isolated enhancement; bidding does not depend on it.
      }
    })();

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        void (async () => {
          const message = payload.new as ChatMessage;
          const { data } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", message.user_id)
            .single();
          if (!cancelled) receive({ ...message, profile_name: data?.name ?? "Collector" });
        })().catch(() => undefined);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [authenticated, roomId]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !body.trim()) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? t("rateLimited") : t("failed"));
        return;
      }
      receive(await response.json() as ChatMessageWithName);
      setBody("");
    } catch {
      setError(t("failed"));
    } finally {
      setPending(false);
    }
  }

  if (!authenticated) {
    return (
      <section className="room-chat raised">
        <div className="chat-login well">
          <p>{t("loginRequired")}</p>
          <NextLink className="btn btn-primary btn-small" href={loginHref}>{t("loginAction")}</NextLink>
        </div>
      </section>
    );
  }

  return (
    <section className="room-chat raised" aria-labelledby="chat-heading">
      <div className="chat-heading">
        <h2 id="chat-heading">{t("title")}</h2>
        <span className="utility-text">{t("public")}</span>
      </div>
      <div className="chat-log well" ref={logRef} role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? <p className="muted">{t("empty")}</p> : messages.map((message) => (
          <p className="chat-message" key={message.id}>
            <strong>{message.profile_name}</strong>
            <span>{message.body}</span>
          </p>
        ))}
      </div>
      <form className="chat-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-message">{t("placeholder")}</label>
        <input
          id="chat-message"
          name="message"
          type="text"
          maxLength={280}
          autoComplete="off"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={live ? t("placeholder") : t("closed")}
          disabled={!live || pending}
        />
        <button className="btn btn-primary btn-small" type="submit" disabled={!live || pending || !body.trim()}>
          {pending ? t("sending") : t("send")}
        </button>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
