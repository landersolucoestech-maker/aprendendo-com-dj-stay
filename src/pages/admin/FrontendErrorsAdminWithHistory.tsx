import { FrontendErrorMaintenanceHistory } from "@/components/admin/FrontendErrorMaintenanceHistory";
import FrontendErrorsAdmin from "@/pages/admin/FrontendErrorsAdmin";

const FrontendErrorsAdminWithHistory = () => (
  <>
    <FrontendErrorsAdmin />
    <section className="bg-black px-4 pb-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <FrontendErrorMaintenanceHistory />
      </div>
    </section>
  </>
);

export default FrontendErrorsAdminWithHistory;
