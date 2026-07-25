import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import InstructorDashboard from "./InstructorDashboard";

export default function InstructorIndex() {
  const { hasRole } = useAuth();
  if (hasRole("support") && !hasRole("instructor", "admin", "owner")) {
    return <Navigate to="/instrutor/atendimento" replace />;
  }
  return <InstructorDashboard />;
}
