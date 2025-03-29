import { ChatMessage } from "./message";
import { Bot } from "./mask";

export * from "./chat";
export * from "./update";
export * from "./access";
export * from "./config";
export * from "./plugin";

export interface ChatSession {
  id: string;
  topic: string;
  memoryPrompt: string;
  messages: ChatMessage[];
  date: string;
  mask?: {
    enableArtifacts?: boolean;
    enableCodeFold?: boolean;
  };
  clearContextIndex?: number;
  bot: Bot;
}
