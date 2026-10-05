export class SyncError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter: number;
  constructor(code: string, retryable = false, retryAfter = 0) {
    super(code);
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}
// Never persist upstream messages, response bodies, URLs or personal data.
export function safeError(error: unknown): SyncError {
  return error instanceof SyncError
    ? error
    : new SyncError('internal_error', true);
}
