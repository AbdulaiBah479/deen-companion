'use client'

// On-device AI: an open-source language model that runs entirely in the user's browser via WebGPU
// (library: @mlc-ai/web-llm, Apache-2.0). No server, no API key, no quota — so it can never "run out of tokens".
// The model files are downloaded once from the model hub and cached by the browser; nothing the user types leaves the device.
//
// It is optional: it needs a WebGPU-capable browser/device and a one-time download (hundreds of MB), and small models
// are less capable than cloud models. The server still retrieves the Quran/hadith sources and builds the prompt.

import type { MLCEngine } from '@mlc-ai/web-llm'

export type LocalTier = 'fast' | 'balanced'

export const LOCAL_MODELS: Record<LocalTier, { label: string; size: string; f16: string; f32: string }> = {
  fast: { label: 'Fast', size: '≈ 0.8 GB', f16: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', f32: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' },
  balanced: { label: 'Balanced', size: '≈ 2 GB', f16: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', f32: 'Llama-3.2-3B-Instruct-q4f32_1-MLC' },
}

export type GpuSupport = { ok: boolean; f16: boolean; reason?: string }

export async function detectWebGPU(): Promise<GpuSupport> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> } }).gpu
  if (!gpu) return { ok: false, f16: false, reason: 'This browser has no WebGPU (try recent Chrome or Edge on a computer or recent phone).' }
  try {
    const adapter = await gpu.requestAdapter()
    if (!adapter) return { ok: false, f16: false, reason: 'No compatible graphics adapter was found.' }
    return { ok: true, f16: adapter.features.has('shader-f16') }
  } catch {
    return { ok: false, f16: false, reason: 'WebGPU could not be started on this device.' }
  }
}

export const modelIdFor = (tier: LocalTier, f16: boolean) => (f16 ? LOCAL_MODELS[tier].f16 : LOCAL_MODELS[tier].f32)

export async function isModelCached(tier: LocalTier, f16: boolean): Promise<boolean> {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm')
    return await hasModelInCache(modelIdFor(tier, f16))
  } catch {
    return false
  }
}

export async function removeModel(tier: LocalTier, f16: boolean) {
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm')
  await deleteModelAllInfoInCache(modelIdFor(tier, f16))
  if (current?.modelId === modelIdFor(tier, f16)) unloadLocalModel()
}

let current: { modelId: string; engine: Promise<MLCEngine> } | null = null

// Loads (downloading on first use) and returns the engine. Reuses a loaded engine for the same model.
export function loadLocalModel(tier: LocalTier, f16: boolean, onProgress?: (fraction: number, text: string) => void): Promise<MLCEngine> {
  const modelId = modelIdFor(tier, f16)
  if (current?.modelId === modelId) return current.engine
  const engine = import('@mlc-ai/web-llm')
    .then(({ CreateMLCEngine }) =>
      CreateMLCEngine(modelId, { initProgressCallback: (p) => onProgress?.(p.progress, p.text) })
    )
    .catch((e) => {
      current = null
      throw e
    })
  current = { modelId, engine }
  return engine
}

export function unloadLocalModel() {
  const c = current
  current = null
  c?.engine.then((e) => e.unload()).catch(() => {})
}

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string }

// Streams a reply token by token. Resolves with the full text.
export async function localChat(engine: MLCEngine, system: string, history: { role: 'user' | 'assistant'; content: string }[], onToken: (textSoFar: string) => void): Promise<string> {
  const messages: ChatMsg[] = [{ role: 'system', content: system }, ...history]
  const stream = await engine.chat.completions.create({ messages, stream: true, temperature: 0.4, max_tokens: 700 })
  let text = ''
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta?.content ?? ''
    onToken(text)
  }
  return text.trim()
}
