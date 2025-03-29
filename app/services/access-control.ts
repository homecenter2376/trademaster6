import {
  useFeatureStore,
  FeatureConfig,
  DEFAULT_FEATURE_CONFIG,
} from "../config/features";
import { useAccessStore } from "../store/access";
import { systemController } from "../controllers/system";

export interface AccessLevel {
  level: "public" | "basic" | "premium" | "admin";
  features: (keyof FeatureConfig | "*")[];
  limits: {
    maxCustomPrompts?: number;
    maxCustomMasks?: number;
    maxCustomBots?: number;
    maxCustomPlugins?: number;
    maxChatHistory?: number;
    maxTokensPerRequest?: number;
    maxRequestsPerDay?: number;
    maxChartAnalysisPerDay?: number;
    maxMarketSentimentAnalysisPerDay?: number;
    maxTradingSignalsPerDay?: number;
    maxPortfolioUpdatesPerDay?: number;
    maxBacktestingRunsPerDay?: number;
    maxRealTimeAlerts?: number;
    maxCustomIndicators?: number;
  };
}

export const ACCESS_LEVELS: Record<string, AccessLevel> = {
  public: {
    level: "public",
    features: [
      "enableMarkdown",
      "enableCopyCode",
      "enableStreaming",
      "enableMemory",
    ],
    limits: {
      maxChatHistory: 10,
      maxTokensPerRequest: 1000,
      maxRequestsPerDay: 50,
      maxChartAnalysisPerDay: 5,
      maxMarketSentimentAnalysisPerDay: 5,
      maxTradingSignalsPerDay: 5,
      maxPortfolioUpdatesPerDay: 1,
      maxBacktestingRunsPerDay: 1,
      maxRealTimeAlerts: 1,
      maxCustomIndicators: 0,
    },
  },
  basic: {
    level: "basic",
    features: [
      "enableMarkdown",
      "enableCopyCode",
      "enableStreaming",
      "enableMemory",
      "enableCustomPrompts",
      "enableCustomMasks",
      "enableArtifacts",
      "enableCodeFold",
      "enableChartAnalysis",
      "enableMarketSentiment",
      "enableTradingSignals",
      "enablePortfolioManagement",
    ],
    limits: {
      maxCustomPrompts: 5,
      maxCustomMasks: 3,
      maxCustomBots: 2,
      maxChatHistory: 50,
      maxTokensPerRequest: 2000,
      maxRequestsPerDay: 200,
      maxChartAnalysisPerDay: 20,
      maxMarketSentimentAnalysisPerDay: 20,
      maxTradingSignalsPerDay: 20,
      maxPortfolioUpdatesPerDay: 5,
      maxBacktestingRunsPerDay: 5,
      maxRealTimeAlerts: 3,
      maxCustomIndicators: 2,
    },
  },
  premium: {
    level: "premium",
    features: [
      "enableMarkdown",
      "enableCopyCode",
      "enableStreaming",
      "enableMemory",
      "enableCustomPrompts",
      "enableCustomMasks",
      "enableCustomBots",
      "enableArtifacts",
      "enableCodeFold",
      "enablePlugins",
      "enableMCP",
      "enableTTS",
      "enableRealtimeChat",
      "enableApiKeyValidation",
      "enableRateLimiting",
      "enableContentFiltering",
      "enableChartAnalysis",
      "enableMarketSentiment",
      "enableTradingSignals",
      "enablePortfolioManagement",
      "enableRiskAnalysis",
      "enableBacktesting",
      "enableRealTimeAlerts",
      "enableCustomIndicators",
    ],
    limits: {
      maxCustomPrompts: 20,
      maxCustomMasks: 10,
      maxCustomBots: 5,
      maxCustomPlugins: 5,
      maxChatHistory: 200,
      maxTokensPerRequest: 4000,
      maxRequestsPerDay: 1000,
      maxChartAnalysisPerDay: 100,
      maxMarketSentimentAnalysisPerDay: 100,
      maxTradingSignalsPerDay: 100,
      maxPortfolioUpdatesPerDay: 20,
      maxBacktestingRunsPerDay: 20,
      maxRealTimeAlerts: 10,
      maxCustomIndicators: 10,
    },
  },
  admin: {
    level: "admin",
    features: ["*"], // All features enabled
    limits: {
      maxCustomPrompts: Infinity,
      maxCustomMasks: Infinity,
      maxCustomBots: Infinity,
      maxCustomPlugins: Infinity,
      maxChatHistory: Infinity,
      maxTokensPerRequest: Infinity,
      maxRequestsPerDay: Infinity,
      maxChartAnalysisPerDay: Infinity,
      maxMarketSentimentAnalysisPerDay: Infinity,
      maxTradingSignalsPerDay: Infinity,
      maxPortfolioUpdatesPerDay: Infinity,
      maxBacktestingRunsPerDay: Infinity,
      maxRealTimeAlerts: Infinity,
      maxCustomIndicators: Infinity,
    },
  },
};

export class AccessControlService {
  private static instance: AccessControlService;
  private currentLevel: AccessLevel;

  private constructor() {
    this.currentLevel = this.determineAccessLevel();
  }

  public static getInstance(): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService();
    }
    return AccessControlService.instance;
  }

  private determineAccessLevel(): AccessLevel {
    const accessStore = useAccessStore.getState();
    const systemState = systemController.getState();

    // Admin check
    if (systemState.status.isAuthorized && accessStore.accessCode === "admin") {
      return ACCESS_LEVELS.admin;
    }

    // Premium check
    if (
      systemState.status.isAuthorized &&
      accessStore.accessCode === "premium"
    ) {
      return ACCESS_LEVELS.premium;
    }

    // Basic check
    if (systemState.status.isAuthorized) {
      return ACCESS_LEVELS.basic;
    }

    // Public access
    return ACCESS_LEVELS.public;
  }

  public updateAccessLevel(): void {
    this.currentLevel = this.determineAccessLevel();
    this.applyAccessLevel();
  }

  private applyAccessLevel(): void {
    const featureStore = useFeatureStore.getState();

    // Reset all features to disabled
    featureStore.reset();

    // Enable features based on access level
    if (this.currentLevel.features.includes("*")) {
      // Admin level - enable all features
      Object.keys(DEFAULT_FEATURE_CONFIG).forEach((feature) => {
        featureStore.updateFeature(feature as keyof FeatureConfig, true);
      });
    } else {
      // Enable specific features
      this.currentLevel.features.forEach((feature) => {
        featureStore.updateFeature(feature as keyof FeatureConfig, true);
      });
    }
  }

  public canAccessFeature(feature: keyof FeatureConfig): boolean {
    return (
      this.currentLevel.features.includes("*") ||
      this.currentLevel.features.includes(feature)
    );
  }

  public getCurrentLimits(): AccessLevel["limits"] {
    return this.currentLevel.limits;
  }

  public getCurrentLevel(): AccessLevel["level"] {
    return this.currentLevel.level;
  }

  public isLimitExceeded(
    limitType: keyof AccessLevel["limits"],
    currentValue: number,
  ): boolean {
    const limit = this.currentLevel.limits[limitType];
    return limit !== undefined && currentValue >= limit;
  }

  public getRemainingLimit(
    limitType: keyof AccessLevel["limits"],
    currentValue: number,
  ): number {
    const limit = this.currentLevel.limits[limitType];
    if (limit === undefined) return Infinity;
    return Math.max(0, limit - currentValue);
  }
}

// Export singleton instance
export const accessControl = AccessControlService.getInstance();
