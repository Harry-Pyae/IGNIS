/** One live smoke test per provider (§3). Opt-in: `npm run test:smoke` (needs that provider's key + network reach). */
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { completeJson, type ProviderName } from '../src/server/llm';

const cases: [ProviderName, string][] = [
  ['groq', 'GROQ_API_KEY'],
  ['gemini', 'GEMINI_API_KEY'],
];

for (const [provider, keyVar] of cases) {
  describe.skipIf(import.meta.env.MODE !== 'smoke' || !process.env[keyVar])(`LLM smoke: ${provider}`, () => {
    it('returns schema-valid JSON', async () => {
      const r = await completeJson(
        {
          system: 'Reply with the JSON object {"status":"ok"} and nothing else.',
          user: 'ping',
          schema: z.object({ status: z.literal('ok') }),
          temperature: 0.1,
        },
        { only: provider },
      );
      expect(r.provider).toBe(provider);
    }, 30_000);
  });
}
