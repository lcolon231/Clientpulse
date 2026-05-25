import "server-only";

import { Resend } from "resend";

import { serverEnv } from "@/lib/env";

export const resend = new Resend(serverEnv.RESEND_API_KEY);
