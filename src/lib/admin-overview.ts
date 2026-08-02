export type AdminLifecycleStatus = "draft" | "published" | "archived";
export type AdminEnrollmentStatus = "pending" | "active" | "suspended" | "revoked";
export type AdminCertificateStatus = "issued" | "revoked";

export interface AdminOverviewInput {
  payments: {
    summary: {
      total_orders: number;
      pending_orders: number;
      paid_orders: number;
      confirmed_amount_cents: number;
      refunded_amount_cents: number;
      chargeback_lost_amount_cents: number;
    };
  };
  students: {
    students: readonly unknown[];
    enrollments: readonly {
      status: AdminEnrollmentStatus;
      completion: { completion_percent: number };
    }[];
    certificates: readonly { status: AdminCertificateStatus }[];
  };
  courses: readonly { status: AdminLifecycleStatus }[];
  products: readonly { status: AdminLifecycleStatus }[];
  support: {
    summary: {
      awaiting_support: number;
      awaiting_student: number;
      urgent: number;
    };
  };
  contacts: {
    summary: {
      new: number;
      in_progress: number;
      resolved: number;
      spam: number;
    };
  };
}

const countByStatus = <T extends string>(
  values: readonly { status: T }[],
  status: T,
): number => values.filter((value) => value.status === status).length;

export const buildAdminOverview = (input: AdminOverviewInput) => {
  const completionTotal = input.students.enrollments.reduce(
    (total, enrollment) => total + enrollment.completion.completion_percent,
    0,
  );
  const averageCompletionPercent =
    input.students.enrollments.length === 0
      ? 0
      : Math.round(completionTotal / input.students.enrollments.length);

  const awaitingSupport = input.support.summary.awaiting_support;
  const newContacts = input.contacts.summary.new;
  const pendingOrders = input.payments.summary.pending_orders;

  return {
    finance: {
      totalOrders: input.payments.summary.total_orders,
      pendingOrders,
      paidOrders: input.payments.summary.paid_orders,
      confirmedAmountCents: input.payments.summary.confirmed_amount_cents,
      refundedAmountCents: input.payments.summary.refunded_amount_cents,
      chargebackLostAmountCents:
        input.payments.summary.chargeback_lost_amount_cents,
    },
    academic: {
      totalStudents: input.students.students.length,
      totalEnrollments: input.students.enrollments.length,
      activeEnrollments: countByStatus(input.students.enrollments, "active"),
      suspendedEnrollments: countByStatus(
        input.students.enrollments,
        "suspended",
      ),
      validCertificates: countByStatus(input.students.certificates, "issued"),
      averageCompletionPercent,
    },
    catalogue: {
      totalCourses: input.courses.length,
      publishedCourses: countByStatus(input.courses, "published"),
      draftCourses: countByStatus(input.courses, "draft"),
      archivedCourses: countByStatus(input.courses, "archived"),
      totalProducts: input.products.length,
      publishedProducts: countByStatus(input.products, "published"),
      draftProducts: countByStatus(input.products, "draft"),
      archivedProducts: countByStatus(input.products, "archived"),
    },
    operations: {
      awaitingSupport,
      awaitingStudent: input.support.summary.awaiting_student,
      urgentSupport: input.support.summary.urgent,
      newContacts,
      contactsInProgress: input.contacts.summary.in_progress,
      resolvedContacts: input.contacts.summary.resolved,
      operationalQueue: pendingOrders + awaitingSupport + newContacts,
    },
  };
};

export type AdminOverview = ReturnType<typeof buildAdminOverview>;
