/**
 * File: next.config.ts
 *
 * Purpose:
 * - Allow dev server assets + HMR over LAN origins (prevents blocked _next resources).
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    // tvoje LAN adresy (dej tam obě, ať se to nechytá za IP)
    "http://192.168.68.107:3000",
    "http://192.168.68.109:3000",
  ],
};

export default nextConfig;
