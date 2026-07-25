import { supabase } from "@/integrations/supabase/client";

export const db = supabase as any;

export type AppRole = "student" | "instructor" | "support" | "admin" | "owner";
export type CourseStatus = "draft" | "review" | "published" | "archived";
export type TicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
}

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  cover_image_path: string | null;
  category: string | null;
  level: string | null;
  workload_minutes: number;
  status: CourseStatus;
  published_at: string | null;
}

export interface EnrollmentSummary {
  id: string;
  course_id: string;
  status: string;
  progress_percent: number;
  enrolled_at: string;
  last_accessed_at: string | null;
  courses: CourseSummary;
}

export interface InstructorMetrics {
  period: { from: string; to: string };
  courses_count: number;
  published_courses: number;
  total_students: number;
  new_students: number;
  average_progress: number;
  completed_enrollments: number;
  sales_count: number;
  gross_revenue_cents: number;
  average_ticket_cents: number;
  open_tickets: number;
  urgent_tickets: number;
  abandoned_carts: number;
}

export function formatCurrency(cents: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format((Number(cents) || 0) / 100);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
