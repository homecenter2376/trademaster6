import { AdminDashboard } from "../components/admin-dashboard";
import { useAccessControl } from "../hooks/use-access-control";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";

export default function AdminPage() {
  const { currentLevel } = useAccessControl();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentLevel !== "admin") {
      navigate(Path.Home);
    }
  }, [currentLevel, navigate]);

  if (currentLevel !== "admin") {
    return null;
  }

  return <AdminDashboard />;
}
