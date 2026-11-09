/**
 * DECISIONS-ROUND3 #8: one canonical airflow rule for scenario parsing, so retrieval cannot differ by
 * provider for the same words. "still air" / "quiescent" / "no ventilation" → flow_cm_s 0; no airflow
 * mentioned → null. The rule and its worked examples live in the ONE prompt every provider receives.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AIRFLOW_PARSE_FIXTURES } from '../src/lib/fixtures';
import { ParsedScenarioSchema } from '../src/lib/types';
import { completeJson } from '../src/server/llm';
import { PARSE_SCENARIO_SYSTEM, PROMPT_VERSION } from '../src/server/prompts';

const [stillAir, unstated] = AIRFLOW_PARSE_FIXTURES;

describe('airflow parsing fixtures', () => {
  it('both are valid ParsedScenarios', () => AIRFLOW_PARSE_FIXTURES.forEach((f) => ParsedScenarioSchema.parse(f.scenario)));

  it('"still air" parses as a stated airflow of 0', () => {
    expect(stillAir!.text).toMatch(/still air/i);
    expect(stillAir!.scenario.flow_cm_s).toBe(0);
  });

  it('no airflow mention parses as null (unstated, never zero)', () => {
    expect(unstated!.text).not.toMatch(/air\s*flow|still air|quiescent|ventilat|cm\/s|m\/s|fan/i);
    expect(unstated!.scenario.flow_cm_s).toBeNull();
  });

  it('the two cases differ ONLY in the airflow words and the airflow value', () =>
    expect({ ...stillAir!.scenario, flow_cm_s: null }).toEqual(unstated!.scenario));
});

describe('the canonical rule is in the parse prompt', () => {
  it('names all three zero-flow phrases and the null rule', () => {
    for (const phrase of ['"still air"', '"quiescent"', '"no ventilation"']) expect(PARSE_SCENARIO_SYSTEM).toContain(phrase);
    expect(PARSE_SCENARIO_SYSTEM).toContain('flow_cm_s is 0');
    expect(PARSE_SCENARIO_SYSTEM).toContain('If the text does not mention airflow at all, flow_cm_s is null.');
  });

  it('renders each fixture verbatim as a worked example (prompt and contract cannot drift)', () => {
    for (const f of AIRFLOW_PARSE_FIXTURES) expect(PARSE_SCENARIO_SYSTEM).toContain(`"${f.text}" -> ${JSON.stringify(f.scenario)}`);
  });

  it('prompt version bumped (part of the briefing-cache key)', () => expect(PROMPT_VERSION).toBe('prompts-v4'));

  it('both providers receive the byte-identical system prompt', async () => {
    const systems: Record<string, string> = {};
    const fetchFn = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (url.includes('groq')) {
        systems.groq = body.messages[0].content;
        return new Response('', { status: 500 }); // force the fallthrough to Gemini
      }
      systems.gemini = body.systemInstruction.parts[0].text;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(stillAir!.scenario) }] } }] }));
    }) as unknown as typeof fetch;
    const r = await completeJson(
      { system: PARSE_SCENARIO_SYSTEM, user: stillAir!.text, schema: ParsedScenarioSchema as z.ZodType<unknown>, temperature: 0.2 },
      { env: { GROQ_API_KEY: 'g', GEMINI_API_KEY: 'm' }, fetchFn },
    );
    expect(r.provider).toBe('gemini');
    expect(systems.groq).toBe(PARSE_SCENARIO_SYSTEM);
    expect(systems.gemini).toBe(systems.groq);
  });
});
