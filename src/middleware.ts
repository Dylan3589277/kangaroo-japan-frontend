import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … or end with `.svg`, `.png`, etc.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
