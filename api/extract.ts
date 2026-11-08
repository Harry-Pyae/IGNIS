/** POST /api/extract — LLM Job C (§7.6). Curator-only. Returns a DRAFT; never writes. */
import { sanitizeDraft } from '../src/lib/extract.js';
import { ExtractDraftSchema, ExtractRequestSchema } from '../src/lib/types.js';
import { json, llmUnavailable, readJson, requireCurator, route } from '../src/server/http.js';
import { completeJson, LlmUnavailableError } from '../src/server/llm.js';
import { EXTRACT_SYSTEM } from '../src/server/prompts.js';

export const POST = route(async (req) => {
  const denied = requireCurator(req);
  if (denied) return denied;
  const { data, response } = await readJson(req, ExtractRequestSchema);
  if (response) return response;

  try {
    const result = await completeJson({
      system: EXTRACT_SYSTEM,
      user: `EXCERPT:\n${data.text}`,
      // Allowlisted fields only: verified_by / publication / media keys are stripped by the schema.
      schema: ExtractDraftSchema,
      temperature: 0.2,
      timeoutMs: 15_000,
    });
    const { draft, dropped } = sanitizeDraft(result.data, data.text);
    return json({ draft, dropped, provider: result.provider });
  } catch (e) {
    if (e instanceof LlmUnavailableError) return llmUnavailable(req, e, 'Extraction is unavailable — use manual entry');
    throw e;
  }
});
