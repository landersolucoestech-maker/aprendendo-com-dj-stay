import StudentActivityHistory from "@/pages/student/StudentActivityHistory";
import StudentFinancialPortal from "@/pages/student/StudentFinancialPortal";
import StudentPortal, {
  type StudentPortalSection,
} from "@/pages/student/StudentPortal";

interface StudentPortalRouterProps {
  readonly section: StudentPortalSection;
}

const StudentPortalRouter = ({ section }: StudentPortalRouterProps) => {
  if (section === "orders" || section === "payments") {
    return <StudentFinancialPortal section={section} />;
  }

  if (section === "history") {
    return <StudentActivityHistory />;
  }

  return <StudentPortal section={section} />;
};

export default StudentPortalRouter;
