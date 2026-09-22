import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getServerEnv } from "@/lib/env";
import type { AIProvider, AIUsage, StructuredCV, JobAnalysis, MatchingResult, TailoredCV } from "@/lib/ai/provider";
import {
  structuredCVSchema,
  jobAnalysisSchema,
  matchingResultSchema,
  tailoredCVSchema,
  coverLetterResultSchema,
  applicationAnswersResultSchema,
} from "@/lib/ai/schemas";
import { buildCVExtractionPrompt } from "@/lib/ai/prompts/cv-extraction";
import { buildCvNormalizationPrompt } from "@/lib/ai/prompts/cv-normalize";
import { buildJobAnalysisPrompt } from "@/lib/ai/prompts/job-analysis";
import { buildEvidenceMatchingPrompt } from "@/lib/ai/prompts/evidence-matching";
import { buildCVTailoringPrompt } from "@/lib/ai/prompts/cv-tailoring";
import { buildCoverLetterPrompt } from "@/lib/ai/prompts/cover-letter";
import { buildApplicationAnswersPrompt } from "@/lib/ai/prompts/application-answers";

let cachedClient: Anthropic | undefined;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const env = getServerEnv();
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "AI_PROVIDER is set to \"claude\" but ANTHROPIC_API_KEY is not configured. Add it to .env.local (or Vercel's env vars) and redeploy."
    );
  }
  cachedClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cachedClient;
}

// temperature/top_p/top_k are rejected outright (400) on Claude's
// adaptive-thinking-always-on models — see the model-tier table in the
// claude-api skill. Only relevant if ANTHROPIC_MODEL is ever pointed at one
// of these instead of the Haiku 4.5 default; harmless to guard regardless.
const SAMPLING_UNSUPPORTED = new Set([
  "claude-opus-5",
  "claude-sonnet-5",
  "claude-fable-5-1",
  "claude-mythos-5-1",
  "claude-opus-4-8",
  "claude-opus-4-7",
]);

/**
 * Core primitive every pipeline stage builds on: calls Claude with a
 * schema-constrained response (output_config.format, enforced server-side —
 * see client.messages.parse), and retries once with a repair prompt in the
 * rare case parsing still comes back empty. Never returns unvalidated data
 * to a caller. Mirrors lib/ai/gemini.ts's generateStructuredJSON so the two
 * providers behave identically from the pipeline's point of view.
 */
export async function generateStructuredJSON<T>(params: {
  systemInstruction: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Left unset elsewhere to use Claude's own default; pass a lower value
   * for stages where consistent, plain professional writing matters more
   * than phrasing variety. Dropped automatically on models that reject it
   * (see SAMPLING_UNSUPPORTED). */
  temperature?: number;
}): Promise<{ data: T; usage: AIUsage }> {
  const env = getServerEnv();
  const client = getClient();
  const outputFormat = zodOutputFormat(params.schema);
  const includeTemperature =
    params.temperature !== undefined && !SAMPLING_UNSUPPORTED.has(env.ANTHROPIC_MODEL);

  const started = Date.now();
  const attempt = (prompt: string) =>
    client.messages.parse({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 8192,
      system: params.systemInstruction,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: outputFormat },
      ...(includeTemperature ? { temperature: params.temperature } : {}),
    });

  let message = await attempt(params.prompt);

  if (message.parsed_output == null) {
    const repairPrompt = [
      params.prompt,
      "",
      "Your previous response could not be parsed against the required schema.",
      "Return content matching the schema exactly.",
    ].join("\n");
    message = await attempt(repairPrompt);
  }

  if (message.parsed_output == null) {
    throw new Error("Claude returned unparseable output after one repair attempt.");
  }

  const usage: AIUsage = {
    inputTokens: message.usage.input_tokens ?? null,
    outputTokens: message.usage.output_tokens ?? null,
    durationMs: Date.now() - started,
  };

  return { data: message.parsed_output, usage };
}

export class ClaudeProvider implements AIProvider {
  async extractCV(rawText: string): Promise<{ data: StructuredCV; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildCVExtractionPrompt(rawText);
    return generateStructuredJSON({ systemInstruction, prompt, schema: structuredCVSchema });
  }

  async normalizeCV(cv: StructuredCV): Promise<{ data: StructuredCV; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildCvNormalizationPrompt(JSON.stringify(cv));
    // Pure mechanical cleanup, not creative writing — keep this close to
    // deterministic so it doesn't drift into rephrasing content.
    return generateStructuredJSON({
      systemInstruction,
      prompt,
      schema: structuredCVSchema,
      temperature: 0.2,
    });
  }

  async analyseJob(jobDescription: string): Promise<{ data: JobAnalysis; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildJobAnalysisPrompt(jobDescription);
    return generateStructuredJSON({ systemInstruction, prompt, schema: jobAnalysisSchema });
  }

  async matchEvidence(
    cv: StructuredCV,
    job: JobAnalysis
  ): Promise<{ data: MatchingResult; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildEvidenceMatchingPrompt(
      JSON.stringify(cv),
      JSON.stringify(job)
    );
    return generateStructuredJSON({ systemInstruction, prompt, schema: matchingResultSchema });
  }

  async generateTailoredCV(
    cv: StructuredCV,
    job: JobAnalysis,
    matching: MatchingResult
  ): Promise<{ data: TailoredCV; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildCVTailoringPrompt(
      JSON.stringify(cv),
      JSON.stringify(job),
      JSON.stringify(matching)
    );
    // Lower than Claude's default: this is professional CV copy, not
    // creative writing — favour consistent, plain, evidence-grounded
    // phrasing over stylistic variety.
    return generateStructuredJSON({
      systemInstruction,
      prompt,
      schema: tailoredCVSchema,
      temperature: 0.35,
    });
  }

  async generateCoverLetter(
    cv: StructuredCV,
    job: JobAnalysis,
    tailoredCV: TailoredCV,
    hiringManagerName?: string | null
  ): Promise<{ data: string; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildCoverLetterPrompt(
      JSON.stringify(cv),
      JSON.stringify(job),
      JSON.stringify(tailoredCV),
      hiringManagerName
    );
    const { data, usage } = await generateStructuredJSON({
      systemInstruction,
      prompt,
      schema: coverLetterResultSchema,
    });
    return { data: data.coverLetter, usage };
  }

  async generateApplicationAnswers(
    cv: StructuredCV,
    job: JobAnalysis,
    questions: string[]
  ): Promise<{ data: Array<{ question: string; answer: string }>; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildApplicationAnswersPrompt(
      JSON.stringify(cv),
      JSON.stringify(job),
      questions
    );
    const { data, usage } = await generateStructuredJSON({
      systemInstruction,
      prompt,
      schema: applicationAnswersResultSchema,
    });
    return { data: data.answers, usage };
  }
}
