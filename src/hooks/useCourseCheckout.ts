import { useMutation } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  courseCheckoutResolutionSchema,
  courseCheckoutSlugSchema,
  courseCheckoutStartResultSchema,
  type CourseCheckoutStartResult,
} from "@/contracts/course-checkout";
import { supabase } from "@/integrations/supabase/client";
import {
  createHostedCheckout,
  getHostedCheckoutIdempotencyKey,
} from "@/hooks/useHostedCheckout";

export const startCourseHostedCheckout = async (
  courseSlug: string,
): Promise<CourseCheckoutStartResult> => {
  const slug = courseCheckoutSlugSchema.parse(courseSlug);
  const { data, error } = await supabase.rpc(
    "resolve_course_checkout_subject",
    { p_course_slug: slug },
  );
  if (error) throw error;

  const resolution = parseDataContract(
    courseCheckoutResolutionSchema,
    data,
    "resolução autenticada do curso para checkout",
  );

  if (resolution.already_enrolled) {
    return parseDataContract(
      courseCheckoutStartResultSchema,
      {
        status: "already_enrolled",
        slug: resolution.slug,
        title: resolution.title,
      },
      "resultado de curso já matriculado",
    );
  }

  if (!resolution.checkout_eligible || resolution.course_id === null) {
    throw new Error("COURSE_CHECKOUT_RESOLUTION_INVALID");
  }

  const checkout = await createHostedCheckout({
    subjectType: "course",
    subjectId: resolution.course_id,
    licenseId: null,
    idempotencyKey: getHostedCheckoutIdempotencyKey(
      "course",
      resolution.course_id,
      null,
    ),
  });

  return parseDataContract(
    courseCheckoutStartResultSchema,
    {
      ...checkout,
      slug: resolution.slug,
      title: resolution.title,
    },
    "resultado do checkout hospedado de curso",
  );
};

export const useCourseCheckout = () =>
  useMutation({ mutationFn: startCourseHostedCheckout });
