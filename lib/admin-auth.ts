import { cookies } from "next/headers";

export const ADMIN_COOKIE = "proofit_admin";

export function isAdminAuthenticated() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return cookies().get(ADMIN_COOKIE)?.value === password;
}
