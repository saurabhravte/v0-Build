import Sandbox from "@e2b/code-interpreter";
import { inngest } from "./client";
import { prisma } from "@/lib/db";
import { MessageRole } from "@/generated/prisma/enums";

import { createState } from "@inngest/agent-kit"
import { gemini } from "@inngest/agent-kit";

export interface CodeAgentState {
  sandboxId: string,
  summary: string,
  files: Record<string, string>
}

export const processTask = inngest.createFunction(
  { id: "process-task", triggers: { event: "app/task.created" } },
  async ({ event, step }) => {
    const result = await step.run("handle-task", async () => {
      return { processed: true, id: event.data.id };
    });

    await step.sleep("pause", "1s");

    return { message: `Task ${event.data.id} complete`, result };
  }
);

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent", triggers: { event: "code-agent/run" } },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create({
        template: "agwj9f6y2wocdpps7omf"
      })

      return sandbox.sandboxId;
    })


    const previousMessages = await step.run("get-previous-messages", async () => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: event.data.projectId
        },
        orderBy: {
          createdAt: "asc"
        }
      })

      return messages.map((message) => ({
        type: "text" as const,
        role: message.role === MessageRole.ASSISTANT ? ("assistant" as const) : ("user" as const),
        content: message.content
      }))
    })


    const state = createState<CodeAgentState>(
      { sandboxId, summary: "", files: {} },
      { messages: previousMessages }
    )


    const geminiModel = gemini({
      model: "gemini-2.5-flash",
      step,
      apiKey: process.env.GEMINI_API_KEY
      defaultParameters: {
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 }
        }
      }
    } as Parameters<typeof gemini>[0]
    )


  }

)