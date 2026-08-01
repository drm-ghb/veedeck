import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/p/", "/client/", "/panel-glowny/"],
    },
    sitemap: `${process.env.NEXTAUTH_URL ?? "https://app.veedeck.com"}/sitemap.xml`,
  };
}
