import { Inject } from "@nestjs/common";
import { DenoKvRef } from "./denokv.constants.ts";

export function InjectKv(): ParameterDecorator {
  return Inject(DenoKvRef);
}
