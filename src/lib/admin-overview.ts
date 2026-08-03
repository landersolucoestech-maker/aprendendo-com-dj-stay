export type AdminLifecycleStatus = "draft" | "published" | "archived";

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
    totals: {
      students: number;
      enrollments: number;
      certificates: number;
      valid_certificates: number;
    };
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
      totalStudents: input.students.totals.students,
      totalEnrollments: input.students.totals.enrollments,
      totalCertificates: input.students.totals.certificates,
      validCertificates: input.students.totals.valid_certificates,
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
