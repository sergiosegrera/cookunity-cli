import { AUTH_BASE_URL, AUTH_CLIENT_ID, AUTH_REALM } from "../constants.ts";
import type { AuthTokens } from "../types.ts";

const REDIRECT_URI = "https://www.cookunity.com";
const TOKEN_CACHE_PATH = `${Bun.env.HOME}/.cookunity/tokens.json`;

function fetchWithJar(
  jar: Map<string, string>,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (jar.size > 0) {
    headers.set("Cookie", [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "));
  }

  const response = fetch(url, { ...init, headers });

  response.then((res) => {
    for (const header of res.headers.getSetCookie()) {
      const c = Bun.Cookie.parse(header);
      jar.set(c.name, c.value);
    }
  });

  return response;
}

async function readCachedTokens(): Promise<AuthTokens | null> {
  try {
    const file = Bun.file(TOKEN_CACHE_PATH);
    if (!(await file.exists())) return null;
    return (await file.json()) as AuthTokens;
  } catch {
    return null;
  }
}

async function writeCachedTokens(tokens: AuthTokens): Promise<void> {
  try {
    await Bun.write(TOKEN_CACHE_PATH, JSON.stringify(tokens));
    Bun.spawnSync(["chmod", "600", TOKEN_CACHE_PATH]);
  } catch {
    // non-fatal — cache write failure shouldn't break the CLI
  }
}

export class CookUnityAuth {
  private email: string;
  private password: string;
  private tokens: AuthTokens | null = null;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  async getAccessToken(): Promise<string> {
    if (this.tokens && this.isTokenValid(this.tokens)) {
      return this.tokens.access_token;
    }

    // Try file cache before doing a full auth round-trip
    if (!this.tokens) {
      const cached = await readCachedTokens();
      if (cached) {
        if (this.isTokenValid(cached)) {
          this.tokens = cached;
          return this.tokens.access_token;
        }
        if (cached.refresh_token) {
          try {
            await this.refresh(cached.refresh_token);
            return this.tokens!.access_token;
          } catch {
            // refresh failed — fall through to full auth
          }
        }
      }
    }

    await this.authenticate();
    return this.tokens!.access_token;
  }

  private isTokenValid(tokens: AuthTokens): boolean {
    return Date.now() < tokens.expires_at - 60000;
  }

  private async authenticate(): Promise<void> {
    const jar = new Map<string, string>();

    // Step 1: Get login ticket
    const r1 = await fetchWithJar(jar, `${AUTH_BASE_URL}/co/authenticate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.cookunity.com",
      },
      body: JSON.stringify({
        client_id: AUTH_CLIENT_ID,
        credential_type: "http://auth0.com/oauth/grant-type/password-realm",
        username: this.email,
        password: this.password,
        realm: AUTH_REALM,
      }),
    });

    if (!r1.ok) {
      const data = (await r1.json().catch(() => ({}))) as Record<string, unknown>;
      const msg = String(data.error_description ?? data.message ?? `HTTP ${r1.status}`);
      throw new Error(`Authentication failed: ${msg}`);
    }

    const r1Data = (await r1.json()) as { login_ticket?: string };
    const loginTicket = r1Data.login_ticket;
    if (!loginTicket) throw new Error("Authentication failed: no login ticket");

    // Step 2: Follow Auth0 authorize redirects to get the auth code
    const params = new URLSearchParams({
      client_id: AUTH_CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: "openid profile email",
      realm: AUTH_REALM,
      login_ticket: loginTicket,
    });

    let currentUrl = `${AUTH_BASE_URL}/authorize?${params}`;
    let code: string | null = null;
    for (let i = 0; i < 5; i++) {
      const r = await fetchWithJar(jar, currentUrl, { redirect: "manual" });
      const loc = r.headers.get("location");
      if (!loc)
        throw new Error("Authentication failed: no redirect location in authorize flow");
      const resolved = loc.startsWith("http") ? loc : `${AUTH_BASE_URL}${loc}`;
      const parsed = new URL(resolved);
      code = parsed.searchParams.get("code");
      if (code) break;
      currentUrl = resolved;
    }
    if (!code)
      throw new Error("Authentication failed: could not obtain authorization code");

    // Step 3: Exchange code for tokens
    const r3 = await fetchWithJar(jar, `${AUTH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: AUTH_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!r3.ok) {
      const data = (await r3.json().catch(() => ({}))) as Record<string, unknown>;
      const msg = String(data.error_description ?? data.message ?? `HTTP ${r3.status}`);
      throw new Error(`Authentication failed: ${msg}`);
    }

    const tokenData = (await r3.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!tokenData.access_token)
      throw new Error("Authentication failed: no access token in response");

    this.tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in ?? 86400) * 1000,
    };
    await writeCachedTokens(this.tokens);
  }

  private async refresh(refreshToken: string): Promise<void> {
    const res = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: AUTH_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`Refresh failed: HTTP ${res.status}`);

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) throw new Error("Refresh failed: no access token");

    this.tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at: Date.now() + (data.expires_in ?? 86400) * 1000,
    };
    await writeCachedTokens(this.tokens);
  }
}
