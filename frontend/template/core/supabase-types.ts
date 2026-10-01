// Type stand-ins for '@supabase/supabase-js' (no longer installed).
export type User = any;
export type Session = any;
export type SupabaseClient = any;
export class FunctionsHttpError extends Error {
  context: any;
  constructor(message = "Function error", context?: any) {
    super(message);
    this.context = context;
  }
}
