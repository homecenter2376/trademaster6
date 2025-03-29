export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string | MultimodalContent[];
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

export interface MultimodalContent {
  type: "text" | "image";
  text?: string;
  image_url?: string;
}
