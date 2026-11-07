/** POST /api/parse-scenario — LLM Job A (§7.2). Public, rate-limited. */
import { ParseScenarioRequestSchema, ParsedScenarioSchema } from '../src/lib/types.js';
import { apiError, json, rateLimit, readJson, route } from '../src/server/http.js';
import { completeJson, LlmUnavailableError } from '../src/server/llm.js';
import { PARSE_SCENARIO_SYSTEM } from '../src/server/prompts.js';

export const POST = route(async (req) => {
  const limited = rateLimit(req, 'parse-scenario');
  if (limited) return limited;
  const { data, response } = await readJson(req, ParseScenarioRequestSchema);
  if (response) return response;

  try {
    const result = await completeJson({
      system: PARSE_SCENARIO_SYSTEM,
      user: data.text,
      schema: ParsedScenarioSchema,
      temperature: 0.2,
    });
    // The user confirms these chips (and the §5a alias resolution) BEFORE matching runs.
    return json({ scenario: result.data, provider: result.provider });
  } catch (e) {
    if (e instanceof LlmUnavailableError) return apiError(502, 'llm_unavailable', 'Scenario parsing is unavailable — use the editable chips instead');
    throw e;
  }
});
