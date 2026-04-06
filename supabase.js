window.criarSupabase = (url, key) => {
  return window.supabase.createClient(url, key);
};
