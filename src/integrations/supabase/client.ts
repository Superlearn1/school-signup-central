// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://bssiyrqombhhnvhwgkhz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2l5cnFvbWJoaG52aHdna2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTYxNTQsImV4cCI6MjA1OTMzMjE1NH0.lwJGE6T-Zse2BqYLwB2STZDzZ2guoI8wAQvRlYD5L2M";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
