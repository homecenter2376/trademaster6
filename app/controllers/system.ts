import { useFeatureStore } from "../config/features";
import { useAccessStore } from "../store/access";

export interface SystemState {
  // Feature States
  features: {
    // User Capabilities
    enableCustomPrompts: boolean;
    enableCustomMasks: boolean;
    enableCustomBots: boolean;

    // UI Features
    enableArtifacts: boolean;
    enableCodeFold: boolean;
    enableAutoGenerateTitle: boolean;
    disablePromptHint: boolean;
    dontShowMaskSplashScreen: boolean;
    hideBuiltinMasks: boolean;

    // Chat Features
    enableMemory: boolean;
    enableStreaming: boolean;
    enableMarkdown: boolean;
    enableCopyCode: boolean;

    // Advanced Features
    enablePlugins: boolean;
    enableMCP: boolean;
    enableTTS: boolean;
    enableRealtimeChat: boolean;

    // Security Features
    enableApiKeyValidation: boolean;
    enableRateLimiting: boolean;
    enableContentFiltering: boolean;

    // Admin Features
    enableAdminPanel: boolean;
    enableUserManagement: boolean;
    enableAnalytics: boolean;
  };
  // User Modifications
  modifications: {
    customPrompts: number;
    customMasks: number;
    customBots: number;
    customPlugins: number;
    customModels: number;
    customEndpoints: number;
    customConfigs: number;
  };
  // System Status
  status: {
    isAuthorized: boolean;
    hasAccessCode: boolean;
    lastUpdate: number;
  };
}

export class SystemController {
  private static instance: SystemController;
  private state: SystemState;

  private constructor() {
    this.state = this.initializeState();
  }

  public static getInstance(): SystemController {
    if (!SystemController.instance) {
      SystemController.instance = new SystemController();
    }
    return SystemController.instance;
  }

  private initializeState(): SystemState {
    const featureStore = useFeatureStore.getState();
    const accessStore = useAccessStore.getState();

    return {
      features: {
        // User Capabilities
        enableCustomPrompts: featureStore.isFeatureEnabled(
          "enableCustomPrompts",
        ),
        enableCustomMasks: featureStore.isFeatureEnabled("enableCustomMasks"),
        enableCustomBots: featureStore.isFeatureEnabled("enableCustomBots"),

        // UI Features
        enableArtifacts: featureStore.isFeatureEnabled("enableArtifacts"),
        enableCodeFold: featureStore.isFeatureEnabled("enableCodeFold"),
        enableAutoGenerateTitle: featureStore.isFeatureEnabled(
          "enableAutoGenerateTitle",
        ),
        disablePromptHint: featureStore.isFeatureEnabled("disablePromptHint"),
        dontShowMaskSplashScreen: featureStore.isFeatureEnabled(
          "dontShowMaskSplashScreen",
        ),
        hideBuiltinMasks: featureStore.isFeatureEnabled("hideBuiltinMasks"),

        // Chat Features
        enableMemory: featureStore.isFeatureEnabled("enableMemory"),
        enableStreaming: featureStore.isFeatureEnabled("enableStreaming"),
        enableMarkdown: featureStore.isFeatureEnabled("enableMarkdown"),
        enableCopyCode: featureStore.isFeatureEnabled("enableCopyCode"),

        // Advanced Features
        enablePlugins: featureStore.isFeatureEnabled("enablePlugins"),
        enableMCP: featureStore.isFeatureEnabled("enableMCP"),
        enableTTS: featureStore.isFeatureEnabled("enableTTS"),
        enableRealtimeChat: featureStore.isFeatureEnabled("enableRealtimeChat"),

        // Security Features
        enableApiKeyValidation: featureStore.isFeatureEnabled(
          "enableApiKeyValidation",
        ),
        enableRateLimiting: featureStore.isFeatureEnabled("enableRateLimiting"),
        enableContentFiltering: featureStore.isFeatureEnabled(
          "enableContentFiltering",
        ),

        // Admin Features
        enableAdminPanel: featureStore.isFeatureEnabled("enableAdminPanel"),
        enableUserManagement: featureStore.isFeatureEnabled(
          "enableUserManagement",
        ),
        enableAnalytics: featureStore.isFeatureEnabled("enableAnalytics"),
      },
      modifications: {
        customPrompts: 0,
        customMasks: 0,
        customBots: 0,
        customPlugins: 0,
        customModels: 0,
        customEndpoints: 0,
        customConfigs: 0,
      },
      status: {
        isAuthorized: accessStore.isAuthorized(),
        hasAccessCode: accessStore.accessCode.length > 0,
        lastUpdate: Date.now(),
      },
    };
  }

  // Feature Management Methods
  public updateFeature(
    feature: keyof SystemState["features"],
    enabled: boolean,
  ): void {
    const featureStore = useFeatureStore.getState();
    featureStore.updateFeature(feature, enabled);
    this.state.features[feature] = enabled;
    this.state.status.lastUpdate = Date.now();
  }

  public toggleFeature(feature: keyof SystemState["features"]): void {
    this.updateFeature(feature, !this.state.features[feature]);
  }

  // Modification Tracking Methods
  public incrementModification(type: keyof SystemState["modifications"]): void {
    this.state.modifications[type]++;
    this.state.status.lastUpdate = Date.now();
  }

  public decrementModification(type: keyof SystemState["modifications"]): void {
    if (this.state.modifications[type] > 0) {
      this.state.modifications[type]--;
      this.state.status.lastUpdate = Date.now();
    }
  }

  // Status Management Methods
  public updateStatus(status: Partial<SystemState["status"]>): void {
    this.state.status = { ...this.state.status, ...status };
    this.state.status.lastUpdate = Date.now();
  }

  // Getters
  public getState(): SystemState {
    return { ...this.state };
  }

  public getFeature(feature: keyof SystemState["features"]): boolean {
    return this.state.features[feature];
  }

  public getModificationCount(
    type: keyof SystemState["modifications"],
  ): number {
    return this.state.modifications[type];
  }

  public getStatus(): SystemState["status"] {
    return { ...this.state.status };
  }

  // Validation Methods
  public canCreateCustomPrompt(): boolean {
    return (
      this.state.features.enableCustomPrompts && this.state.status.isAuthorized
    );
  }

  public canCreateCustomMask(): boolean {
    return (
      this.state.features.enableCustomMasks && this.state.status.isAuthorized
    );
  }

  public canCreateCustomBot(): boolean {
    return (
      this.state.features.enableCustomBots && this.state.status.isAuthorized
    );
  }

  public canCreateCustomPlugin(): boolean {
    return this.state.features.enablePlugins && this.state.status.isAuthorized;
  }

  // Reset Methods
  public resetFeatures(): void {
    const featureStore = useFeatureStore.getState();
    featureStore.reset();
    this.state = this.initializeState();
  }

  public resetModifications(): void {
    this.state.modifications = {
      customPrompts: 0,
      customMasks: 0,
      customBots: 0,
      customPlugins: 0,
      customModels: 0,
      customEndpoints: 0,
      customConfigs: 0,
    };
    this.state.status.lastUpdate = Date.now();
  }
}

// Export a singleton instance
export const systemController = SystemController.getInstance();
