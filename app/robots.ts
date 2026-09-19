import type { MetadataRoute } from "next";

const SITE_URL = "https://hire.swayam.space";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/sign-in", "/sign-up"],
      disallow: ["/dashboard", "/onboarding", "/studio", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
