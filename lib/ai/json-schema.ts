import "server-only";

import { z } from "zod";
import { SchemaType, type Schema } from "@google/generative-ai";

/**
 * Converts a Zod schema to the `Schema` shape Gemini's `responseSchema`
 * config expects (Google's own OpenAPI-subset format: uppercase `SchemaType`
 * enum values, no `$ref`/`additionalProperties`) via Zod v4's built-in
 * `z.toJSONSchema()` as an intermediate step.
 *
 * Without this, `responseMimeType: "application/json"` alone only forces
 * syntactically valid JSON — it does not constrain field names or shape, so
 * Gemini is free to invent its own (observed in practice: snake_case keys,
 * different nesting, missing fields) even when the prompt describes the
 * schema in prose. That produced 100% schema-validation failures on every
 * AI pipeline stage until this was added.
 */
export function zodToGeminiSchema(schema: z.ZodTypeAny): Schema {
  const raw = z.toJSONSchema(schema, { target: "draft-2020-12" });
  return convert(raw) as Schema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convert(node: any): unknown {
  if (node === null || node === undefined) return undefined;

  const types: string[] = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
  const nullable = types.includes("null");
  const primaryType = types.find((t) => t !== "null");

  const base: Record<string, unknown> = {};
  if (node.description) base.description = node.description;
  if (nullable) base.nullable = true;
  if (node.enum) base.enum = node.enum;

  switch (primaryType) {
    case "string":
      return { ...base, type: SchemaType.STRING };
    case "number":
      return { ...base, type: SchemaType.NUMBER, ...numericBounds(node) };
    case "integer":
      return { ...base, type: SchemaType.INTEGER, ...numericBounds(node) };
    case "boolean":
      return { ...base, type: SchemaType.BOOLEAN };
    case "array":
      return { ...base, type: SchemaType.ARRAY, items: convert(node.items) };
    case "object": {
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node.properties ?? {})) {
        properties[key] = convert(value);
      }
      return {
        ...base,
        type: SchemaType.OBJECT,
        properties,
        required: node.required ?? [],
      };
    }
    default:
      return { ...base, type: SchemaType.STRING };
  }
}

function numericBounds(node: { minimum?: number; maximum?: number }) {
  const bounds: Record<string, number> = {};
  if (typeof node.minimum === "number") bounds.minimum = node.minimum;
  if (typeof node.maximum === "number") bounds.maximum = node.maximum;
  return bounds;
}
