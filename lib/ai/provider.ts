/**
 * AI provider abstraction. Application code (server actions, admin actions)
 * should depend on this interface, never on `lib/ai/gemini.ts` directly, so
 * swapping or adding a provider later only touches this file plus one new
 * implementation module.
 *
 * Data shapes are defined once, as Zod schemas, in lib/ai/schemas.ts — these
 * types are inferred from there so validation and types can't drift apart.
 */

import type {
  StructuredCV,
  JobAnalysis,
  MatchingResult,
  TailoredCV,
} from "@/lib/ai/schemas";

export type {
  StructuredCV,
  JobAnalysis,
  MatchStatus,
  EvidenceMatchItem,
  MatchingResult,
  TruthGuardFlag,
  TailoredCV,
} from "@/lib/ai/schemas";

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
}

export interface AIProvider {
  extractCV(rawText: string): Promise<{ data: StructuredCV; usage: AIUsage }>;
  analyseJob(jobDescription: string): Promise<{ data: JobAnalysis; usage: AIUsage }>;
  matchEvidence(
    cv: StructuredCV,
    job: JobAnalysis
  ): Promise<{ data: MatchingResult; usage: AIUsage }>;
  generateTailoredCV(
    cv: StructuredCV,
    job: JobAnalysis,
    matching: MatchingResult
  ): Promise<{ data: TailoredCV; usage: AIUsage }>;
  generateCoverLetter(
    cv: StructuredCV,
    job: JobAnalysis,
    tailoredCV: TailoredCV
  ): Promise<{ data: string; usage: AIUsage }>;
  generateApplicationAnswers(
    cv: StructuredCV,
    job: JobAnalysis,
    questions: string[]
  ): Promise<{ data: Array<{ question: string; answer: string }>; usage: AIUsage }>;
}

export async function getAIProvider(): Promise<AIProvider> {
  const provider = process.env.AI_PROVIDER ?? "gemini";
  switch (provider) {
    case "gemini": {
      // Dynamic import so a missing GEMINI_API_KEY only breaks callers that
      // actually need it, not every module that imports this file.
      const { GeminiProvider } = await import("@/lib/ai/gemini");
      return new GeminiProvider();
    }
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}
