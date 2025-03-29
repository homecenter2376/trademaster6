import { createPersistStore } from "../utils/store";
import { StoreKey } from "../constant";

export interface FeatureConfig {
  // User Capabilities
  enableCustomPrompts: boolean; // Ability to create custom prompts
  enableCustomMasks: boolean; // Ability to create custom masks
  enableCustomBots: boolean; // Ability to create custom bots

  // UI Features
  enableArtifacts: boolean; // Show artifacts config
  enableCodeFold: boolean; // Code fold config
  enableAutoGenerateTitle: boolean; // Auto generate chat titles
  disablePromptHint: boolean; // Disable prompt hints
  dontShowMaskSplashScreen: boolean; // Don't show splash screen when create chat
  hideBuiltinMasks: boolean; // Don't add builtin masks

  // Chat Features
  enableMemory: boolean; // Enable chat memory/summarization
  enableStreaming: boolean; // Enable streaming responses
  enableMarkdown: boolean; // Enable markdown rendering
  enableCopyCode: boolean; // Enable code block copying

  // Advanced Features
  enablePlugins: boolean; // Enable plugin system
  enableMCP: boolean; // Enable MCP (Model Control Protocol)
  enableTTS: boolean; // Enable Text-to-Speech
  enableRealtimeChat: boolean; // Enable realtime chat features

  // Security Features
  enableApiKeyValidation: boolean; // Enable API key validation
  enableRateLimiting: boolean; // Enable rate limiting
  enableContentFiltering: boolean; // Enable content filtering

  // Admin Features
  enableAdminPanel: boolean; // Enable admin panel
  enableUserManagement: boolean; // Enable user management
  enableAnalytics: boolean; // Enable analytics

  // Trading Features
  enableChartAnalysis: boolean; // Enable chart analysis features
  enableMarketSentiment: boolean; // Enable market sentiment analysis
  enableTradingSignals: boolean; // Enable trading signal generation
  enablePortfolioManagement: boolean; // Enable portfolio management
  enableRiskAnalysis: boolean; // Enable risk analysis tools
  enableBacktesting: boolean; // Enable backtesting capabilities
  enableRealTimeAlerts: boolean; // Enable real-time trading alerts
  enableCustomIndicators: boolean; // Enable custom technical indicators
}

export const DEFAULT_FEATURE_CONFIG: FeatureConfig = {
  // User Capabilities
  enableCustomPrompts: false,
  enableCustomMasks: false,
  enableCustomBots: false,

  // UI Features
  enableArtifacts: true,
  enableCodeFold: true,
  enableAutoGenerateTitle: true,
  disablePromptHint: false,
  dontShowMaskSplashScreen: false,
  hideBuiltinMasks: false,

  // Chat Features
  enableMemory: true,
  enableStreaming: true,
  enableMarkdown: true,
  enableCopyCode: true,

  // Advanced Features
  enablePlugins: true,
  enableMCP: true,
  enableTTS: false,
  enableRealtimeChat: false,

  // Security Features
  enableApiKeyValidation: true,
  enableRateLimiting: true,
  enableContentFiltering: true,

  // Admin Features
  enableAdminPanel: false,
  enableUserManagement: false,
  enableAnalytics: false,

  // Trading Features
  enableChartAnalysis: false,
  enableMarketSentiment: false,
  enableTradingSignals: false,
  enablePortfolioManagement: false,
  enableRiskAnalysis: false,
  enableBacktesting: false,
  enableRealTimeAlerts: false,
  enableCustomIndicators: false,
};

export const useFeatureStore = createPersistStore(
  { ...DEFAULT_FEATURE_CONFIG },
  (set, get) => ({
    reset() {
      set(() => ({ ...DEFAULT_FEATURE_CONFIG }));
    },

    updateFeature(feature: keyof FeatureConfig, value: boolean) {
      set((state) => ({
        ...state,
        [feature]: value,
      }));
    },

    updateFeatures(features: Partial<FeatureConfig>) {
      set((state) => ({
        ...state,
        ...features,
      }));
    },

    isFeatureEnabled(feature: keyof FeatureConfig): boolean {
      return get()[feature];
    },

    getEnabledFeatures(): string[] {
      const state = get();
      return Object.entries(state)
        .filter(([_, value]) => value === true)
        .map(([key]) => key);
    },

    getDisabledFeatures(): string[] {
      const state = get();
      return Object.entries(state)
        .filter(([_, value]) => value === false)
        .map(([key]) => key);
    },
  }),
  {
    name: StoreKey.Features,
    version: 1,
  },
);
