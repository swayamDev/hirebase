import { auth } from "@clerk/nextjs/server";
import { anthropic } from "@ai-sdk/anthropic";
import { createMCPClient } from "@ai-sdk/mcp";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { sanityInsightsIntegration } from "@sanity/context/ai-sdk";
import { initialContextFor, orgScopedMcpUrl } from "@/lib/mcp";
import { buildSystemPrompt } from "@/lib/agent-prompt";
import { buildActionTools, buildClientTools } from "@/lib/agent-tools";
import { writeClient } from "@/lib/sanity/client";

export async function POST(req: Request) {
  const { userId, orgId, has } = await auth();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!orgId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!has({ feature: "ai_agent" })) {
    return Response.json({ error: "upgrade_required" }, { status: 403 });
  }

  const { messages, id: chatId }: { messages: UIMessage[]; id?: string } =
    await req.json();

  // The tenant groqFilter lives in this URL - built per request, never hoisted.
  const mcpClient = await createMCPClient({
    transport: {
      type: "http",
      url: orgScopedMcpUrl(orgId),
      headers: {
        Authorization: "Bearer " + process.env.SANITY_API_READ_TOKEN,
      },
    },
  });

  // Streams can end via finish, error, or client abort - close on all three.
  let closed = false;
  const closeMcp = async () => {
    if (closed) return;
    closed = true;
    await mcpClient.close().catch(() => {});
  };

  try {
    const allTools = await mcpClient.tools();
    // The initial-context tool is redundant - its content is already in the
    // system prompt via initialContextFor().
    const { initial_context: _omit, ...mcpTools } = allTools;
    const tools = {
      ...mcpTools,
      // Action tools wrap the same server actions the UI calls - the agent
      // inherits requireOrg/assertOwned/plan caps, one enforcement path.
      ...buildActionTools(),
      // Client-side tools: executed in the browser via onToolCall.
      ...buildClientTools(),
    };
    const result = streamText({
      model: anthropic("claude-sonnet-5"),
      system: buildSystemPrompt(await initialContextFor(orgId)),
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(20),
      onFinish: closeMcp,
      onError: closeMcp,
      onAbort: closeMcp,
      // Conversation Insights: transcripts land in Studio's Insights dashboard.
      experimental_telemetry: {
        isEnabled: true,
        integrations: [
          sanityInsightsIntegration({
            client: writeClient,
            agentId: "hirebase",
            threadId: chatId ?? `org-${orgId}`,
          }),
        ],
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (e) {
    await closeMcp();
    throw e;
  }
}
