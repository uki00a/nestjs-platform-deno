/** @internal */
export class NotImplementedError extends Error {
  /** @internal */
  constructor(name?: string) {
    super(name);
  }
}

/** @internal */
export class ImplementationError extends Error {
  constructor(message?: string) {
    super(`[BUG] ${message}`);
  }
}
