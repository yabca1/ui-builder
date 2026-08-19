import { NextResponse } from "next/server";

const blockedForwardHeaders = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
]);

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const private172Match = host.match(/^172\.(\d+)\./);
  if (private172Match && Number(private172Match[1]) >= 16 && Number(private172Match[1]) <= 31) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
}

function sanitizeHeaders(input: unknown): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return headers;

  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.toLowerCase();
    if (blockedForwardHeaders.has(normalizedKey)) continue;
    if (value === undefined || value === null) continue;
    headers[key] = String(value);
  }
  return headers;
}

export async function POST(req: Request) {
  try {
    const { url, method, headers, body } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Missing target URL" }, { status: 400 });
    }

    const targetUrl = new URL(url);
    if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
      return NextResponse.json({ error: "Only HTTP and HTTPS API URLs are allowed" }, { status: 400 });
    }
    if (targetUrl.username || targetUrl.password) {
      return NextResponse.json({ error: "Credentials in proxy URLs are not allowed" }, { status: 400 });
    }

    const allowedHosts = (process.env.API_PROXY_ALLOWED_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (allowedHosts.length > 0 && !allowedHosts.includes(targetUrl.hostname.toLowerCase())) {
      return NextResponse.json({ error: "API host is not allowed by proxy policy" }, { status: 403 });
    }

    if (process.env.NODE_ENV !== "development" && isPrivateHostname(targetUrl.hostname)) {
      return NextResponse.json({ error: "Private network API URLs are not allowed" }, { status: 403 });
    }

    const requestMethod = String(method || "GET").toUpperCase();
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(requestMethod)) {
      return NextResponse.json({ error: "Unsupported proxy method" }, { status: 400 });
    }

    const fetchOptions: RequestInit = {
      method: requestMethod,
      headers: sanitizeHeaders(headers),
      redirect: "manual",
    };

    if (body && ["POST", "PUT", "PATCH"].includes(requestMethod)) {
      fetchOptions.body = typeof body === "object" ? JSON.stringify(body) : String(body);
    }

    const response = await fetch(targetUrl.toString(), fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
    } else {
      data = await response.text();
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    return NextResponse.json({
      status: response.status,
      headers: responseHeaders,
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Proxy connection failed" }, { status: 500 });
  }
}
