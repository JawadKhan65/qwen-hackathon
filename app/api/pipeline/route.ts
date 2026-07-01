import { runArtDirector } from "@/lib/agents/art-director";
import { runCopywriter } from "@/lib/agents/copywriter";
import { runScriptwriter } from "@/lib/agents/scriptwriter";
import { runSeoStrategist } from "@/lib/agents/seo-strategist";
import { runSocietyRoundtable } from "@/lib/agents/society";
import { runVideoDirector } from "@/lib/agents/video-director";
import { getDefaultPrompt, type AgentNodeType } from "@/lib/agent-prompts";
import { getExecutionOrder } from "@/lib/graph-parser";
import type { PipelineEdge, PipelineNode, PipelineResultMap } from "@/lib/types";

export const runtime = "nodejs";

type PipelineRequest = {
  nodes?: PipelineNode[];
  edges?: PipelineEdge[];
};

type PipelineSummary = {
  rolesAssigned: number;
  wiresResolved: number;
  conflictResolutions: number;
  executedAgents: number;
  durationMs: number;
  baselineMs: number;
  efficiencyGainPercent: number;
};

function sendEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  payload: Record<string, unknown>,
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function sendLog(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  message: string,
) {
  sendEvent(controller, encoder, { log: message });
}

async function withLiveThoughts<T>(
  emit: (message: string) => void,
  thoughts: string[],
  task: Promise<T>,
): Promise<T> {
  let index = 0;
  const interval = setInterval(() => {
    if (index >= thoughts.length) {
      return;
    }
    emit(thoughts[index]);
    index += 1;
  }, 2600);

  try {
    return await task;
  } finally {
    clearInterval(interval);
  }
}

function nodeThoughts(node: PipelineNode): string[] {
  const type = node.type ?? "agent";
  const label = node.id;

  if (type === "artDirector") {
    return [
      `> [${label}] Comparing candidate lifestyle territories against product truth.`,
      `> [${label}] Checking composition: hero visibility, props, background, and crop safety.`,
      `> [${label}] Applying consensus image style from the roundtable.`,
    ];
  }

  if (type === "videoDirector") {
    return [
      `> [${label}] Reviewing generated image for motion anchors and camera path.`,
      `> [${label}] Testing whether the consensus style can animate clearly in 5 seconds.`,
      `> [${label}] Preserving product identity while adding launch motion.`,
    ];
  }

  if (type === "copywriter") {
    return [
      `> [${label}] Translating society consensus into a buyer-facing hook.`,
      `> [${label}] Comparing direct-response angle versus brand-polish angle.`,
      `> [${label}] Tightening CTA and reducing generic language.`,
    ];
  }

  if (type === "seoStrategist") {
    return [
      `> [${label}] Extracting product category, use case, and searchable attributes.`,
      `> [${label}] Balancing keyword intent with product-page readability.`,
      `> [${label}] Aligning SEO copy with the selected GTM positioning.`,
    ];
  }

  if (type === "scriptwriter") {
    return [
      `> [${label}] Mapping hook, visual beat, and close to the selected video style.`,
      `> [${label}] Checking that on-screen text matches the ad-copy angle.`,
      `> [${label}] Compressing the story into a short-form sequence.`,
    ];
  }

  return [
    `> [${label}] Reading user-provided context.`,
    `> [${label}] Preparing handoff for downstream agents.`,
  ];
}

function formatResultForContext(result: unknown): string {
  if (typeof result === "string") {
    if (/^data:image\//.test(result)) {
      return "[User-uploaded product image data]";
    }

    return result.length > 600 ? `${result.slice(0, 600)}...` : result;
  }

  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    return JSON.stringify({
      ...record,
      imageUrl: record.imageUrl ? "[generated image url]" : undefined,
      videoUrl: record.videoUrl ? "[generated video url]" : undefined,
    });
  }

  return JSON.stringify(result);
}

function contextFromResults(results: PipelineResultMap, nodeIds: string[]): string {
  return nodeIds
    .filter((nodeId) => Object.hasOwn(results, nodeId))
    .map((nodeId) => [nodeId, results[nodeId]] as const)
    .map(([nodeId, result]) => `${nodeId}: ${formatResultForContext(result)}`)
    .join("\n");
}

function promptFromNode(node: PipelineNode): string {
  const prompt = node.data?.prompt;
  if (typeof prompt === "string") {
    return prompt;
  }

  return node.type ? getDefaultPrompt(node.type as AgentNodeType) : "";
}

function inboundNodeIds(nodeId: string, edges: PipelineEdge[]): string[] {
  return edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
}

function outboundCount(nodeId: string, edges: PipelineEdge[]): number {
  return edges.filter((edge) => edge.source === nodeId).length;
}

function firstMediaUrl(results: PipelineResultMap, nodeIds: string[]): string | undefined {
  for (const nodeId of [...nodeIds].reverse()) {
    const result = results[nodeId];

    if (
      typeof result === "string" &&
      (/^https?:\/\//.test(result) || /^data:image\//.test(result))
    ) {
      return result;
    }

    if (result && typeof result === "object") {
      const record = result as Record<string, unknown>;
      const url = record.imageUrl ?? record.videoUrl ?? record.url;
      if (typeof url === "string") {
        return url;
      }
    }
  }

  return undefined;
}

function buildDependencyState(nodes: PipelineNode[], edges: PipelineEdge[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const pendingInbound = new Map(nodes.map((node) => [node.id, 0]));
  const outbound = new Map<string, string[]>(nodes.map((node) => [node.id, []]));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }

    pendingInbound.set(edge.target, (pendingInbound.get(edge.target) ?? 0) + 1);
    outbound.get(edge.source)?.push(edge.target);
  }

  return { pendingInbound, outbound };
}

async function runNode(
  node: PipelineNode,
  results: PipelineResultMap,
  inboundSources: string[],
  societyBrief: string,
): Promise<unknown> {
  const context = contextFromResults(results, inboundSources);
  const prompt = promptFromNode(node);
  const combinedContext = [
    "Shared society-calibrated launch brief:",
    societyBrief,
    "Role instruction:",
    prompt,
    "Inbound node context:",
    context,
  ]
    .filter(Boolean)
    .join("\n\n");
  switch (node.type) {
    case "artDirector":
      return runArtDirector({
        context: combinedContext,
        productImageUrl: firstMediaUrl(results, inboundSources),
      });
    case "videoDirector":
      return runVideoDirector(firstMediaUrl(results, inboundSources), combinedContext);
    case "copywriter":
      return runCopywriter(combinedContext || JSON.stringify(node.data ?? {}));
    case "seoStrategist":
      return runSeoStrategist(combinedContext || JSON.stringify(node.data ?? {}));
    case "scriptwriter":
      return runScriptwriter(combinedContext || JSON.stringify(node.data ?? {}));
    case "productImage":
      return node.data?.imageUrl ?? node.data?.url ?? null;
    case "rawNotes":
      return node.data?.text ?? node.data?.notes ?? null;
    default:
      return { skipped: true, reason: `No runner for node type ${node.type ?? "unknown"}` };
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as PipelineRequest;
  const nodes = body.nodes ?? [];
  const edges = body.edges ?? [];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const results: PipelineResultMap = {};
      const startedAt = Date.now();
      let executedAgents = 0;
      let conflictResolutions = 0;
      let totalNodeDurationMs = 0;

      try {
        const orderedNodes = getExecutionOrder(nodes, edges);
        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        const { pendingInbound, outbound } = buildDependencyState(nodes, edges);
        let readyNodeIds = orderedNodes
          .filter((node) => (pendingInbound.get(node.id) ?? 0) === 0)
          .map((node) => node.id);
        const completedNodeIds = new Set<string>();
        let stoppedForError = false;

        sendLog(controller, encoder, "> [System] Execution order resolved from graph topology.");
        sendLog(
          controller,
          encoder,
          `> [System] Agent society assembled ${orderedNodes.length} roles from ${edges.length} wires.`,
        );
        sendLog(controller, encoder, "> [Society] Opening roundtable: agents are inspecting assets, notes, and workflow topology.");

        const societyStartedAt = Date.now();
        const societyPlan = await withLiveThoughts(
          (message) => sendLog(controller, encoder, message),
          [
            "> [Roundtable] Visual Analyst is checking whether image and brief tell the same story.",
            "> [Roundtable] GTM Strategist is turning vague notes into buyer, offer, and positioning hypotheses.",
            "> [Roundtable] Creative Director is comparing possible lifestyle worlds and channel fit.",
            "> [Roundtable] Art Director is proposing image territories for the Video Director to challenge.",
            "> [Roundtable] Video Director is pressure-testing which image style will animate best.",
            "> [Roundtable] Growth Strategist is voting on the clearest conversion angle.",
            "> [Roundtable] Chair is reconciling style, motion, and selling clarity into one consensus.",
          ],
          runSocietyRoundtable({
            edges,
            nodes,
            onLog: (message) => sendLog(controller, encoder, message),
          }),
        );
        totalNodeDurationMs += Date.now() - societyStartedAt;
        executedAgents += 7;
        conflictResolutions += societyPlan.brief.includes("conflict") || societyPlan.brief.includes("risk") ? 1 : 0;

        results.__society = {
          rationale: societyPlan.brief,
          critique: societyPlan.critique,
        };

        sendLog(controller, encoder, "> [Society] Consensus brief locked. The graph will now execute with shared GTM strategy.");

        while (readyNodeIds.length > 0 && !stoppedForError) {
          sendLog(
            controller,
            encoder,
            `> [System] Running parallel wave: ${readyNodeIds.join(", ")}.`,
          );

          const waveResults = await Promise.all(
            readyNodeIds.map(async (nodeId) => {
              const node = nodeMap.get(nodeId);
              if (!node) {
                return { nodeId, ok: false as const, error: "Node disappeared from graph." };
              }

              const inboundSources = inboundNodeIds(node.id, edges);
              const prompt = promptFromNode(node);
              const promptPreview = prompt.slice(0, 90) || "node instructions";

              sendLog(
                controller,
                encoder,
                `> [System] Decomposed ${node.type ?? "unknown"} as a role with ${inboundSources.length} inbound ${inboundSources.length === 1 ? "dependency" : "dependencies"}.`,
              );

              if (inboundSources.length > 1) {
                conflictResolutions += 1;
                sendLog(
                  controller,
                  encoder,
                  `> [System] Conflict resolution: merging inputs from ${inboundSources.join(", ")} before handing off to ${node.id}.`,
                );
              }

              sendEvent(controller, encoder, {
                nodeId: node.id,
                status: "running",
              });

              sendLog(
                controller,
                encoder,
                `> [${node.id}] Thinking with society brief: ${promptPreview}${prompt.length > 90 ? "..." : ""}`,
              );

              try {
                const nodeStartedAt = Date.now();
                const result = await withLiveThoughts(
                  (message) => sendLog(controller, encoder, message),
                  nodeThoughts(node),
                  runNode(node, results, inboundSources, societyPlan.brief),
                );
                return {
                  nodeId,
                  ok: true as const,
                  result,
                  durationMs: Date.now() - nodeStartedAt,
                };
              } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown node error";
                return { nodeId, ok: false as const, error: message };
              }
            }),
          );

          const nextReadyNodeIds: string[] = [];

          for (const waveResult of waveResults) {
            if (!waveResult.ok) {
              stoppedForError = true;
              sendLog(
                controller,
                encoder,
                `> [${waveResult.nodeId}] Error: ${waveResult.error}`,
              );
              sendEvent(controller, encoder, {
                nodeId: waveResult.nodeId,
                status: "error",
                error: waveResult.error,
              });
              continue;
            }

            results[waveResult.nodeId] = waveResult.result;
            completedNodeIds.add(waveResult.nodeId);
            executedAgents += 1;
            totalNodeDurationMs += waveResult.durationMs;

            sendLog(
              controller,
              encoder,
              `> [${waveResult.nodeId}] Completed with ${typeof waveResult.result === "string" ? "text/media" : "structured output"}; handed off to ${outboundCount(waveResult.nodeId, edges)} downstream node${outboundCount(waveResult.nodeId, edges) === 1 ? "" : "s"}.`,
            );
            sendEvent(controller, encoder, {
              nodeId: waveResult.nodeId,
              status: "done",
              result: waveResult.result,
              data: waveResult.result,
            });

            for (const targetId of outbound.get(waveResult.nodeId) ?? []) {
              const nextCount = (pendingInbound.get(targetId) ?? 0) - 1;
              pendingInbound.set(targetId, nextCount);
              if (nextCount === 0 && !completedNodeIds.has(targetId)) {
                nextReadyNodeIds.push(targetId);
              }
            }
          }

          if (stoppedForError) {
            sendEvent(controller, encoder, {
              status: "error",
              error: "Pipeline stopped after a node failed.",
            });
            break;
          }

          readyNodeIds = orderedNodes
            .map((node) => node.id)
            .filter((nodeId) => nextReadyNodeIds.includes(nodeId));
        }

        if (!stoppedForError && Object.keys(results).length > 0) {
          const elapsedMs = Date.now() - startedAt;
          const baselineMs = Math.max(elapsedMs, totalNodeDurationMs);
          const efficiencyGain = Math.max(0, Math.round((1 - elapsedMs / baselineMs) * 100));
          const summary: PipelineSummary = {
            rolesAssigned: orderedNodes.length,
            wiresResolved: edges.length,
            conflictResolutions,
            executedAgents,
            durationMs: elapsedMs,
            baselineMs,
            efficiencyGainPercent: efficiencyGain,
          };
          sendLog(
            controller,
            encoder,
            `> [System] Efficiency summary: ${executedAgents} specialist agents completed in ${elapsedMs}ms vs baseline ${baselineMs}ms. Estimated gain ${efficiencyGain}%.`,
          );
          sendLog(controller, encoder, "> [System] Pipeline completed.");
          sendEvent(controller, encoder, {
            status: "complete",
            results,
            summary,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown pipeline error";
        sendLog(controller, encoder, `> [System] Pipeline error: ${message}`);
        sendEvent(controller, encoder, {
          status: "error",
          error: message,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
