import { MultimodalContent as ApiMultimodalContent } from "../client/api";

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string | ApiMultimodalContent[];
  date: string;
  streaming?: boolean;
  isError?: boolean;
  model?: string;
  tools?: Array<{
    id: string;
    isError?: boolean;
    errorMsg?: string;
    function?: {
      name: string;
    };
  }>;
  audio_url?: string;
}

export type MultimodalContent = ApiMultimodalContent;
