(function () {
  function criarClienteSupabase(config) {
    if (!window.supabase || !config?.url || !config?.anonKey) return null;

    try {
      return window.supabase.createClient(config.url, config.anonKey, {
        realtime: { params: { eventsPerSecond: 10 } },
      });
    } catch (erro) {
      console.error("Erro ao iniciar Supabase:", erro);
      return null;
    }
  }

  window.SUPABASE_DEFAULT_CONFIG = {
    url: "",
    anonKey: "",
  };

  window.criarClienteSupabase = criarClienteSupabase;
})();
