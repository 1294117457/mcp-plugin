import type { Context } from '@deepseek-ai/cordis'
import type { NodeConfig } from '../../types.js'

export interface NodeExecutor {
  run(node: NodeConfig, args: unknown): Promise<{ result: string }>
}

export function createNodeExecutor(ctx: Context): NodeExecutor {
  return {
    async run(node, args) {
      const userContent = typeof args === 'string'
        ? args
        : JSON.stringify(args, null, 2)

      const llmConfig = node.llm ?? getDefaultLlmConfig(ctx)

      try {
        const prepared = await (ctx as any).llm.prepareCall(
          {
            provider: llmConfig.provider,
            model: llmConfig.model,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens,
          },
          AbortSignal.timeout(120_000),
        )

        const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
        const assembler = new BlockAssembler()

        const stream = prepared.stream({
          provider: llmConfig.provider,
          model: llmConfig.model,
          system: node.systemPrompt,
          messages: [{ role: 'user', content: [{ type: 'text', text: userContent }] }],
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens,
        })

        for await (const chunk of stream) {
          assembler.push(chunk)
        }

        const blocks = assembler.blocks()
        const textParts = blocks
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
        const result = textParts.join('\n') || '(no output)'

        return { result }
      } catch (e: any) {
        return { result: `[Node execution error] ${e?.message ?? String(e)}` }
      }
    },
  }
}

function getDefaultLlmConfig(ctx: Context): { provider: string; model: string } {
  try {
    const sel = (ctx as any).agentDefaultModel?.currentSelection?.()
    if (sel) return { provider: sel.provider, model: sel.model }
  } catch { /* empty */ }
  return { provider: 'deepseek-official', model: 'deepseek-chat' }
}
