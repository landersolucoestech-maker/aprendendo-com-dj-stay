import { describe, expect, it } from "vitest";

import { studentLibraryPageSchema } from "@/contracts/student-library-page";

const ASSET = {
  id: "b1090000-0000-4000-8000-000000000001",
  owner_user_id: "b1090000-0000-4000-8000-000000000002",
  created_by_user_id: "b1090000-0000-4000-8000-000000000002",
  lesson_id: "b1090000-0000-4000-8000-000000000003",
  purpose: "document",
  state: "published",
  bucket_id: "private-assets",
  object_path:
    "v1/b1090000-0000-4000-8000-000000000002/b1090000-0000-4000-8000-000000000001.pdf",
  original_name: "material-b109.pdf",
  normalized_name: "material-b109.pdf",
  extension: "pdf",
  mime_type: "application/pdf",
  size_bytes: 1024,
  checksum_sha256: null,
  idempotency_key: "asset:document:1234567890",
  metadata: {},
  failure_reason: null,
  created_at: "2026-08-03T15:00:00-03:00",
  updated_at: "2026-08-03T15:05:00-03:00",
  uploaded_at: "2026-08-03T15:01:00-03:00",
  processing_started_at: null,
  published_at: "2026-08-03T15:05:00-03:00",
  failed_at: null,
  deleted_at: null,
} as const;

describe("studentLibraryPageSchema", () => {
  it("aceita biblioteca vazia coerente", () => {
    const page = { total: 0, assets: [] };
    expect(studentLibraryPageSchema.parse(page)).toEqual(page);
  });

  it("aceita página menor que o total persistido", () => {
    const page = { total: 45, assets: [ASSET] };
    expect(studentLibraryPageSchema.parse(page)).toEqual(page);
  });

  it("rejeita página maior que o total persistido", () => {
    expect(
      studentLibraryPageSchema.safeParse({ total: 0, assets: [ASSET] }).success,
    ).toBe(false);
  });

  it("rejeita total negativo ou fracionário", () => {
    expect(
      studentLibraryPageSchema.safeParse({ total: -1, assets: [] }).success,
    ).toBe(false);
    expect(
      studentLibraryPageSchema.safeParse({ total: 0.5, assets: [] }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      studentLibraryPageSchema.safeParse({
        total: 1,
        assets: [ASSET],
        cursor: "interno",
      }).success,
    ).toBe(false);
  });
});
