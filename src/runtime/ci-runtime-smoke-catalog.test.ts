import { describe, expect, it } from "vitest";

import { publicCourseCatalogSchema } from "@/contracts/public-course-catalog";
import {
  ciRuntimeSmokeCatalog,
  ciRuntimeSmokeCourseTitle,
} from "@/runtime/ci-runtime-smoke-catalog";

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
    const course = ciRuntimeSmokeCatalog.courses[0];

    expect(course.slug).toBe("curso-validacao-runtime");
    expect(course.description).toContain("nunca é usado fora do smoke sintético");
  });
});
