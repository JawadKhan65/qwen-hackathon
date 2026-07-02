import WorkflowBuilderClient from "@/components/WorkflowBuilderClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ workflow_id: string }>;
}) {
  const { workflow_id } = await params;
  const session = await getServerSession(authOptions);
  return <WorkflowBuilderClient workflowId={workflow_id} session={session} />;
}
