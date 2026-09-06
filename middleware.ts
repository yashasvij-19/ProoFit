import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isProtectedApi =
    pathname.startsWith("/api/criteria") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/analyze") ||
    pathname.startsWith("/api/admin/");

  if (!isAdminPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  const cookie = request.cookies.get("proofit_admin")?.value;
  if (password && cookie === password) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/criteria/:path*",
    "/api/criteria",
    "/api/settings/:path*",
    "/api/settings",
    "/api/analyze/:path*",
    "/api/analyze",
    "/api/admin/:path*",
  ],
};
