import StudentActivityHistory from "@/pages/student/StudentActivityHistory";
import StudentCoursesPage from "@/pages/student/StudentCoursesPage";
import StudentDashboardPage from "@/pages/student/StudentDashboardPage";
import StudentFinancialPortal from "@/pages/student/StudentFinancialPortal";
import StudentLibraryPage from "@/pages/student/StudentLibraryPage";
import StudentPortal, {
  type StudentPortalSection,
} from "@/pages/student/StudentPortal";

interface StudentPortalRouterProps {
  readonly section: StudentPortalSection;
}

const StudentPortalRouter = ({ section }: StudentPortalRouterProps) => {
  if (section === "dashboard") {
    return <StudentDashboardPage />;
  }

  if (section === "courses") {
    return <StudentCoursesPage />;
  }

  if (section === "orders" || section === "payments") {
    return <StudentFinancialPortal section={section} />;
  }

  if (section === "history") {
    return <StudentActivityHistory />;
  }

  if (section === "library") {
    return <StudentLibraryPage />;
  }

  return <StudentPortal section={section} />;
};

export default StudentPortalRouter;
