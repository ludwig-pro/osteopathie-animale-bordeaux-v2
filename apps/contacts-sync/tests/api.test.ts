import test from 'node:test';
import assert from 'node:assert/strict';
import { Clients } from '../src/api.ts';
import type { Env } from '../src/types.ts';

test('API transport uses an unbound fetch and refuses redirects without following them', async () => {
  let calls = 0;
  const api = new Clients({ CALENDLY_TOKEN: 'fake' } as Env, async function (
    this: unknown,
    _input,
    init
  ) {
    assert.equal(this, undefined);
    assert.equal(init?.redirect, 'manual');
    calls++;
    return new Response(null, {
      status: 302,
      headers: { Location: 'https://example.test' },
    });
  });
  await assert.rejects(api.calendly('/scheduled_events'), {
    code: 'calendly_http_302',
  });
  assert.equal(calls, 1);
});
