// src/routes/api/visit/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge"; // fast, cheap

export async function GET(req: Request) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

  // Get visitor IP
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "Unknown IP";

  // Timestamp
  const time = new Date().toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
  });

  const text = encodeURIComponent(`👀 *New Visitor Alert!*\n\nTime: ${time}\nIP: ${ip}`);

  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${text}&parse_mode=Markdown`
  );

  return NextResponse.json({ ok: true });
}
