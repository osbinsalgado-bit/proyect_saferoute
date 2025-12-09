import { createClient } from "@supabase/supabase-js";
import {SUPABASE_URL_ENV, SUPABASE_ANON_KEY_ENV} from  "@env";

export const supabase = createClient(SUPABASE_URL_ENV,SUPABASE_ANON_KEY_ENV);