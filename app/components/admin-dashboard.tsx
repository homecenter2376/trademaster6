import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Statistic,
  Row,
  Col,
  Typography,
} from "antd";
import { supabase, UserProfile, UserUsage } from "../lib/supabase";
import { useAccessControl } from "../hooks/use-access-control";

const { Title } = Typography;
const { Option } = Select;

export function AdminDashboard() {
  const { currentLevel } = useAccessControl();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usage, setUsage] = useState<UserUsage[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentLevel === "admin") {
      fetchUsers();
      fetchUsage();
    }
  }, [currentLevel]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    setUsers(data || []);
  };

  const fetchUsage = async () => {
    const { data, error } = await supabase
      .from("user_usage")
      .select("*")
      .order("last_used", { ascending: false });

    if (error) {
      console.error("Error fetching usage:", error);
      return;
    }

    setUsage(data || []);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    form.setFieldsValue(user);
    setIsModalVisible(true);
  };

  const handleUpdateUser = async (values: any) => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from("user_profiles")
      .update(values)
      .eq("id", selectedUser.id);

    if (error) {
      console.error("Error updating user:", error);
      return;
    }

    setIsModalVisible(false);
    fetchUsers();
  };

  const columns = [
    {
      title: "User",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Subscription",
      dataIndex: "subscription_tier",
      key: "subscription_tier",
      render: (tier: string) => (
        <Tag
          color={
            tier === "admin"
              ? "red"
              : tier === "premium"
              ? "gold"
              : tier === "basic"
              ? "blue"
              : "default"
          }
        >
          {tier.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "subscription_status",
      key: "subscription_status",
      render: (status: string) => (
        <Tag
          color={
            status === "active"
              ? "green"
              : status === "trial"
              ? "orange"
              : "red"
          }
        >
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: UserProfile) => (
        <Button type="link" onClick={() => handleEditUser(record)}>
          Edit
        </Button>
      ),
    },
  ];

  const usageColumns = [
    {
      title: "User",
      dataIndex: "user_id",
      key: "user_id",
      render: (userId: string) => {
        const user = users.find((u) => u.id === userId);
        return user?.full_name || userId;
      },
    },
    {
      title: "Feature",
      dataIndex: "feature",
      key: "feature",
    },
    {
      title: "Usage Count",
      dataIndex: "usage_count",
      key: "usage_count",
    },
    {
      title: "Last Used",
      dataIndex: "last_used",
      key: "last_used",
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  if (currentLevel !== "admin") {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="p-6">
      <Title level={2}>Admin Dashboard</Title>

      <Row gutter={[16, 16]} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic title="Total Users" value={users.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Premium Users"
              value={
                users.filter((u) => u.subscription_tier === "premium").length
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Basic Users"
              value={
                users.filter((u) => u.subscription_tier === "basic").length
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={
                users.filter((u) => u.subscription_status === "active").length
              }
            />
          </Card>
        </Col>
      </Row>

      <Card title="User Management" className="mb-6">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card title="Feature Usage">
        <Table
          columns={usageColumns}
          dataSource={usage}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Edit User"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleUpdateUser} layout="vertical">
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="subscription_tier"
            label="Subscription Tier"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="public">Public</Option>
              <Option value="basic">Basic</Option>
              <Option value="premium">Premium</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="subscription_status"
            label="Subscription Status"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="trial">Trial</Option>
            </Select>
          </Form.Item>

          <Form.Item name="subscription_end_date" label="Subscription End Date">
            <DatePicker />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Update
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
