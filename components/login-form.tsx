"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export interface LoginMessages {
  email: string;
  password: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  submit: string;
  pending: string;
  loginFailed: string;
  unavailable: string;
}

export function LoginForm({
  destination,
  messages,
}: {
  destination: string;
  messages: LoginMessages;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(messages.loginFailed);
        return;
      }

      router.replace(destination);
      router.refresh();
    } catch {
      setError(messages.unavailable);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="login-email">{messages.email}</label>
      <input
        id="login-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={messages.emailPlaceholder}
      />
      <label htmlFor="login-password">{messages.password}</label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        required
        minLength={6}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={messages.passwordPlaceholder}
      />
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button className="btn btn-primary login-submit" type="submit" disabled={pending}>
        {pending ? messages.pending : messages.submit}
      </button>
    </form>
  );
}
