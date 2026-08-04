import { describe, expect, it, vi } from "vitest";

import { publicCourseCatalogSchema } from "@/contracts/public-course-catalog";
import {
  ciRuntimeSmokeCatalog,
  ciRuntimeSmokeCourseTitle,
} from "@/runtime/ci-runtime-smoke-catalog";
import { loadPublicCourseCatalog } from "@/runtime/load-public-course-catalog";

describe("ci runtime smoke catalog", () => {
  it("satisfaz o contrato público com totais derivados coerentes", () => {
    const parsed = publicCourseCatalogSchema.parse(ciRuntimeSmokeCatalog);

    expect(parsed.courses).toHaveLength(1);
    expect(parsed.courses[0]?.title).toBe(ciRuntimeSmokeCourseTitle);
    expect(parsed.courses[0]?.module_count).toBe(1);
    expect(parsed.courses[0]?.lesson_count).toBe(2);
    expect(parsed.courses[0]?.duration_minutes).toBe(90);
    expect(parsed.courses[0]?.preview_lesson_count).toBe(1);
  });

  it("é explicitamente sintético e não representa oferta persistida", () => {
    const course = ciRuntimeSmokeCatalog.courses.at(0);
    if (!course) {
      throw new Error("A fixture sintética deve possuir exatamente um curso.");
    }

    expect(course.slug).toBe("curso-validacao-runtime");
    expect(course.description).toContain("nunca é usado fora do smoke sintético");
  });

  it("não invoca a RPC no modo sintético", async () => {
    const executeRpc = vi.fn(async () => ({
      data: null,
      error: new Error("A RPC não deveria ser chamada."),
    }));

    const catalog = await loadPublicCourseCatalog(true, executeRpc);

    expect(executeRpc).not.toHaveBeenCalled();
    expect(catalog.courses[0]?.title).toBe(ciRuntimeSmokeCourseTitle);
  });

  it("mantém a RPC real fora do modo sintético", async () => {
    const executeRpc = vi.fn(async () => ({
      data: ciRuntimeSmokeCatalog,
      error: null,
    }));

    const catalog = await loadPublicCourseCatalog(false, executeRpc);

    expect(executeRpc).toHaveBeenCalledTimes(1);
    expect(catalog).toEqual(ciRuntimeSmokeCatalog);
  });
});
