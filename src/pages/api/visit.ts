// src/pages/api/visit.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Data = { ok: boolean };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return res.status(500).json({ ok: false });
  }

  // Basic info about visitor
  const ip =
    (req.headers["x-forwarded-for"] as string) ||
    req.socket.remoteAddress ||
    "Unknown IP";

  const userAgent = req.headers["user-agent"] || "Unknown UA";
  const referer = req.headers.referer || "Unknown page";

  const time = new Date().toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
  });

  const text = encodeURIComponent(
    `👀 New Visitor\n` +
      `Time: ${time}\n` +
      `IP: ${ip}\n` +
      `Page: ${referer}\n` +
      `UA: ${userAgent}`
  );

  try {
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${text}`
    );
  } catch (e) {
    console.error("Failed to send Telegram message:", e);
    // don’t block the response just because Telegram failed
  }

  return res.status(200).json({ ok: true });
}
