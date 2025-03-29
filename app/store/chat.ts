import {
  getMessageTextContent,
  isDalle3,
  safeLocalStorage,
  trimTopic,
} from "../utils";

import { indexedDBStorage } from "@/app/utils/indexedDB-storage";
import { nanoid } from "nanoid";
import type {
  ClientApi,
  MultimodalContent,
  RequestMessage,
} from "../client/api";
import { getClientApi } from "../client/api";
import { ChatControllerPool } from "../client/controller";
import { showToast } from "../components/ui-lib";
import {
  DEFAULT_INPUT_TEMPLATE,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_TEMPLATE,
  GEMINI_SUMMARIZE_MODEL,
  DEEPSEEK_SUMMARIZE_MODEL,
  KnowledgeCutOffDate,
  MCP_SYSTEM_TEMPLATE,
  MCP_TOOLS_TEMPLATE,
  ServiceProvider,
  StoreKey,
  SUMMARIZE_MODEL,
} from "../constant";
import Locale, { getLang } from "../locales";
import { prettyObject } from "../utils/format";
import { createPersistStore } from "../utils/store";
import { estimateTokenLength } from "../utils/token";
import { ModelConfig, ModelType, useAppConfig } from "./config";
import { useAccessStore } from "./access";
import { collectModelsWithDefaultModel } from "../utils/model";
import { executeMcpAction, getAllTools, isMcpEnabled } from "../mcp/actions";
import { extractMcpJson, isMcpJson } from "../mcp/utils";
import { useFeatureStore } from "../config/features";
import { Bot, createEmptyBot } from "./mask";

const localStorage = safeLocalStorage();

export type ChatMessageTool = {
  id: string;
  index?: number;
  type?: string;
  function?: {
    name: string;
    arguments?: string;
  };
  content?: string;
  isError?: boolean;
  errorMsg?: string;
};

export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id: string;
  model?: ModelType;
  tools?: ChatMessageTool[];
  audio_url?: string;
  isMcpResponse?: boolean;
};

export function createMessage(override: Partial<ChatMessage>): ChatMessage {
  return {
    id: nanoid(),
    date: new Date().toLocaleString(),
    role: "user",
    content: "",
    ...override,
  };
}

export interface ChatStat {
  tokenCount: number;
  wordCount: number;
  charCount: number;
}

export interface ChatSession {
  id: string;
  topic: string;
  messages: ChatMessage[];
  bot: Bot;
  createdAt: number;
  updatedAt: number;
  clearContextIndex?: number;
  mask?: {
    context?: ChatMessage[];
    enableArtifacts?: boolean;
    enableCodeFold?: boolean;
    avatar?: string;
    modelConfig?: {
      model: string;
    };
  };
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

export function createEmptySession(): ChatSession {
  return {
    id: nanoid(),
    topic: DEFAULT_TOPIC,
    messages: [],
    bot: createEmptyBot(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function getSummarizeModel(
  currentModel: string,
  providerName: string,
): string[] {
  // if it is using gpt-* models, force to use 4o-mini to summarize
  if (currentModel.startsWith("gpt") || currentModel.startsWith("chatgpt")) {
    const configStore = useAppConfig.getState();
    const accessStore = useAccessStore.getState();
    const allModel = collectModelsWithDefaultModel(
      configStore.models,
      [configStore.customModels, accessStore.customModels].join(","),
      accessStore.defaultModel,
    );
    const summarizeModel = allModel.find(
      (m) => m.name === SUMMARIZE_MODEL && m.available,
    );
    if (summarizeModel) {
      return [
        summarizeModel.name,
        summarizeModel.provider?.providerName as string,
      ];
    }
  }
  if (currentModel.startsWith("gemini")) {
    return [GEMINI_SUMMARIZE_MODEL, ServiceProvider.Google];
  } else if (currentModel.startsWith("deepseek-")) {
    return [DEEPSEEK_SUMMARIZE_MODEL, ServiceProvider.DeepSeek];
  }

  return [currentModel, providerName];
}

function countMessages(msgs: ChatMessage[]) {
  return msgs.reduce(
    (pre, cur) => pre + estimateTokenLength(getMessageTextContent(cur)),
    0,
  );
}

function fillTemplateWith(input: string, modelConfig: ModelConfig) {
  const cutoff =
    KnowledgeCutOffDate[modelConfig.model] ?? KnowledgeCutOffDate.default;
  // Find the model in the DEFAULT_MODELS array that matches the modelConfig.model
  const modelInfo = DEFAULT_MODELS.find((m) => m.name === modelConfig.model);

  var serviceProvider = "OpenAI";
  if (modelInfo) {
    // TODO: auto detect the providerName from the modelConfig.model

    // Directly use the providerName from the modelInfo
    serviceProvider = modelInfo.provider.providerName;
  }

  const vars = {
    ServiceProvider: serviceProvider,
    cutoff,
    model: modelConfig.model,
    time: new Date().toString(),
    lang: getLang(),
    input: input,
  };

  let output = modelConfig.template ?? DEFAULT_INPUT_TEMPLATE;

  // remove duplicate
  if (input.startsWith(output)) {
    output = "";
  }

  // must contains {{input}}
  const inputVar = "{{input}}";
  if (!output.includes(inputVar)) {
    output += "\n" + inputVar;
  }

  Object.entries(vars).forEach(([name, value]) => {
    const regex = new RegExp(`{{${name}}}`, "g");
    output = output.replace(regex, value.toString()); // Ensure value is a string
  });

  return output;
}

async function getMcpSystemPrompt(): Promise<string> {
  const tools = await getAllTools();

  let toolsStr = "";

  tools.forEach((i) => {
    // error client has no tools
    if (!i.tools) return;

    toolsStr += MCP_TOOLS_TEMPLATE.replace(
      "{{ clientId }}",
      i.clientId,
    ).replace(
      "{{ tools }}",
      i.tools.tools.map((p: object) => JSON.stringify(p, null, 2)).join("\n"),
    );
  });

  return MCP_SYSTEM_TEMPLATE.replace("{{ MCP_TOOLS }}", toolsStr);
}

const DEFAULT_CHAT_STATE = {
  sessions: [createEmptySession()],
  currentSessionIndex: 0,
  lastInput: "",
};

export const useChatStore = createPersistStore(
  DEFAULT_CHAT_STATE,
  (set, _get) => {
    function get() {
      return {
        ..._get(),
        ...methods,
      };
    }

    const methods = {
      forkSession() {
        const featureStore = useFeatureStore.getState();
        if (!featureStore.isFeatureEnabled("enableCustomBots")) {
          return;
        }

        // 获取当前会话
        const currentSession = get().currentSession();
        if (!currentSession) return;

        const newSession = createEmptySession();

        newSession.topic = currentSession.topic;
        // 深拷贝消息
        newSession.messages = currentSession.messages.map((msg) => ({
          ...msg,
          id: nanoid(), // 生成新的消息 ID
        }));
        newSession.bot = {
          ...currentSession.bot,
          modelConfig: {
            ...currentSession.bot.modelConfig,
          },
        };

        set((state) => ({
          currentSessionIndex: 0,
          sessions: [newSession, ...state.sessions],
        }));
      },

      clearSessions() {
        const featureStore = useFeatureStore.getState();
        if (!featureStore.isFeatureEnabled("enableCustomBots")) {
          return;
        }

        set(() => ({
          sessions: [createEmptySession()],
          currentSessionIndex: 0,
        }));
      },

      selectSession(index: number) {
        set({
          currentSessionIndex: index,
        });
      },

      moveSession(from: number, to: number) {
        const featureStore = useFeatureStore.getState();
        if (!featureStore.isFeatureEnabled("enableCustomBots")) {
          return;
        }

        const sessions = get().sessions;

        // move the session
        const newSessions = [...sessions];
        const session = newSessions[from];
        newSessions.splice(from, 1);
        newSessions.splice(to, 0, session);

        set({
          sessions: newSessions,
          currentSessionIndex: to,
        });
      },

      newSession(bot?: Bot) {
        const featureStore = useFeatureStore.getState();
        if (!featureStore.isFeatureEnabled("enableCustomBots")) {
          return;
        }

        const session = createEmptySession();

        if (bot) {
          session.bot = {
            ...bot,
            modelConfig: {
              ...bot.modelConfig,
            },
          };
          session.topic = bot.name;
        }

        set((state) => ({
          currentSessionIndex: 0,
          sessions: [session].concat(state.sessions),
        }));
      },

      nextSession(delta: number) {
        const n = get().sessions.length;
        const limit = (x: number) => (x + n) % n;
        const i = get().currentSessionIndex;
        get().selectSession(limit(i + delta));
      },

      deleteSession(index: number) {
        const featureStore = useFeatureStore.getState();
        if (!featureStore.isFeatureEnabled("enableCustomBots")) {
          return;
        }

        const sessions = get().sessions;

        if (sessions.length === 1) {
          return;
        }

        const newSessions = sessions.slice();
        newSessions.splice(index, 1);
        const currentIndex = get().currentSessionIndex;
        let nextIndex = Math.min(
          currentIndex - Number(index < currentIndex),
          newSessions.length - 1,
        );

        set(() => ({
          currentSessionIndex: nextIndex,
          sessions: newSessions,
        }));
      },

      currentSession() {
        let index = get().currentSessionIndex;
        const sessions = get().sessions;

        if (index < 0 || index >= sessions.length) {
          index = Math.min(sessions.length - 1, Math.max(0, index));
          set(() => ({ currentSessionIndex: index }));
        }

        const session = sessions[index];

        return session;
      },

      onNewMessage(message: ChatMessage, targetSession: ChatSession) {
        get().updateTargetSession(targetSession, (session) => {
          session.messages = session.messages.concat();
          session.updatedAt = Date.now();
        });

        get().updateStat(message, targetSession);

        get().checkMcpJson(message);

        get().summarizeSession(false, targetSession);
      },

      async onUserInput(
        content: string,
        attachImages?: string[],
        isMcpResponse?: boolean,
      ) {
        const session = get().currentSession();
        const modelConfig = session.bot.modelConfig;

        // MCP Response no need to fill template
        let mContent: string | MultimodalContent[] = isMcpResponse
          ? content
          : fillTemplateWith(content, modelConfig);

        if (!isMcpResponse && attachImages && attachImages.length > 0) {
          mContent = [
            ...(content ? [{ type: "text" as const, text: content }] : []),
            ...attachImages.map((url) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
          ];
        }

        let userMessage: ChatMessage = createMessage({
          role: "user",
          content: mContent,
          isMcpResponse,
        });

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          model: modelConfig.model,
        });

        // get recent messages
        const recentMessages = await get().getMessagesWithMemory();
        const sendMessages = recentMessages.concat(userMessage);
        const messageIndex = session.messages.length + 1;

        // save user's and bot's message
        get().updateTargetSession(session, (session) => {
          const savedUserMessage = {
            ...userMessage,
            content: mContent,
          };
          session.messages = session.messages.concat([
            savedUserMessage,
            botMessage,
          ]);
        });

        const api: ClientApi = getClientApi(modelConfig.providerName);
        // make request
        api.llm.chat({
          messages: sendMessages,
          config: { ...modelConfig, stream: true },
          onUpdate(message) {
            botMessage.streaming = true;
            if (message) {
              botMessage.content = message;
            }
            get().updateTargetSession(session, (session) => {
              session.messages = session.messages.concat();
            });
          },
          async onFinish(message) {
            botMessage.streaming = false;
            if (message) {
              botMessage.content = message;
              botMessage.date = new Date().toLocaleString();
              get().onNewMessage(botMessage, session);
            }
            ChatControllerPool.remove(session.id, botMessage.id);
          },
          onBeforeTool(tool: ChatMessageTool) {
            (botMessage.tools = botMessage?.tools || []).push(tool);
            get().updateTargetSession(session, (session) => {
              session.messages = session.messages.concat();
            });
          },
          onAfterTool(tool: ChatMessageTool) {
            botMessage?.tools?.forEach((t, i, tools) => {
              if (tool.id == t.id) {
                tools[i] = { ...tool };
              }
            });
            get().updateTargetSession(session, (session) => {
              session.messages = session.messages.concat();
            });
          },
          onError(error) {
            const isAborted = error.message?.includes?.("aborted");
            botMessage.content +=
              "\n\n" +
              prettyObject({
                error: true,
                message: error.message,
              });
            botMessage.streaming = false;
            userMessage.isError = !isAborted;
            botMessage.isError = !isAborted;
            get().updateTargetSession(session, (session) => {
              session.messages = session.messages.concat();
            });
            ChatControllerPool.remove(
              session.id,
              botMessage.id ?? messageIndex,
            );

            console.error("[Chat] failed ", error);
          },
          onController(controller) {
            // collect controller for stop/retry
            ChatControllerPool.addController(
              session.id,
              botMessage.id ?? messageIndex,
              controller,
            );
          },
        });
      },

      getMemoryPrompt() {
        const session = get().currentSession();

        if (session.bot.memoryPrompt.length) {
          return {
            role: "system",
            content: Locale.Store.Prompt.History(session.bot.memoryPrompt),
            date: "",
          } as ChatMessage;
        }
      },

      async getMessagesWithMemory() {
        const session = get().currentSession();
        const modelConfig = session.bot.modelConfig;
        const clearContextIndex = session.bot.clearContextIndex ?? 0;
        const messages = session.messages.slice();
        const totalMessageCount = session.messages.length;

        // in-context prompts
        const contextPrompts = session.bot.context.slice();

        // system prompts, to get close to OpenAI Web ChatGPT
        const shouldInjectSystemPrompts =
          modelConfig.enableInjectSystemPrompts &&
          (session.bot.modelConfig.model.startsWith("gpt-") ||
            session.bot.modelConfig.model.startsWith("chatgpt-"));

        const mcpEnabled = await isMcpEnabled();
        const mcpSystemPrompt = mcpEnabled ? await getMcpSystemPrompt() : "";

        var systemPrompts: ChatMessage[] = [];

        if (shouldInjectSystemPrompts) {
          systemPrompts = [
            createMessage({
              role: "system",
              content:
                fillTemplateWith("", {
                  ...modelConfig,
                  template: DEFAULT_SYSTEM_TEMPLATE,
                }) + mcpSystemPrompt,
            }),
          ];
        } else if (mcpEnabled) {
          systemPrompts = [
            createMessage({
              role: "system",
              content: mcpSystemPrompt,
            }),
          ];
        }

        if (shouldInjectSystemPrompts || mcpEnabled) {
          console.log(
            "[Global System Prompt] ",
            systemPrompts.at(0)?.content ?? "empty",
          );
        }
        const memoryPrompt = get().getMemoryPrompt();
        // long term memory
        const shouldSendLongTermMemory =
          modelConfig.sendMemory &&
          session.bot.memoryPrompt &&
          session.bot.memoryPrompt.length > 0 &&
          session.bot.lastSummarizeIndex > clearContextIndex;
        const longTermMemoryPrompts =
          shouldSendLongTermMemory && memoryPrompt ? [memoryPrompt] : [];
        const longTermMemoryStartIndex = session.bot.lastSummarizeIndex;

        // short term memory
        const shortTermMemoryStartIndex = Math.max(
          0,
          totalMessageCount - modelConfig.historyMessageCount,
        );

        // lets concat send messages, including 4 parts:
        // 0. system prompt: to get close to OpenAI Web ChatGPT
        // 1. long term memory: summarized memory messages
        // 2. pre-defined in-context prompts
        // 3. short term memory: latest n messages
        // 4. newest input message
        const memoryStartIndex = shouldSendLongTermMemory
          ? Math.min(longTermMemoryStartIndex, shortTermMemoryStartIndex)
          : shortTermMemoryStartIndex;
        // and if user has cleared history messages, we should exclude the memory too.
        const contextStartIndex = Math.max(clearContextIndex, memoryStartIndex);
        const maxTokenThreshold = modelConfig.max_tokens;

        // get recent messages as much as possible
        const reversedRecentMessages = [];
        for (
          let i = totalMessageCount - 1, tokenCount = 0;
          i >= contextStartIndex && tokenCount < maxTokenThreshold;
          i -= 1
        ) {
          const msg = messages[i];
          if (!msg || msg.isError) continue;
          tokenCount += estimateTokenLength(getMessageTextContent(msg));
          reversedRecentMessages.push(msg);
        }
        // concat all messages
        const recentMessages = [
          ...systemPrompts,
          ...longTermMemoryPrompts,
          ...contextPrompts,
          ...reversedRecentMessages.reverse(),
        ];

        return recentMessages;
      },

      updateMessage(
        sessionIndex: number,
        messageIndex: number,
        updater: (message?: ChatMessage) => void,
      ) {
        const sessions = get().sessions;
        const session = sessions.at(sessionIndex);
        const messages = session?.messages;
        updater(messages?.at(messageIndex));
        set(() => ({ sessions }));
      },

      resetSession(session: ChatSession) {
        get().updateTargetSession(session, (session) => {
          session.messages = [];
          session.bot.memoryPrompt = "";
        });
      },

      summarizeSession(
        refreshTitle: boolean = false,
        targetSession: ChatSession,
      ) {
        const config = useAppConfig.getState();
        const session = targetSession;
        const modelConfig = session.bot.modelConfig;
        // skip summarize when using dalle3?
        if (isDalle3(modelConfig.model)) {
          return;
        }

        // if not config compressModel, then using getSummarizeModel
        const [model, providerName] = modelConfig.compressModel
          ? [modelConfig.compressModel, modelConfig.compressProviderName]
          : getSummarizeModel(
              session.bot.modelConfig.model,
              session.bot.modelConfig.providerName,
            );
        const api: ClientApi = getClientApi(providerName as ServiceProvider);

        // remove error messages if any
        const messages = session.messages;

        // should summarize topic after chating more than 50 words
        const SUMMARIZE_MIN_LEN = 50;
        if (
          (config.enableAutoGenerateTitle &&
            session.topic === DEFAULT_TOPIC &&
            countMessages(messages) >= SUMMARIZE_MIN_LEN) ||
          refreshTitle
        ) {
          const startIndex = Math.max(
            0,
            messages.length - modelConfig.historyMessageCount,
          );
          const topicMessages = messages
            .slice(
              startIndex < messages.length ? startIndex : messages.length - 1,
              messages.length,
            )
            .concat(
              createMessage({
                role: "user",
                content: Locale.Store.Prompt.Topic,
              }),
            );
          api.llm.chat({
            messages: topicMessages,
            config: {
              model,
              stream: false,
              providerName,
            },
            onFinish(message, responseRes) {
              if (responseRes?.status === 200) {
                get().updateTargetSession(
                  session,
                  (session) =>
                    (session.topic =
                      message.length > 0 ? trimTopic(message) : DEFAULT_TOPIC),
                );
              }
            },
          });
        }
        const summarizeIndex = Math.max(
          session.bot.lastSummarizeIndex,
          session.bot.clearContextIndex ?? 0,
        );
        let toBeSummarizedMsgs = messages
          .filter((msg) => !msg.isError)
          .slice(summarizeIndex);

        const historyMsgLength = countMessages(toBeSummarizedMsgs);

        if (historyMsgLength > (modelConfig?.max_tokens || 4000)) {
          const n = toBeSummarizedMsgs.length;
          toBeSummarizedMsgs = toBeSummarizedMsgs.slice(
            Math.max(0, n - modelConfig.historyMessageCount),
          );
        }
        const memoryPrompt = get().getMemoryPrompt();
        if (memoryPrompt) {
          // add memory prompt
          toBeSummarizedMsgs.unshift(memoryPrompt);
        }

        const lastSummarizeIndex = session.messages.length;

        console.log(
          "[Chat History] ",
          toBeSummarizedMsgs,
          historyMsgLength,
          modelConfig.compressMessageLengthThreshold,
        );

        if (
          historyMsgLength > modelConfig.compressMessageLengthThreshold &&
          modelConfig.sendMemory
        ) {
          /** Destruct max_tokens while summarizing
           * this param is just shit
           **/
          const { max_tokens, ...modelcfg } = modelConfig;
          api.llm.chat({
            messages: toBeSummarizedMsgs.concat(
              createMessage({
                role: "system",
                content: Locale.Store.Prompt.Summarize,
                date: "",
              }),
            ),
            config: {
              ...modelcfg,
              stream: true,
              model,
              providerName,
            },
            onUpdate(message) {
              session.bot.memoryPrompt = message;
            },
            onFinish(message, responseRes) {
              if (responseRes?.status === 200) {
                console.log("[Memory] ", message);
                get().updateTargetSession(session, (session) => {
                  session.bot.lastSummarizeIndex = lastSummarizeIndex;
                  session.bot.memoryPrompt = message; // Update the memory prompt for stored it in local storage
                });
              }
            },
            onError(err) {
              console.error("[Summarize] ", err);
            },
          });
        }
      },

      updateStat(message: ChatMessage, session: ChatSession) {
        get().updateTargetSession(session, (session) => {
          session.bot.charCount += message.content.length;
          // TODO: should update chat count and word count
        });
      },
      updateTargetSession(
        targetSession: ChatSession,
        updater: (session: ChatSession) => void,
      ) {
        const sessions = get().sessions;
        const index = sessions.findIndex((s) => s.id === targetSession.id);
        if (index < 0) return;
        updater(sessions[index]);
        set(() => ({ sessions }));
      },
      async clearAllData() {
        await indexedDBStorage.clear();
        localStorage.clear();
        location.reload();
      },
      setLastInput(lastInput: string) {
        set({
          lastInput,
        });
      },

      /** check if the message contains MCP JSON and execute the MCP action */
      checkMcpJson(message: ChatMessage) {
        const mcpEnabled = isMcpEnabled();
        if (!mcpEnabled) return;
        const content = getMessageTextContent(message);
        if (isMcpJson(content)) {
          try {
            const mcpRequest = extractMcpJson(content);
            if (mcpRequest) {
              console.debug("[MCP Request]", mcpRequest);

              executeMcpAction(mcpRequest.clientId, mcpRequest.mcp)
                .then((result) => {
                  console.log("[MCP Response]", result);
                  const mcpResponse =
                    typeof result === "object"
                      ? JSON.stringify(result)
                      : String(result);
                  get().onUserInput(
                    `\`\`\`json:mcp-response:${mcpRequest.clientId}\n${mcpResponse}\n\`\`\``,
                    [],
                    true,
                  );
                })
                .catch((error) => showToast("MCP execution failed", error));
            }
          } catch (error) {
            console.error("[Check MCP JSON]", error);
          }
        }
      },
    };

    return methods;
  },
  {
    name: StoreKey.Chat,
    version: 3.3,
    migrate(persistedState, version) {
      const state = persistedState as any;
      const newState = JSON.parse(
        JSON.stringify(state),
      ) as typeof DEFAULT_CHAT_STATE;

      if (version < 2) {
        newState.sessions = [];

        const oldSessions = state.sessions;
        for (const oldSession of oldSessions) {
          const newSession = createEmptySession();
          newSession.topic = oldSession.topic;
          newSession.messages = [...oldSession.messages];
          newSession.bot.modelConfig.sendMemory = true;
          newSession.bot.modelConfig.historyMessageCount = 4;
          newSession.bot.modelConfig.compressMessageLengthThreshold = 1000;
          newState.sessions.push(newSession);
        }
      }

      if (version < 3) {
        // migrate id to nanoid
        newState.sessions.forEach((s) => {
          s.id = nanoid();
          s.messages.forEach((m) => (m.id = nanoid()));
        });
      }

      // Enable `enableInjectSystemPrompts` attribute for old sessions.
      // Resolve issue of old sessions not automatically enabling.
      if (version < 3.1) {
        newState.sessions.forEach((s) => {
          if (
            // Exclude those already set by user
            !s.bot.modelConfig.hasOwnProperty("enableInjectSystemPrompts")
          ) {
            // Because users may have changed this configuration,
            // the user's current configuration is used instead of the default
            const config = useAppConfig.getState();
            s.bot.modelConfig.enableInjectSystemPrompts =
              config.modelConfig.enableInjectSystemPrompts;
          }
        });
      }

      // add default summarize model for every session
      if (version < 3.2) {
        newState.sessions.forEach((s) => {
          const config = useAppConfig.getState();
          s.bot.modelConfig.compressModel = config.modelConfig.compressModel;
          s.bot.modelConfig.compressProviderName =
            config.modelConfig.compressProviderName;
        });
      }
      // revert default summarize model for every session
      if (version < 3.3) {
        newState.sessions.forEach((s) => {
          const config = useAppConfig.getState();
          s.bot.modelConfig.compressModel = "";
          s.bot.modelConfig.compressProviderName = "";
        });
      }

      return newState as any;
    },
  },
);

export function getModelConfig(session: ChatSession) {
  const modelConfig = session.bot.modelConfig;
  return modelConfig;
}

export function getContextPrompts(session: ChatSession) {
  const contextPrompts = session.bot.context.slice();
  return contextPrompts;
}

export function isGptModel(session: ChatSession) {
  return (
    session.bot.modelConfig.model.startsWith("gpt-") ||
    session.bot.modelConfig.model.startsWith("chatgpt-")
  );
}

export function getModelProvider(session: ChatSession) {
  const modelConfig = session.bot.modelConfig;
  return {
    model: modelConfig.model,
    providerName: modelConfig.providerName,
  };
}

export function updateSession(
  session: ChatSession,
  updater: (session: ChatSession) => void,
) {
  const newSession = { ...session };
  updater(newSession);
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBot(
  session: ChatSession,
  updater: (bot: Bot) => void,
) {
  const newSession = { ...session };
  updater(newSession.bot);
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionModelConfig(
  session: ChatSession,
  updater: (modelConfig: ModelConfig) => void,
) {
  const newSession = { ...session };
  updater(newSession.bot.modelConfig);
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionTopic(session: ChatSession, topic: string) {
  const newSession = { ...session };
  newSession.topic = topic;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionMessages(
  session: ChatSession,
  updater: (messages: Message[]) => void,
) {
  const newSession = { ...session };
  updater(newSession.messages);
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionMessage(
  session: ChatSession,
  messageId: string,
  updater: (message: Message) => void,
) {
  const newSession = { ...session };
  const index = newSession.messages.findIndex((m) => m.id === messageId);
  if (index > -1) {
    updater(newSession.messages[index]);
    newSession.updatedAt = Date.now();
  }
  return newSession;
}

export function deleteSessionMessage(session: ChatSession, messageId: string) {
  const newSession = { ...session };
  const index = newSession.messages.findIndex((m) => m.id === messageId);
  if (index > -1) {
    newSession.messages.splice(index, 1);
    newSession.updatedAt = Date.now();
  }
  return newSession;
}

export function clearSessionMessages(session: ChatSession) {
  const newSession = { ...session };
  newSession.messages = [];
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotConfig(
  session: ChatSession,
  updater: (bot: Bot) => void,
) {
  const newSession = { ...session };
  updater(newSession.bot);
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotModelConfig(
  session: ChatSession,
  updater: (modelConfig: ModelConfig) => void,
) {
  const newSession = { ...session };
  updater(newSession.bot.modelConfig);
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotContext(
  session: ChatSession,
  updater: (context: string[]) => void,
) {
  const newSession = { ...session };
  updater(newSession.bot.context);
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotName(session: ChatSession, name: string) {
  const newSession = { ...session };
  newSession.bot.name = name;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotDescription(
  session: ChatSession,
  description: string,
) {
  const newSession = { ...session };
  newSession.bot.description = description;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotLang(session: ChatSession, lang: string) {
  const newSession = { ...session };
  newSession.bot.lang = lang;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotBuiltin(
  session: ChatSession,
  builtin: boolean,
) {
  const newSession = { ...session };
  newSession.bot.builtin = builtin;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotId(session: ChatSession, id: string) {
  const newSession = { ...session };
  newSession.bot.id = id;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotModel(session: ChatSession, model: string) {
  const newSession = { ...session };
  newSession.bot.modelConfig.model = model;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotTemperature(
  session: ChatSession,
  temperature: number,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.temperature = temperature;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotTopP(session: ChatSession, topP: number) {
  const newSession = { ...session };
  newSession.bot.modelConfig.top_p = topP;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotMaxTokens(
  session: ChatSession,
  maxTokens: number,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.max_tokens = maxTokens;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotPresencePenalty(
  session: ChatSession,
  presencePenalty: number,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.presence_penalty = presencePenalty;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotFrequencyPenalty(
  session: ChatSession,
  frequencyPenalty: number,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.frequency_penalty = frequencyPenalty;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotSendMemory(
  session: ChatSession,
  sendMemory: boolean,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.sendMemory = sendMemory;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotHistoryMessageCount(
  session: ChatSession,
  historyMessageCount: number,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.historyMessageCount = historyMessageCount;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotCompressMessageLengthThreshold(
  session: ChatSession,
  compressMessageLengthThreshold: number,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.compressMessageLengthThreshold =
    compressMessageLengthThreshold;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotEnableInjectSystemPrompts(
  session: ChatSession,
  enableInjectSystemPrompts: boolean,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.enableInjectSystemPrompts =
    enableInjectSystemPrompts;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotTemplate(
  session: ChatSession,
  template: string,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.template = template;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotProviderName(
  session: ChatSession,
  providerName: string,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.providerName = providerName;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotCompressModel(
  session: ChatSession,
  compressModel: string,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.compressModel = compressModel;
  newSession.updatedAt = Date.now();
  return newSession;
}

export function updateSessionBotCompressProviderName(
  session: ChatSession,
  compressProviderName: string,
) {
  const newSession = { ...session };
  newSession.bot.modelConfig.compressProviderName = compressProviderName;
  newSession.updatedAt = Date.now();
  return newSession;
}
