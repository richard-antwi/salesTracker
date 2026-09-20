import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "work-and-pay",
  project: "work-and-pay",
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
