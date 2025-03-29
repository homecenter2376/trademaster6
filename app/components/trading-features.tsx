import { useAccessControl } from "../hooks/use-access-control";
import { Card, List, Typography, Tag, Progress } from "antd";
import {
  LineChartOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  WalletOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
  BellOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { FeatureConfig } from "../config/features";
import { AccessLevel } from "../services/access-control";

const { Title, Text } = Typography;

interface TradingFeature {
  name: string;
  icon: React.ReactNode;
  feature: keyof FeatureConfig;
  limit: keyof AccessLevel["limits"];
  description: string;
}

export function TradingFeaturesPanel() {
  const {
    currentLevel,
    limits,
    canAccessFeature,
    isLimitExceeded,
    getRemainingLimit,
  } = useAccessControl();

  const tradingFeatures: TradingFeature[] = [
    {
      name: "Chart Analysis",
      icon: <LineChartOutlined />,
      feature: "enableChartAnalysis",
      limit: "maxChartAnalysisPerDay",
      description: "Advanced technical analysis and chart pattern recognition",
    },
    {
      name: "Market Sentiment",
      icon: <BarChartOutlined />,
      feature: "enableMarketSentiment",
      limit: "maxMarketSentimentAnalysisPerDay",
      description: "AI-powered market sentiment analysis and trend prediction",
    },
    {
      name: "Trading Signals",
      icon: <ThunderboltOutlined />,
      feature: "enableTradingSignals",
      limit: "maxTradingSignalsPerDay",
      description:
        "Generate trading signals based on technical and fundamental analysis",
    },
    {
      name: "Portfolio Management",
      icon: <WalletOutlined />,
      feature: "enablePortfolioManagement",
      limit: "maxPortfolioUpdatesPerDay",
      description: "Track and optimize your investment portfolio",
    },
    {
      name: "Risk Analysis",
      icon: <SafetyCertificateOutlined />,
      feature: "enableRiskAnalysis",
      limit: "maxChartAnalysisPerDay",
      description: "Advanced risk assessment and position sizing tools",
    },
    {
      name: "Backtesting",
      icon: <ExperimentOutlined />,
      feature: "enableBacktesting",
      limit: "maxBacktestingRunsPerDay",
      description: "Test trading strategies on historical data",
    },
    {
      name: "Real-time Alerts",
      icon: <BellOutlined />,
      feature: "enableRealTimeAlerts",
      limit: "maxRealTimeAlerts",
      description:
        "Get notified about market conditions and trading opportunities",
    },
    {
      name: "Custom Indicators",
      icon: <ToolOutlined />,
      feature: "enableCustomIndicators",
      limit: "maxCustomIndicators",
      description: "Create and use custom technical indicators",
    },
  ];

  return (
    <Card>
      <Title level={3}>Trading Tools</Title>
      <Text>Current Access Level: {currentLevel}</Text>

      <List
        className="mt-4"
        dataSource={tradingFeatures}
        renderItem={(item: TradingFeature) => {
          const hasAccess = canAccessFeature(item.feature);
          const limit = limits[item.limit];
          const remaining = getRemainingLimit(item.limit, 0);
          const usagePercentage =
            limit === undefined || limit === Infinity
              ? 0
              : (remaining / limit) * 100;

          return (
            <List.Item
              key={item.name}
              actions={[
                <Tag key="status" color={hasAccess ? "success" : "default"}>
                  {hasAccess ? "Enabled" : "Disabled"}
                </Tag>,
              ]}
            >
              <List.Item.Meta
                avatar={item.icon}
                title={item.name}
                description={
                  <>
                    <Text>{item.description}</Text>
                    {limit !== undefined && (
                      <div className="mt-2">
                        <Progress
                          percent={usagePercentage}
                          size="small"
                          status={usagePercentage < 20 ? "exception" : "normal"}
                        />
                        <Text className="ml-2">
                          {limit === Infinity
                            ? "Unlimited"
                            : `${remaining}/${limit} remaining`}
                        </Text>
                      </div>
                    )}
                  </>
                }
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
