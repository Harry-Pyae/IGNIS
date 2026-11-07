/** POST /api/extract — LLM Job C (§7.6). Curator-only. Returns a DRAFT; never writes. */
import { ExtractDraftSchema, ExtractRequestSchema } from '../src/lib/types.js';
import { apiError, json, readJson, requireCurator, route } from '../src/server/http.js';
import { completeJson, LlmUnavailableError } from '../src/server/llm.js';
import { EXTRACT_SYSTEM } from '../src/server/prompts.js';

export const POST = route(async (req) => {
  const denied = requireCurator(req);
  if (denied) return denied;
  const { data, response } = await readJson(req, ExtractRequestSchema);
  if (response) return response;

  try {
    // TODO(part2): add the one worked BASS example to the prompt (§7.6).
    const result = await completeJson({
      system: EXTRACT_SYSTEM,
      user: `${data.source_url ? `SOURCE URL: ${data.source_url}\n\n` : ''}EXCERPT:\n${data.text}`,
      schema: ExtractDraftSchema,
      temperature: 0.2,
    });
    return json({ draft: { ...result.data, ...(data.source_url && { source_url: data.source_url }) }, provider: result.provider });
  } catch (e) {
    if (e instanceof LlmUnavailableError) return apiError(502, 'llm_unavailable', 'Extraction is unavailable — use manual entry');
    throw e;
  }
});
