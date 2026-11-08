"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PasswordField } from "@/components/password-field";
import { createClient } from "@/lib/supabase/client";
import { validateSignup } from "@/lib/validation/signup";

import type { LoginMessages } from "./login-form";

export interface SignupMessages extends LoginMessages {
  signupTitle: string;
  signupDescription: string;
  nameLabel: string;
  namePlaceholder: string;
  confirmPassword: string;
  passwordMismatch: string;
  passwordMin: string;
  createAccount: string;
  creating: string;
  haveAccount: string;
  signIn: string;
  confirmEmail: string;
  accountFailed: string;
}

export function SignupForm({
  destination,
  messages,
}: {
  destination: string;
  messages: SignupMessages;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validateSignup({ name, email, password, confirmation });
    if (invalid) {
      const message = invalid === "confirmation"
        ? messages.passwordMismatch
        : invalid === "name" ? messages.nameLabel : messages[invalid];
      setError(message);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const account = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmation }),
      });
      if (!account.ok) {
        const payload = await account.json().catch(() => null) as { error?: string } | null;
        setError(payload?.error === "EMAIL_EXISTS" ? messages.accountFailed : messages.unavailable);
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(messages.unavailable);
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
    <form className="login-form" onSubmit={signup} noValidate>
      <div className="password-field">
        <label htmlFor="signup-name">{messages.nameLabel}</label>
        <div className="password-control">
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            required
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={messages.namePlaceholder}
          />
        </div>
      </div>
      <div className="password-field">
        <label htmlFor="signup-email">{messages.email}</label>
        <div className="password-control">
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={messages.emailPlaceholder}
          />
        </div>
      </div>
      <PasswordField
        label={messages.password}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        placeholder={messages.passwordPlaceholder}
        describedBy="signup-password-help"
        showLabel={messages.showPassword}
        hideLabel={messages.hidePassword}
      />
      <PasswordField
        label={messages.confirmPassword}
        value={confirmation}
        onChange={setConfirmation}
        autoComplete="new-password"
        placeholder={messages.confirmPassword}
        showLabel={messages.showPassword}
        hideLabel={messages.hidePassword}
      />
      <p className="form-note" id="signup-password-help">{messages.passwordMin}</p>
      {error ? <p className="login-error" role="alert">{error}</p> : null}
      <button className="btn btn-primary login-submit" type="submit" disabled={pending}>
        {pending ? messages.creating : messages.createAccount}
      </button>
      <p className="auth-switch">
        {messages.haveAccount} <a href={`/login?next=${encodeURIComponent(destination)}`}>{messages.signIn}</a>
      </p>
    </form>
  );
}
