import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
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
import { buildJobAnalysisPrompt } from "@/lib/ai/prompts/job-analysis";
import { buildEvidenceMatchingPrompt } from "@/lib/ai/prompts/evidence-matching";
import { buildCVTailoringPrompt } from "@/lib/ai/prompts/cv-tailoring";
import { buildCoverLetterPrompt } from "@/lib/ai/prompts/cover-letter";
import { buildApplicationAnswersPrompt } from "@/lib/ai/prompts/application-answers";

let cachedClient: GoogleGenerativeAI | undefined;

function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  const env = getServerEnv();
  cachedClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return cachedClient;
}

/**
 * Core primitive every pipeline stage builds on: calls Gemini in JSON mode,
 * validates the response against a Zod schema, and retries once with a
 * repair prompt if parsing/validation fails. Never returns unvalidated data
 * to a caller.
 */
export async function generateStructuredJSON<T>(params: {
  systemInstruction: string;
  prompt: string;
  schema: z.ZodType<T>;
}): Promise<{ data: T; usage: AIUsage }> {
  const env = getServerEnv();
  const model = getClient().getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: params.systemInstruction,
    generationConfig: { responseMimeType: "application/json" },
  });

  const started = Date.now();
  const attempt = async (prompt: string) => model.generateContent(prompt);

  let result = await attempt(params.prompt);
  let parsed = safeParseJSON(result.response.text());
  let validated = parsed.success ? params.schema.safeParse(parsed.data) : undefined;

  if (!validated?.success) {
    const repairPrompt = [
      params.prompt,
      "",
      "Your previous response was not valid JSON matching the required schema.",
      "Return ONLY valid JSON matching the schema — no markdown fences, no commentary.",
    ].join("\n");
    result = await attempt(repairPrompt);
    parsed = safeParseJSON(result.response.text());
    validated = parsed.success ? params.schema.safeParse(parsed.data) : undefined;
  }

  if (!validated?.success) {
    throw new Error("Gemini returned invalid JSON after one repair attempt.");
  }

  const usage: AIUsage = {
    inputTokens: result.response.usageMetadata?.promptTokenCount ?? null,
    outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? null,
    durationMs: Date.now() - started,
  };

  return { data: validated.data, usage };
}

function safeParseJSON(text: string): { success: true; data: unknown } | { success: false } {
  try {
    return { success: true, data: JSON.parse(text) };
  } catch {
    return { success: false };
  }
}

export class GeminiProvider implements AIProvider {
  async extractCV(rawText: string): Promise<{ data: StructuredCV; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildCVExtractionPrompt(rawText);
    return generateStructuredJSON({ systemInstruction, prompt, schema: structuredCVSchema });
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
    return generateStructuredJSON({ systemInstruction, prompt, schema: tailoredCVSchema });
  }

  async generateCoverLetter(
    cv: StructuredCV,
    job: JobAnalysis,
    tailoredCV: TailoredCV
  ): Promise<{ data: string; usage: AIUsage }> {
    const { systemInstruction, prompt } = buildCoverLetterPrompt(
      JSON.stringify(cv),
      JSON.stringify(job),
      JSON.stringify(tailoredCV)
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
