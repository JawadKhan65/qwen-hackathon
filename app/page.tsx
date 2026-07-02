import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LandingPageWrapper from "@/components/LandingPageWrapper";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  return <LandingPageWrapper session={session} />;
}
