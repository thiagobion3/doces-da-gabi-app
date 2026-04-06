let supabase = null;
let campanhaAtual = null;
let itens = [];

// INIT
function iniciar() {
  const cfg = JSON.parse(localStorage.getItem("cfg"));

  if (!cfg) return;

  supabase = window.supabase.createClient(cfg.url, cfg.key);

  carregarCampanhas();
  carregarProdutos();
}

// NAVEGAÇÃO
function abrirTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
  document.getElementById(id).classList.add("ativa");
}

function voltar() {
  abrirTela("home");
}

// CONFIG
function salvarConfig() {
  localStorage.setItem("cfg", JSON.stringify({
    url: document.getElementById("config-url").value,
    key: document.getElementById("config-key").value
  }));
  alert("Salvo!");
  iniciar();
}

// CAMPANHAS
async function criarCampanha() {
  const nome = document.getElementById("nome-campanha").value;
  const data = document.getElementById("data-campanha").value;

  await supabase.from("campanhas").insert([{ nome, data }]);
  carregarCampanhas();
}

async function carregarCampanhas() {
  const { data } = await supabase.from("campanhas").select("*");

  const div = document.getElementById("lista-campanhas");
  div.innerHTML = "";

  data.forEach(c => {
    const btn = document.createElement("button");
    btn.innerText = c.nome;
    btn.onclick = () => abrirCampanha(c);
    div.appendChild(btn);
  });
}

function abrirCampanha(c) {
  campanhaAtual = c.id;
  document.getElementById("titulo-campanha").innerText = c.nome;
  abrirTela("campanha");
}

// PRODUTOS
async function salvarProduto() {
  const nome = document.getElementById("nome-produto").value;
  const preco = document.getElementById("preco-produto").value;

  await supabase.from("produtos").insert([{ nome, preco }]);
  carregarProdutos();
}

async function carregarProdutos() {
  const { data } = await supabase.from("produtos").select("*");

  const select = document.getElementById("produto");
  const lista = document.getElementById("lista-produtos");

  if (select) {
    select.innerHTML = "";
    data.forEach(p => {
      const opt = document.createElement("option");
      opt.text = p.nome;
      opt.value = p.id;
      select.appendChild(opt);
    });
  }

  if (lista) {
    lista.innerHTML = data.map(p => `<div>${p.nome}</div>`).join("");
  }
}

// CLIENTES
async function salvarCliente() {
  const nome = document.getElementById("nome-cliente").value;

  await supabase.from("clientes").insert([{ nome }]);
  carregarClientes();
}

async function carregarClientes() {
  const { data } = await supabase.from("clientes").select("*");

  const lista = document.getElementById("lista-clientes");
  lista.innerHTML = data.map(c => `<div>${c.nome}</div>`).join("");
}

// PEDIDOS
function addItem() {
  const select = document.getElementById("produto");
  const qtd = document.getElementById("quantidade").value;

  const nome = select.options[select.selectedIndex].text;

  itens.push({ nome, qtd });

  renderItens();
}

function renderItens() {
  const div = document.getElementById("itens");
  div.innerHTML = itens.map((i, idx) => `
    <div>${i.nome} x ${i.qtd} 
      <button onclick="removerItem(${idx})">❌</button>
    </div>
  `).join("");
}

function removerItem(i) {
  itens.splice(i, 1);
  renderItens();
}

async function salvarPedido() {
  const cliente = document.getElementById("cliente").value;

  const { data: pedido } = await supabase
    .from("pedidos")
    .insert([{ cliente_nome: cliente, campanha_id: campanhaAtual }])
    .select()
    .single();

  const itensInsert = itens.map(i => ({
    pedido_id: pedido.id,
    produto_nome: i.nome,
    quantidade: i.qtd
  }));

  await supabase.from("itens_pedido").insert(itensInsert);

  alert("Pedido salvo!");

  itens = [];
  renderItens();
}

// CAMPANHA ATIVA
async function abrirCampanhaAtiva() {
  const hoje = new Date().toISOString().slice(0,10);

  const { data } = await supabase
    .from("campanhas")
    .select("*")
    .eq("data", hoje)
    .single();

  if (!data) return alert("Nenhuma campanha hoje");

  abrirCampanha(data);
}

// RELATORIO SIMPLES
async function gerarRelatorio() {
  const { data } = await supabase.from("pedidos").select("*");

  document.getElementById("resultado").innerHTML =
    `Total pedidos: ${data.length}`;
}

// START
iniciar();
