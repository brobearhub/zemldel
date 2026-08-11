import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isMaintenanceModeEnabled() {
  return process.env.MAINTENANCE_MODE === "true";
}

export function middleware(request: NextRequest) {
  if (!isMaintenanceModeEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/maintenance") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals and common static assets.
     * Why: maintenance page and its assets must still load when the flag is on.
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|site.webmanifest|zemledel_logo_light.svg|zemledel_logo_dark.svg).*)",
  ],
};
