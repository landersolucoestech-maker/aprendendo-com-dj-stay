import StudentActivityHistory from "@/pages/student/StudentActivityHistory";
import StudentCoursePage from "@/pages/student/StudentCoursePage";
import StudentCoursesPage from "@/pages/student/StudentCoursesPage";
import StudentDashboardPage from "@/pages/student/StudentDashboardPage";
import StudentFinancialPortal from "@/pages/student/StudentFinancialPortal";
import StudentLibraryPage from "@/pages/student/StudentLibraryPage";
import StudentProfilePage from "@/pages/student/StudentProfilePage";

export type StudentPortalSection =
  | "dashboard"
  | "courses"
  | "course"
  | "library"
  | "orders"
  | "payments"
  | "profile"
  | "history";

interface StudentPortalRouterProps {
  readonly section: StudentPortalSection;
}

const StudentPortalRouter = ({ section }: StudentPortalRouterProps) => {
  switch (section) {
    case "dashboard":
      return <StudentDashboardPage />;
    case "courses":
      return <StudentCoursesPage />;
    case "course":
      return <StudentCoursePage />;
    case "library":
      return <StudentLibraryPage />;
    case "orders":
    case "payments":
      return <StudentFinancialPortal section={section} />;
    case "profile":
      return <StudentProfilePage />;
    case "history":
      return <StudentActivityHistory />;
  }
};

export default StudentPortalRouter;
