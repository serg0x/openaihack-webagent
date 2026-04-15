"use client";

import { useState } from "react";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-[var(--line-strong)] bg-white/80 px-3 py-1.5 text-xs font-medium tracking-[0.16em] text-[var(--ink-soft)] uppercase transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
