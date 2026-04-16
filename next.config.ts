import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazon.co.jp" },
      { protocol: "https", hostname: "**.mercari.com" },
      { protocol: "https", hostname: "**.rakuten.co.jp" },
      { protocol: "https", hostname: "**.shopping.yahoo.co.jp" },
      { protocol: "https", hostname: "**.auctions.yahoo.co.jp" },
    ],
  },
};

export default withNextIntl(nextConfig);
