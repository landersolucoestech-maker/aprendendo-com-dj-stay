import type { Database as GeneratedDatabase, Json } from "./types";

type StudentReadModelFunctions = {
  get_student_progress_summary: {
    Args: never;
    Returns: Json;
  };
  get_student_course_access: {
    Args: {
      p_active_limit?: number;
      p_limit?: number;
      p_offset?: number;
    };
    Returns: Json;
  };
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: GeneratedDatabase["public"]["Functions"] &
      StudentReadModelFunctions;
  };
};
