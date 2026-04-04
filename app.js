(() => {
  const LIMITE_PEDIDOS_RECENTES = 120;
  const LIMITE_RESERVAS = 120;

  const state = {
    telaAtual: "home",
    filtroPedidos: "hoje",
    dataPedidos: "",
    produtos: [],
    clientes: [],
    pedidos: [],
    reservas: [],
    relatorioPedidos: [],
    resumoPedidos: "",
    resumoReservas: "",
    supabase: null,
    syncAtivo: false,
    subscriptions: [],
    loading: {
      produtos: false,
      clientes: false,
      pedidos: false,
      reservas: false,
      relatorio: false,
    },
    renderCache: Object.create(null),
    refreshTimers: Object.create(null),
  };

  const elementos = {
    tituloTela: document.getElementById("titulo-tela"),
    btnVoltar: document.getElementById("btn-voltar"),
    btnConfig: document.getElementById("btn-config"),
    screens: document.querySelectorAll(".screen"),

    formProduto: document.getElementById("form-produto"),
    produtoId: document.getElementById("produto-id"),
    produtoNome: document.getElementById("produto-nome"),
    produtoPreco: document.getElementById("produto-preco"),
    cancelarProduto: document.getElementById("cancelar-produto"),
    listaProdutos: document.getElementById("lista-produtos"),

    formCliente: document.getElementById("form-cliente"),
    clienteId: document.getElementById("cliente-id"),
    clienteNome: document.getElementById("cliente-nome"),
    clienteTelefone: document.getElementById("cliente-telefone"),
    cancelarCliente: document.getElementById("cancelar-cliente"),
    listaClientes: document.getElementById("lista-clientes"),
    datalistClientes: document.getElementById("clientes-lista"),

    formPedido: document.getElementById("form-pedido"),
    pedidoCliente: document.getElementById("pedido-cliente"),
    pedidoProduto: document.getElementById("pedido-produto"),
    pedidoQuantidade: document.getElementById("pedido-quantidade"),
    pedidoData: document.getElementById("pedido-data"),
    pedidoPagamento: document.getElementById("pedido-pagamento"),
    pedidoPago: document.getElementById("pedido-pago"),
    pedidoEntregue: document.getElementById("pedido-entregue"),
    pedidoFiltroData: document.getElementById("pedido-filtro-data"),
    resumoPedidos: document.getElementById("resumo-pedidos"),
    listaPedidos: document.getElementById("lista-pedidos"),
    filtrosPedidos: document.querySelectorAll(".btn-filtro"),

    formReserva: document.getElementById("form-reserva"),
    reservaCliente: document.getElementById("reserva-cliente"),
    reservaProduto: document.getElementById("reserva-produto"),
    reservaQuantidade: document.getElementById("reserva-quantidade"),
    reservaData: document.getElementById("reserva-data"),
    reservaPagamento: document.getElementById("reserva-pagamento"),
    reservaPago: document.getElementById("reserva-pago"),
    reservaEntregue: document.getElementById("reserva-entregue"),
    resumoReservas: document.getElementById("resumo-reservas"),
    listaReservas: document.getElementById("lista-reservas"),

    relatorioData: document.getElementById("relatorio-data"),
    mTotalPedidos: document.getElementById("m-total-pedidos"),
    mReceita: document.getElementById("m-receita"),
    mTotalPago: document.getElementById("m-total-pago"),
    mTotalPendente: document.getElementById("m-total-pendente"),
    mPorProduto: document.getElementById("m-por-produto"),

    formConfig: document.getElementById("form-config"),
    configUrl: document.getElementById("config-url"),
    configKey: document.getElementById("config-key"),
    statusSync: document.getElementById("status-sync"),
  };

  function hojeISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function amanhaISO() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function dataBonita(iso) {
    if (!iso) return "Sem data";
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function tituloTela(nomeTela) {
    return "Doces da Gabi";
  }

  function setHtmlSeguro(chave, elemento, html) {
    if (state.renderCache[chave] === html) return;
    state.renderCache[chave] = html;
    elemento.innerHTML = html;
  }

  function setTextoSeguro(chave, elemento, texto) {
    if (state.renderCache[chave] === texto) return;
    state.renderCache[chave] = texto;
    elemento.textContent = texto;
  }

  function setLoading(chave, ativo) {
    state.loading[chave] = ativo;
  }

  function limparCachePorPrefixo(prefixo) {
    Object.keys(state.renderCache).forEach((chave) => {
      if (chave.startsWith(prefixo)) delete state.renderCache[chave];
    });
  }

  function cardCarregando(texto) {
    return `<div class="vazio carregando" aria-busy="true">${texto}</div>`;
  }

  function estadoVazio(texto) {
    return `<div class="vazio">${texto}</div>`;
  }

  function classeStatusPago(pago) {
    if (pago === true) return "pago";
    if (pago === false) return "nao-pago";
    return "pendente";
  }

  function textoStatusPago(pago) {
    if (pago === true) return "Pago";
    if (pago === false) return "Não pago";
    return "Pendente";
  }

  function navegar(nomeTela) {
    state.telaAtual = nomeTela;
    elementos.screens.forEach((secao) => {
      secao.classList.toggle("active", secao.id === `screen-${nomeTela}`);
    });
    elementos.tituloTela.textContent = tituloTela(nomeTela);
    elementos.btnVoltar.classList.toggle("hidden", nomeTela === "home");
  }

  function carregarConfig() {
    try {
      const txt = localStorage.getItem("doces_sync_config");
      if (!txt) return { ...window.SUPABASE_DEFAULT_CONFIG };
      const cfg = JSON.parse(txt);
      return { url: cfg.url || "", anonKey: cfg.anonKey || "" };
    } catch {
      return { ...window.SUPABASE_DEFAULT_CONFIG };
    }
  }

  function salvarConfig(config) {
    localStorage.setItem("doces_sync_config", JSON.stringify(config));
  }

  function setStatusSync() {
    elementos.statusSync.textContent = state.syncAtivo
      ? "Sync: conectado em tempo real"
      : "Sync: não configurado ou indisponível";
  }

  function resumoPedidosAtual() {
    if (state.filtroPedidos === "amanha") return "Pedidos de amanhã";
    if (state.filtroPedidos === "todos") return `Mostrando os ${LIMITE_PEDIDOS_RECENTES} pedidos mais recentes`;
    if (state.filtroPedidos === "data") return `Pedidos de ${dataBonita(state.dataPedidos || hojeISO())}`;
    return "Pedidos de hoje";
  }

  function agendarAtualizacao(chave, callback, atraso = 180) {
    clearTimeout(state.refreshTimers[chave]);
    state.refreshTimers[chave] = window.setTimeout(callback, atraso);
  }

  function normalizarListaMovimentacoes(lista) {
    const copia = Array.isArray(lista) ? lista.slice() : [];
    copia.sort((a, b) => {
      if (a.data === b.data) return Number(b.id) - Number(a.id);
      return a.data.localeCompare(b.data);
    });
    return copia;
  }

  function renderListaMovimentacoes(lista, tipo) {
    if (!lista.length) return "";

    let html = "";
    let dataAtual = "";

    for (let i = 0; i < lista.length; i += 1) {
      const item = lista[i];
      if (item.data !== dataAtual) {
        dataAtual = item.data;
        html += `<h3 class="data-grupo">${dataBonita(dataAtual)}</h3>`;
      }

      html += `
        <article class="item">
          <h4>${item.cliente_nome}</h4>
          <p><strong>Produto:</strong> ${item.produto_nome}</p>
          <p><strong>Qtd:</strong> ${item.quantidade} | <strong>Pagamento:</strong> ${item.forma_pagamento}</p>
          <p><strong>Total:</strong> ${moeda(Number(item.preco_unitario) * Number(item.quantidade))}</p>
          <p class="status-linha">
            <span class="status ${classeStatusPago(item.pago)}">${textoStatusPago(item.pago)}</span>
            <span class="status ${item.entregue ? "pago" : "pendente"}">${item.entregue ? "Entregue" : "Não entregue"}</span>
          </p>
          <div class="acoes">
            ${
              tipo === "pedido"
                ? `<button class="btn-secundario" data-marcar-pago="${item.id}">Marcar como pago</button>
                   <button class="btn-secundario" data-marcar-entregue="${item.id}">Marcar como entregue</button>`
                : `<button class="btn-secundario" data-converter-pedido="${item.id}">Converter para Pedido</button>
                   <button class="btn-secundario" data-marcar-pago="${item.id}">Marcar como pago</button>
                   <button class="btn-secundario" data-marcar-entregue="${item.id}">Marcar como entregue</button>`
            }
            <button class="btn-secundario" data-excluir-mov="${item.id}">Excluir</button>
          </div>
        </article>
      `;
    }

    return html;
  }

  function renderProdutos() {
    if (state.loading.produtos && !state.produtos.length) {
      setHtmlSeguro("listaProdutos", elementos.listaProdutos, cardCarregando("Carregando produtos..."));
      return;
    }
    if (!state.produtos.length) {
      setHtmlSeguro("listaProdutos", elementos.listaProdutos, estadoVazio("Nenhum produto cadastrado."));
      return;
    }

    let html = "";
    for (let i = 0; i < state.produtos.length; i += 1) {
      const p = state.produtos[i];
      html += `
        <article class="item">
          <h4>${p.nome}</h4>
          <p><strong>Preço:</strong> ${moeda(p.preco)}</p>
          <div class="acoes">
            <button class="btn-secundario" data-editar-produto="${p.id}">Editar</button>
            <button class="btn-secundario" data-excluir-produto="${p.id}">Excluir</button>
          </div>
        </article>
      `;
    }
    setHtmlSeguro("listaProdutos", elementos.listaProdutos, html);
  }

  function renderClientes() {
    if (state.loading.clientes && !state.clientes.length) {
      setHtmlSeguro("listaClientes", elementos.listaClientes, cardCarregando("Carregando clientes..."));
      return;
    }
    if (!state.clientes.length) {
      setHtmlSeguro("listaClientes", elementos.listaClientes, estadoVazio("Nenhum cliente cadastrado."));
      return;
    }

    let html = "";
    for (let i = 0; i < state.clientes.length; i += 1) {
      const c = state.clientes[i];
      html += `
        <article class="item">
          <h4>${c.nome}</h4>
          <p><strong>Telefone:</strong> ${c.telefone || "-"}</p>
          <div class="acoes">
            <button class="btn-secundario" data-editar-cliente="${c.id}">Editar</button>
            <button class="btn-secundario" data-excluir-cliente="${c.id}">Excluir</button>
          </div>
        </article>
      `;
    }
    setHtmlSeguro("listaClientes", elementos.listaClientes, html);
  }

  function renderSelectProdutos() {
    let options = "";
    if (state.produtos.length) {
      options = '<option value="">Selecione...</option>';
      for (let i = 0; i < state.produtos.length; i += 1) {
        const p = state.produtos[i];
        options += `<option value="${p.id}">${p.nome} - ${moeda(p.preco)}</option>`;
      }
    } else {
      options = '<option value="">Cadastre um produto primeiro</option>';
    }

    setHtmlSeguro("pedidoProdutoOptions", elementos.pedidoProduto, options);
    setHtmlSeguro("reservaProdutoOptions", elementos.reservaProduto, options);
  }

  function renderDatalistClientes() {
    let html = "";
    for (let i = 0; i < state.clientes.length; i += 1) {
      html += `<option value="${state.clientes[i].nome}"></option>`;
    }
    setHtmlSeguro("clientesDatalist", elementos.datalistClientes, html);
  }

  function renderPedidos() {
    elementos.filtrosPedidos.forEach((botao) => {
      botao.classList.toggle("active", botao.dataset.filtro === state.filtroPedidos);
    });
    setTextoSeguro("resumoPedidosTexto", elementos.resumoPedidos, state.resumoPedidos);

    if (state.loading.pedidos && !state.pedidos.length) {
      setHtmlSeguro("listaPedidos", elementos.listaPedidos, cardCarregando("Carregando pedidos..."));
      return;
    }
    if (!state.pedidos.length) {
      setHtmlSeguro("listaPedidos", elementos.listaPedidos, estadoVazio("Nenhum pedido para este filtro."));
      return;
    }

    setHtmlSeguro("listaPedidos", elementos.listaPedidos, renderListaMovimentacoes(state.pedidos, "pedido"));
  }

  function renderReservas() {
    setTextoSeguro("resumoReservasTexto", elementos.resumoReservas, state.resumoReservas);

    if (state.loading.reservas && !state.reservas.length) {
      setHtmlSeguro("listaReservas", elementos.listaReservas, cardCarregando("Carregando reservas..."));
      return;
    }
    if (!state.reservas.length) {
      setHtmlSeguro("listaReservas", elementos.listaReservas, estadoVazio("Nenhuma reserva cadastrada."));
      return;
    }

    setHtmlSeguro("listaReservas", elementos.listaReservas, renderListaMovimentacoes(state.reservas, "reserva"));
  }

  function renderRelatorio() {
    if (state.loading.relatorio && !state.relatorioPedidos.length) {
      setTextoSeguro("mTotalPedidos", elementos.mTotalPedidos, "--");
      setTextoSeguro("mReceita", elementos.mReceita, "Carregando...");
      setTextoSeguro("mTotalPago", elementos.mTotalPago, "Carregando...");
      setTextoSeguro("mTotalPendente", elementos.mTotalPendente, "Carregando...");
      setHtmlSeguro("mPorProduto", elementos.mPorProduto, '<p class="descricao">Carregando relatório...</p>');
      return;
    }

    let receita = 0;
    let totalPago = 0;
    const porProduto = Object.create(null);

    for (let i = 0; i < state.relatorioPedidos.length; i += 1) {
      const pedido = state.relatorioPedidos[i];
      const totalItem = Number(pedido.preco_unitario) * Number(pedido.quantidade);
      receita += totalItem;
      if (pedido.pago) totalPago += totalItem;
      porProduto[pedido.produto_nome] = (porProduto[pedido.produto_nome] || 0) + Number(pedido.quantidade);
    }

    setTextoSeguro("mTotalPedidos", elementos.mTotalPedidos, String(state.relatorioPedidos.length));
    setTextoSeguro("mReceita", elementos.mReceita, moeda(receita));
    setTextoSeguro("mTotalPago", elementos.mTotalPago, moeda(totalPago));
    setTextoSeguro("mTotalPendente", elementos.mTotalPendente, moeda(receita - totalPago));

    const produtos = Object.entries(porProduto).sort((a, b) => b[1] - a[1]);
    if (!produtos.length) {
      setHtmlSeguro("mPorProduto", elementos.mPorProduto, '<p class="descricao">Sem pedidos para esta data.</p>');
      return;
    }

    let html = "";
    for (let i = 0; i < produtos.length; i += 1) {
      const [nome, qtd] = produtos[i];
      html += `
        <div class="metrica-item">
          <span>${nome}</span>
          <strong>${qtd}</strong>
        </div>
      `;
    }
    setHtmlSeguro("mPorProduto", elementos.mPorProduto, html);
  }

  function renderTudo() {
    renderProdutos();
    renderClientes();
    renderSelectProdutos();
    renderDatalistClientes();
    renderPedidos();
    renderReservas();
    renderRelatorio();
  }

  async function carregarProdutos() {
    if (!state.supabase) return false;
    setLoading("produtos", true);
    renderProdutos();
    try {
      const { data, error } = await state.supabase.from("produtos").select("*").order("nome", { ascending: true });
      if (error) throw error;
      state.produtos = data || [];
      limparCachePorPrefixo("pedidoProduto");
      limparCachePorPrefixo("reservaProduto");
      return true;
    } catch (erro) {
      console.error("Erro ao carregar produtos:", erro);
      return false;
    } finally {
      setLoading("produtos", false);
      renderProdutos();
      renderSelectProdutos();
    }
  }

  async function carregarClientes() {
    if (!state.supabase) return false;
    setLoading("clientes", true);
    renderClientes();
    try {
      const { data, error } = await state.supabase.from("clientes").select("*").order("nome", { ascending: true });
      if (error) throw error;
      state.clientes = data || [];
      limparCachePorPrefixo("clientesDatalist");
      return true;
    } catch (erro) {
      console.error("Erro ao carregar clientes:", erro);
      return false;
    } finally {
      setLoading("clientes", false);
      renderClientes();
      renderDatalistClientes();
    }
  }

  async function carregarPedidos() {
    if (!state.supabase) return false;
    setLoading("pedidos", true);
    renderPedidos();
    try {
      let query = state.supabase.from("movimentacoes").select("*").eq("tipo", "pedido");
      if (state.filtroPedidos === "todos") {
        query = query.order("data", { ascending: false }).limit(LIMITE_PEDIDOS_RECENTES);
      } else {
        const dataFiltro =
          state.filtroPedidos === "amanha" ? amanhaISO() : state.filtroPedidos === "data" ? state.dataPedidos : hojeISO();
        query = query.eq("data", dataFiltro).order("data", { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      state.pedidos = normalizarListaMovimentacoes(data || []);
      state.resumoPedidos = resumoPedidosAtual();
      return true;
    } catch (erro) {
      console.error("Erro ao carregar pedidos:", erro);
      return false;
    } finally {
      setLoading("pedidos", false);
      renderPedidos();
    }
  }

  async function carregarReservas() {
    if (!state.supabase) return false;
    setLoading("reservas", true);
    renderReservas();
    try {
      const { data, error } = await state.supabase
        .from("movimentacoes")
        .select("*")
        .eq("tipo", "reserva")
        .order("data", { ascending: true })
        .limit(LIMITE_RESERVAS);
      if (error) throw error;
      state.reservas = normalizarListaMovimentacoes(data || []);
      state.resumoReservas = `Mostrando até ${LIMITE_RESERVAS} reservas para manter a lista leve`;
      return true;
    } catch (erro) {
      console.error("Erro ao carregar reservas:", erro);
      return false;
    } finally {
      setLoading("reservas", false);
      renderReservas();
    }
  }

  async function carregarRelatorio() {
    if (!state.supabase) return false;
    setLoading("relatorio", true);
    renderRelatorio();
    try {
      const { data, error } = await state.supabase
        .from("movimentacoes")
        .select("*")
        .eq("tipo", "pedido")
        .eq("data", elementos.relatorioData.value || hojeISO());
      if (error) throw error;
      state.relatorioPedidos = data || [];
      return true;
    } catch (erro) {
      console.error("Erro ao carregar relatório:", erro);
      return false;
    } finally {
      setLoading("relatorio", false);
      renderRelatorio();
    }
  }

  async function sincronizarMovimentacoes() {
    await Promise.all([carregarPedidos(), carregarReservas(), carregarRelatorio()]);
  }

  async function carregarTudo() {
    if (!state.supabase) return false;
    const resultados = await Promise.all([
      carregarProdutos(),
      carregarClientes(),
      carregarPedidos(),
      carregarReservas(),
      carregarRelatorio(),
    ]);
    return resultados.every(Boolean);
  }

  async function iniciarSupabase() {
    const config = carregarConfig();
    elementos.configUrl.value = config.url;
    elementos.configKey.value = config.anonKey;

    state.subscriptions.forEach((s) => s.unsubscribe && s.unsubscribe());
    state.subscriptions = [];
    state.supabase = window.criarClienteSupabase(config);

    if (!state.supabase) {
      state.syncAtivo = false;
      state.produtos = [];
      state.clientes = [];
      state.pedidos = [];
      state.reservas = [];
      state.relatorioPedidos = [];
      renderTudo();
      setStatusSync();
      return;
    }

    const ok = await carregarTudo();
    state.syncAtivo = ok;
    setStatusSync();
    if (ok) assinarTempoReal();
  }

  function assinarTempoReal() {
    const canalProdutos = state.supabase
      .channel("produtos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, () => {
        agendarAtualizacao("produtos", carregarProdutos);
      })
      .subscribe();

    const canalClientes = state.supabase
      .channel("clientes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        agendarAtualizacao("clientes", carregarClientes);
      })
      .subscribe();

    const canalMov = state.supabase
      .channel("mov-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes" }, () => {
        agendarAtualizacao("movimentacoes", sincronizarMovimentacoes);
      })
      .subscribe();

    state.subscriptions = [canalProdutos, canalClientes, canalMov];
  }

  async function recarregarPorTabela(table) {
    if (table === "produtos") return carregarProdutos();
    if (table === "clientes") return carregarClientes();
    return sincronizarMovimentacoes();
  }

  async function inserir(table, payload) {
    if (!state.supabase) return false;
    const { error } = await state.supabase.from(table).insert(payload);
    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
      return false;
    }
    await recarregarPorTabela(table);
    return true;
  }

  async function atualizar(table, id, payload) {
    if (!state.supabase) return false;
    const { error } = await state.supabase.from(table).update(payload).eq("id", id);
    if (error) {
      alert(`Erro ao atualizar: ${error.message}`);
      return false;
    }
    await recarregarPorTabela(table);
    return true;
  }

  async function remover(table, id) {
    if (!state.supabase) return false;
    const { error } = await state.supabase.from(table).delete().eq("id", id);
    if (error) {
      alert(`Erro ao excluir: ${error.message}`);
      return false;
    }
    await recarregarPorTabela(table);
    return true;
  }

  function produtoSelecionado(select) {
    const id = select.value;
    for (let i = 0; i < state.produtos.length; i += 1) {
      if (String(state.produtos[i].id) === String(id)) return state.produtos[i];
    }
    return null;
  }

  function limparFormProduto() {
    elementos.produtoId.value = "";
    elementos.formProduto.reset();
    elementos.cancelarProduto.classList.add("hidden");
  }

  function limparFormCliente() {
    elementos.clienteId.value = "";
    elementos.formCliente.reset();
    elementos.cancelarCliente.classList.add("hidden");
  }

  function prepararDatasPadrao() {
    const hoje = hojeISO();
    elementos.pedidoData.value = hoje;
    elementos.pedidoFiltroData.value = hoje;
    elementos.reservaData.value = amanhaISO();
    elementos.relatorioData.value = hoje;
    state.dataPedidos = hoje;
  }

  function ligarEventosNavegacao() {
    document.querySelectorAll("[data-screen]").forEach((btn) => {
      btn.addEventListener("click", () => navegar(btn.dataset.screen));
    });
    elementos.btnVoltar.addEventListener("click", () => navegar("home"));
    elementos.btnConfig.addEventListener("click", () => navegar("config"));
  }

  function ligarEventosProdutos() {
    elementos.formProduto.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        nome: elementos.produtoNome.value.trim(),
        preco: Number(elementos.produtoPreco.value),
      };
      if (!payload.nome || Number.isNaN(payload.preco)) return;

      if (elementos.produtoId.value) {
        await atualizar("produtos", elementos.produtoId.value, payload);
      } else {
        await inserir("produtos", payload);
      }
      limparFormProduto();
    });

    elementos.cancelarProduto.addEventListener("click", limparFormProduto);
    elementos.listaProdutos.addEventListener("click", async (e) => {
      const idEditar = e.target.dataset.editarProduto;
      const idExcluir = e.target.dataset.excluirProduto;

      if (idEditar) {
        const produto = state.produtos.find((x) => String(x.id) === idEditar);
        if (!produto) return;
        elementos.produtoId.value = produto.id;
        elementos.produtoNome.value = produto.nome;
        elementos.produtoPreco.value = produto.preco;
        elementos.cancelarProduto.classList.remove("hidden");
      }

      if (idExcluir && confirm("Excluir este produto?")) {
        await remover("produtos", idExcluir);
      }
    });
  }

  function ligarEventosClientes() {
    elementos.formCliente.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        nome: elementos.clienteNome.value.trim(),
        telefone: elementos.clienteTelefone.value.trim() || null,
      };
      if (!payload.nome) return;

      if (elementos.clienteId.value) {
        await atualizar("clientes", elementos.clienteId.value, payload);
      } else {
        await inserir("clientes", payload);
      }
      limparFormCliente();
    });

    elementos.cancelarCliente.addEventListener("click", limparFormCliente);
    elementos.listaClientes.addEventListener("click", async (e) => {
      const idEditar = e.target.dataset.editarCliente;
      const idExcluir = e.target.dataset.excluirCliente;

      if (idEditar) {
        const cliente = state.clientes.find((x) => String(x.id) === idEditar);
        if (!cliente) return;
        elementos.clienteId.value = cliente.id;
        elementos.clienteNome.value = cliente.nome;
        elementos.clienteTelefone.value = cliente.telefone || "";
        elementos.cancelarCliente.classList.remove("hidden");
      }

      if (idExcluir && confirm("Excluir este cliente?")) {
        await remover("clientes", idExcluir);
      }
    });
  }

  async function salvarMovimentacao(tipo, form) {
    const cliente = form.cliente.value.trim();
    const produto = produtoSelecionado(form.produto);
    const quantidade = Number(form.quantidade.value);

    if (!cliente || !produto || Number.isNaN(quantidade) || quantidade < 1) {
      alert("Preencha cliente, produto e quantidade corretamente.");
      return;
    }

    const payload = {
      tipo,
      cliente_nome: cliente,
      produto_nome: produto.nome,
      preco_unitario: Number(produto.preco),
      quantidade,
      data: form.data.value,
      forma_pagamento: form.pagamento.value,
      pago: !!form.pago.checked,
      entregue: !!form.entregue.checked,
    };

    const ok = await inserir("movimentacoes", payload);
    if (!ok) return;

    form.form.reset();
    form.quantidade.value = 1;
    form.data.value = tipo === "pedido" ? hojeISO() : amanhaISO();

    if (tipo === "pedido") {
      state.filtroPedidos = "hoje";
      state.dataPedidos = hojeISO();
      elementos.pedidoFiltroData.value = state.dataPedidos;
      await carregarPedidos();
    }
  }

  function ligarEventosPedidos() {
    elementos.formPedido.addEventListener("submit", async (e) => {
      e.preventDefault();
      await salvarMovimentacao("pedido", {
        form: elementos.formPedido,
        cliente: elementos.pedidoCliente,
        produto: elementos.pedidoProduto,
        quantidade: elementos.pedidoQuantidade,
        data: elementos.pedidoData,
        pagamento: elementos.pedidoPagamento,
        pago: elementos.pedidoPago,
        entregue: elementos.pedidoEntregue,
      });
    });

    elementos.filtrosPedidos.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        state.filtroPedidos = btn.dataset.filtro;
        if (state.filtroPedidos !== "data") {
          state.dataPedidos = state.filtroPedidos === "amanha" ? amanhaISO() : hojeISO();
          elementos.pedidoFiltroData.value = state.dataPedidos;
        }
        await carregarPedidos();
      });
    });

    elementos.pedidoFiltroData.addEventListener("change", async () => {
      state.dataPedidos = elementos.pedidoFiltroData.value || hojeISO();
      state.filtroPedidos = "data";
      await carregarPedidos();
    });

    elementos.listaPedidos.addEventListener("click", async (e) => {
      const pago = e.target.dataset.marcarPago;
      const entregue = e.target.dataset.marcarEntregue;
      const excluir = e.target.dataset.excluirMov;

      if (pago) await atualizar("movimentacoes", pago, { pago: true });
      if (entregue) await atualizar("movimentacoes", entregue, { entregue: true });
      if (excluir && confirm("Excluir este pedido?")) await remover("movimentacoes", excluir);
    });
  }

  function ligarEventosReservas() {
    elementos.formReserva.addEventListener("submit", async (e) => {
      e.preventDefault();
      await salvarMovimentacao("reserva", {
        form: elementos.formReserva,
        cliente: elementos.reservaCliente,
        produto: elementos.reservaProduto,
        quantidade: elementos.reservaQuantidade,
        data: elementos.reservaData,
        pagamento: elementos.reservaPagamento,
        pago: elementos.reservaPago,
        entregue: elementos.reservaEntregue,
      });
    });

    elementos.listaReservas.addEventListener("click", async (e) => {
      const converter = e.target.dataset.converterPedido;
      const pago = e.target.dataset.marcarPago;
      const entregue = e.target.dataset.marcarEntregue;
      const excluir = e.target.dataset.excluirMov;

      if (converter) await atualizar("movimentacoes", converter, { tipo: "pedido" });
      if (pago) await atualizar("movimentacoes", pago, { pago: true });
      if (entregue) await atualizar("movimentacoes", entregue, { entregue: true });
      if (excluir && confirm("Excluir esta reserva?")) await remover("movimentacoes", excluir);
    });
  }

  function ligarEventosRelatorio() {
    elementos.relatorioData.addEventListener("change", async () => {
      await carregarRelatorio();
    });
  }

  function ligarEventosConfig() {
    elementos.formConfig.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cfg = {
        url: elementos.configUrl.value.trim(),
        anonKey: elementos.configKey.value.trim(),
      };
      salvarConfig(cfg);
      await iniciarSupabase();
      alert(state.syncAtivo ? "Sync configurado com sucesso." : "Não foi possível conectar. Verifique os dados.");
    });
  }

  function ligarEventos() {
    ligarEventosNavegacao();
    ligarEventosProdutos();
    ligarEventosClientes();
    ligarEventosPedidos();
    ligarEventosReservas();
    ligarEventosRelatorio();
    ligarEventosConfig();
  }

  async function init() {
    prepararDatasPadrao();
    ligarEventos();
    navegar("home");
    renderTudo();
    await iniciarSupabase();
  }

  init();
})();


