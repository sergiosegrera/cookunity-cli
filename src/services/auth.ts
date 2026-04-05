import { AUTH_BASE_URL, AUTH_CLIENT_ID, AUTH_REALM } from "../constants.ts";
import type { AuthTokens } from "../types.ts";

const REDIRECT_URI = "https://www.cookunity.com";

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
    await this.authenticate();
    return this.tokens?.access_token;
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
  }
}
