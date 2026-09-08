import { headers } from "next/headers";

type ClientPrincipal = {
  claims?: Array<{ typ: string; val: string }>;
  userDetails?: string;
};

export async function getUserEmail(): Promise<string | null> {
  const requestHeaders = await headers();
  const encodedPrincipal = requestHeaders.get("x-ms-client-principal");

  if (encodedPrincipal) {
    try {
      const principal = JSON.parse(
        Buffer.from(encodedPrincipal, "base64").toString("utf8"),
      ) as ClientPrincipal;
      const emailClaim = principal.claims?.find(({ typ }) =>
        ["preferred_username", "email", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"].includes(typ),
      );
      return (emailClaim?.val ?? principal.userDetails ?? "").trim().toLowerCase() || null;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return process.env.DEV_USER_EMAIL?.trim().toLowerCase() || null;
  }

  return null;
}
