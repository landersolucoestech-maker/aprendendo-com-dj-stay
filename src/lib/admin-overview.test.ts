import { describe, expect, it } from "vitest";

import { buildAdminOverview, type AdminOverviewInput } from "./admin-overview";

const emptyInput: AdminOverviewInput = {
  payments: {
    summary: {
      total_orders: 0,
      pending_orders: 0,
      paid_orders: 0,
      confirmed_amount_cents: 0,
      refunded_amount_cents: 0,
      chargeback_lost_amount_cents: 0,
    },
  },
  students: {
    students: [],
    enrollments: [],
    certificates: [],
  },
  courses: [],
  products: [],
  support: {
    summary: {
      awaiting_support: 0,
      awaiting_student: 0,
      urgent: 0,
    },
  },
  contacts: {
    summary: {
      new: 0,
      in_progress: 0,
      resolved: 0,
      spam: 0,
    },
  },
};

describe("buildAdminOverview", () => {
  it("returns a zeroed overview for an empty operation", () => {
    const overview = buildAdminOverview(emptyInput);

    expect(overview.finance.confirmedAmountCents).toBe(0);
    expect(overview.academic.averageCompletionPercent).toBe(0);
    expect(overview.catalogue.totalCourses).toBe(0);
    expect(overview.operations.operationalQueue).toBe(0);
  });

  it("aggregates only persisted statuses and read-model totals", () => {
    const overview = buildAdminOverview({
      payments: {
        summary: {
          total_orders: 12,
          pending_orders: 3,
          paid_orders: 7,
          confirmed_amount_cents: 450_000,
          refunded_amount_cents: 25_000,
          chargeback_lost_amount_cents: 10_000,
        },
      },
      students: {
        students: [{}, {}, {}],
        enrollments: [
          { status: "active", completion: { completion_percent: 80 } },
          { status: "active", completion: { completion_percent: 40 } },
          { status: "suspended", completion: { completion_percent: 30 } },
        ],
        certificates: [{ status: "issued" }, { status: "revoked" }],
      },
      courses: [
        { status: "published" },
        { status: "draft" },
        { status: "archived" },
      ],
      products: [
        { status: "published" },
        { status: "published" },
        { status: "draft" },
      ],
      support: {
        summary: {
          awaiting_support: 4,
          awaiting_student: 2,
          urgent: 1,
        },
      },
      contacts: {
        summary: {
          new: 5,
          in_progress: 2,
          resolved: 10,
          spam: 1,
        },
      },
    });

    expect(overview.finance).toMatchObject({
      totalOrders: 12,
      pendingOrders: 3,
      paidOrders: 7,
      confirmedAmountCents: 450_000,
    });
    expect(overview.academic).toMatchObject({
      totalStudents: 3,
      totalEnrollments: 3,
      activeEnrollments: 2,
      suspendedEnrollments: 1,
      validCertificates: 1,
      averageCompletionPercent: 50,
    });
    expect(overview.catalogue).toMatchObject({
      totalCourses: 3,
      publishedCourses: 1,
      totalProducts: 3,
      publishedProducts: 2,
    });
    expect(overview.operations.operationalQueue).toBe(12);
  });
});
