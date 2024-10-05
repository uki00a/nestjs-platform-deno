/** @internal */
export class ImplementationError extends Error {
  constructor(message?: string) {
    super(`[BUG] ${message}`);
  }
}

/** @internal */
export class NotImplementedError extends Error {
  constructor(name?: string) {
    super(name);
  }
}
