export { auth as middleware } from "@/auth";

export const config = {
  // Run on everything except NextAuth's own routes, static assets, images,
  // and files with an extension.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
