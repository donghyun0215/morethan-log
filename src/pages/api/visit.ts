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

function getOS(ua: string): string {
  const l = ua.toLowerCase();
  if (l.includes("windows")) return "Windows";
  if (l.includes("mac os") || l.includes("macintosh")) return "macOS";
  if (l.includes("iphone") || l.includes("ios")) return "iOS";
  if (l.includes("android")) return "Android";
  if (l.includes("linux")) return "Linux";
  return "Unknown OS";
}

function getBrowser(ua: string): string {
  const l = ua.toLowerCase();
  if (l.includes("edg/")) return "Edge";
  if (l.includes("chrome")) return "Chrome";
  if (l.includes("safari") && !l.includes("chrome")) return "Safari";
  if (l.includes("firefox")) return "Firefox";
  if (l.includes("opr/") || l.includes("opera")) return "Opera";
  return "Unknown Browser";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const IPDATA_KEY = process.env.IPDATA_API_KEY;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Missing TELEGRAM env vars");
    return res.status(500).json({ ok: false });
  }

  // 1) IP
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "Unknown";

  // 2) UA + Device / OS / Browser
  const ua = (req.headers["user-agent"] as string) || "Unknown";
  const deviceType = getDeviceType(ua);
  const os = getOS(ua);
  const browser = getBrowser(ua);

  // 3) Page (referrer = 현재 페이지 URL)
  const pageUrl = (req.headers.referer as string) || "Unknown";

  // 4) Time (싱가폴 기준)
  const time = new Date().toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
  });

  // 5) First-time / Visit count (쿠키 기반, 브라우저별)
  const cookies = req.cookies || {};
  const prevCount = cookies.visit_count ? parseInt(cookies.visit_count, 10) || 0 : 0;
  const visitCount = prevCount + 1;
  const firstTime = prevCount === 0;

  // 새 쿠키 세팅 (1년 유지)
  res.setHeader(
    "Set-Cookie",
    `visit_count=${visitCount}; Max-Age=31536000; Path=/; SameSite=Lax`
  );

  // 6) Geo / ISP / VPN / Proxy / TOR / ASN / Timezone (ipdata 사용)
  let country = "Unknown";
  let region = "Unknown";
  let city = "Unknown";
  let mapUrl = "N/A";
  let timezone = "Unknown";
  let isp = "Unknown";
  let asn = "Unknown";
  let networkType = "Unknown";
  let vpn = "Unknown";
  let proxy = "Unknown";
  let tor = "Unknown";

  if (IPDATA_KEY && ip !== "Unknown" && !ip.startsWith("::1")) {
    try {
      const geoRes = await fetch(
        `https://api.ipdata.co/${ip}?api-key=${IPDATA_KEY}`
      );
      const geo: any = await geoRes.json();

      if (!geo.error) {
        country = geo.country_name || "Unknown";
        region = geo.region || "Unknown";
        city = geo.city || "Unknown";

        const lat = geo.latitude;
        const lon = geo.longitude;
        if (lat && lon) {
          mapUrl = `https://www.google.com/maps?q=${lat},${lon}`;
        }

        timezone = geo.time_zone?.name || "Unknown";

        isp =
          geo.asn?.name ||
          geo.organisation ||
          geo.company?.name ||
          "Unknown";

        asn = geo.asn?.asn || "Unknown";
        networkType = geo.asn?.type || geo.company?.type || "Unknown";

        // threat 정보 (VPN / proxy / tor)
        const threat = geo.threat || {};
        vpn = threat.is_anonymous_vpn
          ? "Yes (anonymous VPN)"
          : threat.is_vpn
          ? "Yes"
          : "No / Unknown";
        proxy = threat.is_proxy ? "Yes" : "No / Unknown";
        tor = threat.is_tor ? "Yes" : "No / Unknown";
      }
    } catch (e) {
      console.error("Geo / IP intelligence lookup failed:", e);
    }
  }

  // 7) Telegram message
  const lines = [
    "👀 New Visitor",
    `Time: ${time}`,
    `IP: ${ip}`,
    `Location: ${country} / ${region} / ${city}`,
    `Map: ${mapUrl}`,
    `Timezone: ${timezone}`,
    `ISP: ${isp}`,
    `ASN: ${asn}`,
    `Network type: ${networkType}`, // hosting / business / isp 등
    `VPN: ${vpn}`,
    `Proxy: ${proxy}`,
    `TOR: ${tor}`,
    `Device: ${deviceType} (${os} / ${browser})`,
    `First-time: ${firstTime ? "Yes" : "No"} (visit #${visitCount})`,
    `Page: ${pageUrl}`,
    `UA: ${ua}`,
  ];

  const message = lines.join("\n");

  const url =
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage` +
    `?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`;

  await fetch(url);

  return res.status(200).json({ ok: true });
}
