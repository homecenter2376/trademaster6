import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatContext {
  id: string;
  role: string;
  content: string;
  date: string;
}

export interface Bot {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  context: ChatContext[];
  hideContext?: boolean;
  enableArtifacts?: boolean;
  enableCodeFold?: boolean;
  syncGlobalConfig?: boolean;
  modelConfig: {
    model: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    sendMemory?: boolean;
    historyMessageCount?: number;
    compressMessageLengthThreshold?: number;
    enableInjectSystemPrompts?: boolean;
    template?: string;
    providerName?: string;
    compressModel?: string;
    compressProviderName?: string;
  };
  lang?: string;
  builtin?: boolean;
}

// Alias for backward compatibility
export type Mask = Bot;

export const DEFAULT_BOT_AVATAR = "gpt-bot";
export const DEFAULT_MASK_AVATAR = DEFAULT_BOT_AVATAR;

export const createEmptyBot = (): Bot => ({
  id: "",
  name: "",
  description: "",
  context: [],
  modelConfig: {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    top_p: 1,
    max_tokens: 2000,
    presence_penalty: 0,
    frequency_penalty: 0,
    sendMemory: true,
    historyMessageCount: 4,
    compressMessageLengthThreshold: 1000,
    enableInjectSystemPrompts: true,
  },
});

interface BotStore {
  bots: Bot[];
  create: (bot?: Bot) => void;
  updateBot: (id: string, updater: (bot: Bot) => void) => void;
  deleteBot: (id: string) => void;
  getBot: (id: string) => Bot | undefined;
  getAllBots: () => Bot[];
  get: (id: string) => Bot | undefined;
  getAll: () => Bot[];
  language: string;
}

export const useBotStore = create<BotStore>()(
  persist(
    (set, get) => ({
      bots: [] as Bot[],
      language: "en",
      create(bot?: Bot) {
        const newBot = bot || createEmptyBot();
        const bots = get().bots;
        bots.push(newBot);
        set(() => ({ bots }));
      },
      updateBot(id: string, updater: (bot: Bot) => void) {
        const bots = get().bots;
        const index = bots.findIndex((m) => m.id === id);
        if (index > -1) {
          updater(bots[index]);
          set(() => ({ bots }));
        }
      },
      deleteBot(id: string) {
        const bots = get().bots;
        const index = bots.findIndex((m) => m.id === id);
        if (index > -1) {
          bots.splice(index, 1);
          set(() => ({ bots }));
        }
      },
      getBot(id: string) {
        const bots = get().bots;
        return bots.find((m) => m.id === id);
      },
      getAllBots() {
        const bots = get().bots;
        return bots;
      },
      get(id: string) {
        return get().getBot(id);
      },
      getAll() {
        return get().getAllBots();
      },
    }),
    {
      name: "bot-store",
    },
  ),
);

// Alias for backward compatibility
export const useMaskStore = useBotStore;
