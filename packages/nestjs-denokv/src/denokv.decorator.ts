import { Inject } from "@nestjs/common";
import { DenoKvRef } from "./denokv.constants.ts";

/**
 * This decorator injects {@linkcode Deno.Kv} instance.
 */
export function InjectKv(): ParameterDecorator {
  return Inject(DenoKvRef);
}
