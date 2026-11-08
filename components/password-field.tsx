"use client";

import { useId, useState } from "react";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  describedBy,
  showLabel,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  autoComplete: string;
  placeholder?: string;
  describedBy?: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <div className="password-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-control">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-describedby={describedBy}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.75" />
            {visible ? <path d="m4 20 16-16" /> : null}
          </svg>
        </button>
      </div>
    </div>
  );
}
