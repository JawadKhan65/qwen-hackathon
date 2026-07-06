import { runArtDirector } from "@/lib/agents/art-director";
import { runCopywriter } from "@/lib/agents/copywriter";
import { runScriptwriter } from "@/lib/agents/scriptwriter";
import { runSeoStrategist } from "@/lib/agents/seo-strategist";
import { runSocietyRoundtable } from "@/lib/agents/society";
import { decideMotionStyle, startVideoRender, resolveVideoRender } from "@/lib/agents/video-director";
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

// ─── INPUT GUARDRAILS ────────────────────────────────────────────────────────

type GuardrailViolation = { nodeId: string; message: string };

function validateInputs(nodes: PipelineNode[], edges: PipelineEdge[]): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  for (const node of nodes) {
    if (node.type === "productImage") {
      const imageUrl = node.data?.imageUrl ?? node.data?.url;
      const hasDownstream = edges.some((e) => e.source === node.id);
      if (!imageUrl && hasDownstream) {
        violations.push({
          nodeId: node.id,
          message:
            "Product Image node is empty. Please upload a product image or paste an image URL before running the pipeline.",
        });
      }
    }

    if (node.type === "rawNotes") {
      const raw = node.data?.text ?? node.data?.notes;
      const text = typeof raw === "string" ? raw : undefined;
      const hasDownstream = edges.some((e) => e.source === node.id);
      if (!text?.trim() && hasDownstream) {
        violations.push({
          nodeId: node.id,
          message:
            "Raw Notes node is empty. Please add your product brief, audience details, or launch context before running.",
        });
      }
    }
  }

  return violations;
}

// ─── ZERO-COST HANDOFF MESSAGES ──────────────────────────────────────────────
// No extra API calls. Derived instantly from actual result data.

function buildHandoffMessage(
  fromNode: PipelineNode,
  toNode: PipelineNode,
  result: unknown,
): string {
  const from = fromNode.type ?? "agent";
  const to = toNode.type ?? "agent";
  const fromLabel = formatNodeTypeLabel(from);
  const toLabel = formatNodeTypeLabel(to);

  // Typed handoff messages based on known agent pairings
  if (from === "productImage" && to === "artDirector")
    return `> [Product Image → Art Director] Product image is in. I'm not decorating around it — I'm building the world where it already belongs.`;

  if (from === "productImage" && to === "seoStrategist")
    return `> [Product Image → SEO Strategist] Visual data is live. Category, attributes, and use-context signals are all readable — now I need to find the searches that actual buyer runs, not the obvious ones.`;

  if (from === "rawNotes" && to === "artDirector")
    return `> [Raw Notes → Art Director] Launch brief received. The positioning tells me exactly who I'm making this for — the image has to speak that language before a single word of copy exists.`;

  if (from === "rawNotes" && to === "seoStrategist")
    return `> [Raw Notes → SEO Strategist] Brand context landed. The positioning angle is clear — I need to map that to real search intent now, not just the product category keywords.`;

  if (from === "artDirector" && to === "videoDirector") {
    const hasImage = result && typeof result === "object" && "imageUrl" in (result as object);
    return `> [Art Director → Video Director] ${hasImage ? "Image generated — the scene is set." : "Creative direction locked."} Motion should feel inevitable here, not decorative. The product stays the hero.`;
  }

  if (from === "artDirector" && to === "copywriter")
    return `> [Art Director → Copywriter] Visual territory is locked. The image has a tone — match your words to it precisely. If it's restrained and premium, the copy cannot shout.`;

  if (from === "videoDirector" && to === "scriptwriter") {
    return `> [Video Director → Scriptwriter] Motion style is decided — pacing and energy level are in the rationale. Read it before writing a word. Write what the creator says out loud, not what they see on screen.`;
  }

  if (from === "copywriter" && to === "scriptwriter")
    return `> [Copywriter → Scriptwriter] Ad copy landed. The hook and CTA are the frame — now compress it into spoken word. Strip everything that doesn't survive being said at TikTok speed.`;

  // Generic fallback — still free, still instant
  const resultType =
    result && typeof result === "object" && "videoUrl" in (result as object)
      ? "video"
      : result && typeof result === "object" && "imageUrl" in (result as object)
        ? "image"
        : typeof result === "string"
          ? "text output"
          : "structured output";

  return `> [${fromLabel} → ${toLabel}] ${fromLabel} output ready (${resultType}). Passing context — read what came before you before you start.`;
}

// Live log helpers.

function formatNodeTypeLabel(type: string): string {
  const spaced = type.replace(/([A-Z])/g, " $1").trim();
  const capitalized = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return capitalized.replace(/\bSeo\b/g, "SEO");
}

function isStreamingTextNode(node: PipelineNode): boolean {
  return (
    node.type === "copywriter" ||
    node.type === "seoStrategist" ||
    node.type === "scriptwriter"
  );
}

function createSentenceLogEmitter(
  label: string,
  emit: (message: string) => void,
): { push: (chunk: string) => void; flush: () => void } {
  let buffer = "";

  const emitBuffered = (text: string) => {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed) {
      emit(`> [${label}] ${trimmed}`);
    }
  };

  return {
    push(chunk: string) {
      buffer = [buffer, chunk].filter(Boolean).join(" ");

      while (buffer.length > 0) {
        const match = buffer.match(/[.!?](?:\s|$)|\n/);
        if (!match || match.index === undefined) {
          break;
        }

        const end = match.index + match[0].length;
        emitBuffered(buffer.slice(0, end));
        buffer = buffer.slice(end);
      }
    },
    flush() {
      emitBuffered(buffer);
      buffer = "";
    },
  };
}

function nodeThoughts(node: PipelineNode): string[] {
  const thoughts: Record<string, string[]> = {
    artDirector: [
      `> [Art Director] Reading the brief — I need a lifestyle scene where this product is the undeniable hero, not a prop in someone else's story.`,
      `> [Art Director] Sending the scene specification to DashScope. Lighting, staging, and spatial hierarchy have to earn their place in the final video.`,
    ],
    videoDirector: [
      `> [Video Director] Pulling the energy signature of this product from the brief — is this a fast-cut or a slow reveal? The pacing has to match what we're actually selling.`,
      `> [Video Director] Motion style locked. The Scriptwriter needs the exact rhythm before writing a single word — I'm packaging that handoff now.`,
    ],
  };

  return thoughts[node.type ?? ""] ?? [];
}

// Thought ticker for non-streaming media/director calls.
async function withLiveThoughts<T>(
  emit: (message: string) => void,
  thoughts: string[],
  task: Promise<T>,
): Promise<T> {
  let index = 0;
  const interval = setInterval(() => {
    if (index >= thoughts.length) return;
    emit(thoughts[index]);
    index += 1;
  }, 2800);

  try {
    return await task;
  } finally {
    clearInterval(interval);
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatResultForContext(result: unknown): string {
  if (typeof result === "string") {
    if (/^data:image\//.test(result)) return "[User-uploaded product image data]";
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
  if (typeof prompt === "string") return prompt;
  return node.type ? getDefaultPrompt(node.type as AgentNodeType) : "";
}

function inboundNodeIds(nodeId: string, edges: PipelineEdge[]): string[] {
  return edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
}

function outboundNodeIds(nodeId: string, edges: PipelineEdge[]): string[] {
  return edges.filter((edge) => edge.source === nodeId).map((edge) => edge.target);
}

function firstMediaUrl(results: PipelineResultMap, nodeIds: string[]): string | undefined {
  for (const nodeId of [...nodeIds].reverse()) {
    const result = results[nodeId];
    if (typeof result === "string" && (/^https?:\/\//.test(result) || /^data:image\//.test(result))) {
      return result;
    }
    if (result && typeof result === "object") {
      const record = result as Record<string, unknown>;
      const url = record.imageUrl ?? record.videoUrl ?? record.url;
      if (typeof url === "string") return url;
    }
  }
  return undefined;
}

function extractBriefSections(brief: string, sections: string[]): string {
  if (!brief) return "";
  const lines = brief.split("\n");
  const result: string[] = [];
  let collecting = false;

  for (const line of lines) {
    const match = line.match(/^###\s+(.*)$/);
    if (match) {
      const title = match[1].trim();
      const matchesAny = sections.some((s) => title.toLowerCase().includes(s.toLowerCase()));
      if (matchesAny) {
        collecting = true;
        result.push(line);
      } else {
        collecting = false;
      }
    } else if (collecting) {
      result.push(line);
    }
  }

  return result.join("\n").trim() || brief;
}

function buildDependencyState(nodes: PipelineNode[], edges: PipelineEdge[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const pendingInbound = new Map(nodes.map((node) => [node.id, 0]));
  const outbound = new Map<string, string[]>(nodes.map((node) => [node.id, []]));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    pendingInbound.set(edge.target, (pendingInbound.get(edge.target) ?? 0) + 1);
    outbound.get(edge.source)?.push(edge.target);
  }

  return { pendingInbound, outbound };
}

/**
 * Runs a node. Text agents receive a streaming `onChunk` callback that pipes
 * LLM tokens directly into the society log — no extra API calls.
 */
async function runNode(
  node: PipelineNode,
  results: PipelineResultMap,
  inboundSources: string[],
  societyBrief: string,
  onChunk: (chunk: string) => void,
): Promise<unknown> {
  const context = contextFromResults(results, inboundSources);
  const prompt = promptFromNode(node);

  let relevantBrief = societyBrief;
  if (node.type === "artDirector") {
    relevantBrief = extractBriefSections(societyBrief, ["Image Style", "Consensus Strategy"]);
  } else if (node.type === "videoDirector") {
    relevantBrief = extractBriefSections(societyBrief, ["Video Style", "Image Style"]);
  } else if (node.type === "copywriter") {
    relevantBrief = extractBriefSections(societyBrief, ["Copy Strategy", "Audience & Positioning"]);
  } else if (node.type === "seoStrategist") {
    relevantBrief = extractBriefSections(societyBrief, ["SEO Strategy", "Audience & Positioning"]);
  } else if (node.type === "scriptwriter") {
    relevantBrief = extractBriefSections(societyBrief, ["Video Style", "Copy Strategy"]);
  }

  const combinedContext = [
    "Shared society-calibrated launch brief guidelines:",
    relevantBrief,
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
      return decideMotionStyle(combinedContext);
    case "copywriter":
      return runCopywriter(combinedContext || JSON.stringify(node.data ?? {}), onChunk);
    case "seoStrategist":
      return runSeoStrategist(combinedContext || JSON.stringify(node.data ?? {}), onChunk);
    case "scriptwriter":
      return runScriptwriter(combinedContext || JSON.stringify(node.data ?? {}), onChunk);
    case "productImage":
      return node.data?.imageUrl ?? node.data?.url ?? null;
    case "rawNotes":
      return node.data?.text ?? node.data?.notes ?? null;
    default:
      return { skipped: true, reason: `No runner for node type ${node.type ?? "unknown"}` };
  }
}

// ─── MAIN POST HANDLER ────────────────────────────────────────────────────────

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
      const backgroundTasks: Array<{ promise: Promise<void>; isSettled: () => boolean }> = [];

      try {
        // ── GUARDRAIL CHECK ──────────────────────────────────────────────
        const violations = validateInputs(nodes, edges);
        if (violations.length > 0) {
          for (const v of violations) {
            sendLog(controller, encoder, `> ⛔ [Guardrail] ${v.message}`);
            sendEvent(controller, encoder, { nodeId: v.nodeId, status: "error", error: v.message });
          }
          sendEvent(controller, encoder, {
            status: "error",
            error: "Pipeline blocked: one or more input nodes are empty. Fill them in and run again.",
          });
          controller.close();
          return;
        }

        // ── TOPOLOGY ─────────────────────────────────────────────────────
        const orderedNodes = getExecutionOrder(nodes, edges);
        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        const { pendingInbound, outbound } = buildDependencyState(nodes, edges);
        let readyNodeIds = orderedNodes
          .filter((node) => (pendingInbound.get(node.id) ?? 0) === 0)
          .map((node) => node.id);
        const completedNodeIds = new Set<string>();
        let stoppedForError = false;

        sendLog(controller, encoder, "> [System] Graph topology resolved — execution order is deterministic from the dependency graph.");
        sendLog(
          controller,
          encoder,
          `> [System] ${orderedNodes.length} agent roles identified across ${edges.length} data connections. Assembling the society now.`,
        );
        sendLog(controller, encoder, "> [Society] Roundtable is assembling — seven specialists, one brief to agree on. This is where ambiguity dies.");

        // ── SOCIETY ROUNDTABLE ───────────────────────────────────────────
        const societyStartedAt = Date.now();
        const societyPlan = await runSocietyRoundtable({
          edges,
          nodes,
          onLog: (message) => sendLog(controller, encoder, message),
        });
        totalNodeDurationMs += Date.now() - societyStartedAt;
        executedAgents += 7;
        conflictResolutions +=
          societyPlan.brief.includes("conflict") || societyPlan.brief.includes("risk") ? 1 : 0;

        results.__society = {
          rationale: societyPlan.brief,
          critique: societyPlan.critique,
        };

        sendLog(controller, encoder, "> [Society] Consensus reached. Every downstream agent now runs from the same page — no contradictions, no creative drift.");

        // ── NODE EXECUTION WAVES ─────────────────────────────────────────
        while (readyNodeIds.length > 0 && !stoppedForError) {
          sendLog(
            controller,
            encoder,
            `> [System] Dispatching agents in parallel — ${readyNodeIds.join(", ")} are now running concurrently.`,
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
              const nodeType = node.type ?? "unknown";

              sendLog(
                controller,
                encoder,
                `> [${formatNodeTypeLabel(nodeType)}] Activated. I have ${inboundSources.length} upstream source${inboundSources.length === 1 ? "" : "s"} to read before I can start.`,
              );

              if (inboundSources.length > 1) {
                conflictResolutions += 1;
                sendLog(
                  controller,
                  encoder,
                  `> [${formatNodeTypeLabel(nodeType)}] Multiple inputs — I need to reconcile ${inboundSources.join(", ")} into a coherent picture before I proceed.`,
                );
              }

              sendEvent(controller, encoder, { nodeId: node.id, status: "running" });
              sendLog(
                controller,
                encoder,
                `> [${formatNodeTypeLabel(nodeType)}] Reading the consensus brief and my role context — building a clear picture before generating output.`,
              );
              // Streaming callback: preserves node-card SSE chunks and mirrors text-agent sentences into the society log.
              const logStream = isStreamingTextNode(node)
                ? createSentenceLogEmitter(formatNodeTypeLabel(nodeType), (message) =>
                    sendLog(controller, encoder, message),
                  )
                : null;

              const onChunk = (chunk: string) => {
                sendEvent(controller, encoder, {
                  nodeId: node.id,
                  status: "streaming",
                  chunk,
                });
                logStream?.push(chunk);
              };

              try {
                const nodeStartedAt = Date.now();
                const nodeTask = runNode(node, results, inboundSources, societyPlan.brief, onChunk);
                const thoughts = nodeThoughts(node);
                const result = isStreamingTextNode(node) || thoughts.length === 0
                  ? await nodeTask
                  : await withLiveThoughts(
                      (message) => sendLog(controller, encoder, message),
                      thoughts,
                      nodeTask,
                    );
                logStream?.flush();
                return {
                  nodeId,
                  ok: true as const,
                  result,
                  node,
                  durationMs: Date.now() - nodeStartedAt,
                };
              } catch (error) {
                logStream?.flush();
                const message = error instanceof Error ? error.message : "Unknown node error";
                return { nodeId, ok: false as const, error: message };
              }
            }),
          );

          const nextReadyNodeIds: string[] = [];

          for (const waveResult of waveResults) {
            if (!waveResult.ok) {
              stoppedForError = true;
              sendLog(controller, encoder, `> [${formatNodeTypeLabel(waveResult.nodeId)}] Something went wrong I can't recover from: ${waveResult.error}`);
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

            const downstreamIds = outboundNodeIds(waveResult.nodeId, edges);

            sendLog(
              controller,
              encoder,
              `> [${formatNodeTypeLabel(waveResult.nodeId)}] Done. Output passed to ${downstreamIds.length} downstream agent${downstreamIds.length === 1 ? "" : "s"}.`,
            );
            sendEvent(controller, encoder, {
              nodeId: waveResult.nodeId,
              status: "done",
              result: waveResult.result,
              data: waveResult.result,
            });

            if (waveResult.node && waveResult.node.type === "videoDirector") {
              const videoNode = waveResult.node;
              const inboundSources = inboundNodeIds(videoNode.id, edges);
              const imageUrl = firstMediaUrl(results, inboundSources);
              if (imageUrl) {
                const prompt = promptFromNode(videoNode);
                const relevantBrief = extractBriefSections(societyPlan.brief, ["Video Style", "Image Style"]);
                const context = contextFromResults(results, inboundSources);
                const combinedContext = [
                  "Shared society-calibrated launch brief guidelines:",
                  relevantBrief,
                  "Role instruction:",
                  prompt,
                  "Inbound node context:",
                  context,
                ]
                  .filter(Boolean)
                  .join("\n\n");

                const renderPromise = (async () => {
                  const renderStartedAt = Date.now();
                  try {
                    sendLog(controller, encoder, `> [Video Director] Sending video synthesis request to DashScope — this runs in the background while downstream agents keep working.`);
                    const taskId = await startVideoRender(imageUrl, combinedContext);
                    sendLog(controller, encoder, `> [Video Director] Task accepted (ID: ${taskId}). Polling for completion — the Scriptwriter doesn't need to wait for this.`);
                    const videoUrl = await resolveVideoRender(taskId);
                    const renderDurationMs = Date.now() - renderStartedAt;
                    sendLog(controller, encoder, `> [Video Director] Video is ready — ${renderDurationMs}ms from dispatch to final frame. Pushing URL to the timeline.`);
                    
                    totalNodeDurationMs += renderDurationMs;

                    const finalResult = {
                      ...(results[videoNode.id] as Record<string, unknown>),
                      videoUrl,
                    };
                    results[videoNode.id] = finalResult;

                    sendEvent(controller, encoder, {
                      nodeId: videoNode.id,
                      status: "done",
                      result: finalResult,
                      data: finalResult,
                    });
                  } catch (err) {
                    const renderDurationMs = Date.now() - renderStartedAt;
                    totalNodeDurationMs += renderDurationMs;
                    const errMsg = err instanceof Error ? err.message : "Background render failed";
                    sendLog(controller, encoder, `> [Video Director] Background render didn't complete after ${renderDurationMs}ms: ${errMsg}. The rest of the pipeline already finished.`);
                    sendEvent(controller, encoder, {
                      nodeId: videoNode.id,
                      status: "error",
                      error: errMsg,
                    });
                  }
                })();
                let settled = false;
                const trackedPromise = renderPromise.finally(() => {
                  settled = true;
                });
                backgroundTasks.push({
                  promise: trackedPromise,
                  isSettled: () => settled,
                });
              } else {
                sendLog(controller, encoder, `> [Video Director] No lifestyle image found in upstream results — skipping video synthesis. Art Director output is needed first.`);
              }
            }

            // ── ZERO-COST HANDOFF MESSAGES ──────────────────────────────
            // Derived instantly from result data. No API call. No cost.
            if (waveResult.node) {
              for (const targetId of downstreamIds) {
                const targetNode = nodeMap.get(targetId);
                if (targetNode) {
                  sendLog(
                    controller,
                    encoder,
                    buildHandoffMessage(waveResult.node, targetNode, waveResult.result),
                  );
                }
              }
            }

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

        // Await all background video rendering tasks before calculating final stats and completing
        if (backgroundTasks.length > 0) {
          if (backgroundTasks.some((task) => !task.isSettled())) {
            sendLog(controller, encoder, `> [System] Awaiting background video rendering tasks to resolve...`);
          }
          await Promise.all(backgroundTasks.map((task) => task.promise));
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
          sendEvent(controller, encoder, { status: "complete", results, summary });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown pipeline error";
        sendLog(controller, encoder, `> [System] Pipeline error: ${message}`);
        sendEvent(controller, encoder, { status: "error", error: message });
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
