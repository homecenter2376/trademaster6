import { ModelConfig } from "../store";
import { type Bot } from "../store/mask";

export type BuiltinMask = Omit<Bot, "id" | "modelConfig"> & {
  builtin: Boolean;
  modelConfig: Partial<ModelConfig>;
  createdAt?: number;
};
