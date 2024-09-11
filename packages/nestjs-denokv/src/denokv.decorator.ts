import { Inject } from "@nestjs/common";
import { kDenoKv } from "./denokv.constants.ts";

export function InjectKv(): ParameterDecorator {
  return Inject(kDenoKv);
}
