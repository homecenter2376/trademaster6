import { useAccessControl } from "../hooks/use-access-control";
import { Button, Card, List, Typography } from "antd";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import { AccessLevel } from "../services/access-control";
import { FeatureConfig } from "../config/features";

const { Title, Text } = Typography;

interface FeatureItem {
  name: string;
  feature: keyof FeatureConfig;
  limit: keyof AccessLevel["limits"];
  description: string;
}

export function AccessControlPanel() {
  const {
    currentLevel,
    limits,
    canAccessFeature,
    isLimitExceeded,
    getRemainingLimit,
  } = useAccessControl();

  const features: FeatureItem[] = [
    {
      name: "Custom Prompts",
      feature: "enableCustomPrompts",
      limit: "maxCustomPrompts",
      description: "Create and manage custom prompts",
    },
    {
      name: "Custom Masks",
      feature: "enableCustomMasks",
      limit: "maxCustomMasks",
      description: "Create and manage custom chat masks",
    },
    {
      name: "Custom Bots",
      feature: "enableCustomBots",
      limit: "maxCustomBots",
      description: "Create and manage custom chat bots",
    },
    {
      name: "Plugins",
      feature: "enablePlugins",
      limit: "maxCustomPlugins",
      description: "Use and create custom plugins",
    },
    {
      name: "Chat History",
      feature: "enableMemory",
      limit: "maxChatHistory",
      description: "Save and manage chat history",
    },
    {
      name: "Advanced Features",
      feature: "enableMCP",
      limit: "maxTokensPerRequest",
      description: "Access advanced AI features",
    },
  ];

  return (
    <Card>
      <Title level={3}>Access Control Panel</Title>
      <Text>Current Access Level: {currentLevel}</Text>

      <List
        className="mt-4"
        dataSource={features}
        renderItem={(item: FeatureItem) => {
          const hasAccess = canAccessFeature(item.feature);
          const limit = limits[item.limit];
          const remaining = getRemainingLimit(item.limit, 0);

          return (
            <List.Item
              actions={[
                <Button
                  key="access"
                  icon={hasAccess ? <UnlockOutlined /> : <LockOutlined />}
                  type={hasAccess ? "primary" : "default"}
                >
                  {hasAccess ? "Enabled" : "Disabled"}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={
                  <>
                    <Text>{item.description}</Text>
                    {limit !== undefined && (
                      <Text className="ml-2">
                        Limit: {limit === Infinity ? "Unlimited" : limit}
                        {remaining !== Infinity && ` (${remaining} remaining)`}
                      </Text>
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
