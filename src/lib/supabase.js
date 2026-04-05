import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yzqdpfauadbtutkhxzeu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bcxeo5JzQkh4KDl1LKZTCg_IX1wU7wK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
