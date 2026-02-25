import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vzuxutnrslptszqsxtbv.supabase.co';
const supabaseAnonKey = 'sb_publishable_beKrbbyyrkb_9T3I5Ghgyw_F7S9qYFs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
