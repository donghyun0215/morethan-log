import type { NextApiRequest, NextApiResponse } from "next";

function getDeviceType(ua: string): string {
  const l = ua.toLowerCase();

  if (l.includes("bot") || l.includes("spider") || l.includes("crawler")) {
    return "Bot / Crawler";
  }
  if (l.includes("ipad") || l.includes("tablet")) {
    return "Tablet";
  }
  if (
    l.includes("mobile") ||
    l.includes("iphone") ||
    (l.includes("android") && !l.includes("tablet"))
  ) {
    return "Mobile";
  }
  return "Desktop";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

  // IP (Vercel: x-forwarded-for is best)
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "Unknown";

  const ua = (req.headers["user-agent"] as string) || "Unknown";
  const deviceType = getDeviceType(ua);

  const referer = (req.headers.referer as string) || "Unknown";

  const time = new Date().toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
  });

  // ===== GEO LOOKUP (ipapi.co) =====
  let country = "Unknown";
  let city = "Unknown";
  let mapUrl = "N/A";

  try {
    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    const geo = await geoRes.json();

    if (geo && !geo.error) {
      if (geo.country_name) country = geo.country_name;
      if (geo.city) city = geo.city;
      if (geo.latitude && geo.longitude) {
        mapUrl = `https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`;
      }
    }
  } catch (e) {
    console.error("Geo lookup failed:", e);
  }

  const text = encodeURIComponent(
    `👀 New Visitor\n` +
      `Time: ${time}\n` +
      `IP: ${ip}\n` +
      `Location: ${country} - ${city}\n` +
      `Map: ${mapUrl}\n` +
      `Device: ${deviceType}\n` +
      `Page: ${referer}\n` +
      `UA: ${ua}`
  );

  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${text}`
  );

  return res.status(200).json({ ok: true });
}
