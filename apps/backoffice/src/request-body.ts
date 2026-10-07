import { ContactsError } from './contacts.ts';

export async function jsonBody(request: Request): Promise<unknown> {
  if (
    request.headers.get('Content-Type')?.split(';')[0]?.trim() !==
    'application/json'
  )
    throw new ContactsError(415, 'json_required');
  const reader = request.body?.getReader();
  if (!reader) throw new ContactsError(400, 'invalid_json');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 65536) {
      await reader.cancel();
      throw new ContactsError(413, 'request_too_large');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new ContactsError(400, 'invalid_json');
  }
}
