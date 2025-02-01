// lib/auth.ts
import { supabase } from './supabase';

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};