import type { OCRResult } from '../types/expense'

// Stub for future Claude Vision / OpenAI Vision integration.
// Swap this implementation without touching any other file.
export async function runVisionAI(_image: Blob): Promise<OCRResult> {
  throw new Error('Vision AI not configured. Set API key in Settings to enable.')
}
