import { createClient } from "@supabase/supabase-js";

import { publicConfig } from "@/config/public-config";
import type { Database } from "./types";

export const supabase = createClient<Database>(
  publicConfig.supabaseUrl,
  publicConfig.supabasePublishableKey,
);
