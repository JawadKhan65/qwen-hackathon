import type { AgentNodeData } from "@/components/WorkflowBuilder";

type NodeStatusProps = {
  status?: AgentNodeData["status"];
};

const styles = {
  idle: "bg-slate-300",
  running: "bg-amber-400",
  done: "bg-emerald-500",
  error: "bg-red-500",
} satisfies Record<NonNullable<AgentNodeData["status"]>, string>;

export default function NodeStatus({ status = "idle" }: NodeStatusProps) {
  return (
    <span
      className={`h-2.5 w-2.5 rounded-full shadow-sm ${styles[status]}`}
      title={`Status: ${status}`}
    />
  );
}
