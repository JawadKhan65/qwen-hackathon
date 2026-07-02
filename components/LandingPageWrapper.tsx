"use client";

import dynamicImport from "next/dynamic";

const LandingPageClient = dynamicImport(() => import("@/components/LandingPageClient"), {
  ssr: false,
});

export default function LandingPageWrapper({ session }: { session: any }) {
  return <LandingPageClient session={session} />;
}
