import "server-only";

import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

// Backwards-compatible named export used by existing cron code.
export const resend = {
  emails: {
    send: (...args: Parameters<Resend["emails"]["send"]>) =>
      getResend().emails.send(...args),
  },
};
