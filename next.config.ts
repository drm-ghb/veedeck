import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Deny embedding in iframes (clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Legacy XSS filter (belt-and-suspenders)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Limit referrer information sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser feature access
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content Security Policy
  // Note: 'unsafe-inline' and 'unsafe-eval' are required by Next.js / Tailwind / tldraw.
  // Tighten further once a nonce-based CSP approach is feasible.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://utfs.io https:",
      "media-src 'self' blob: https://utfs.io",
      "connect-src 'self' https: wss: blob:",
      "font-src 'self' data:",
      "frame-src 'self' https://utfs.io",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/**", "./node_modules/@prisma/client/**"],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Required for @imgly/background-removal (WASM + module workers) in production builds
  webpack: (config: { experiments?: Record<string, unknown> }) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
};

export default nextConfig;
