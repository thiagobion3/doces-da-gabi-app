const telas = document.querySelectorAll(".screen");
const btnVoltar = document.getElementById("btn-voltar");

// NAVEGAÇÃO
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-screen]");
  if (!btn) return;

  const destino = btn.dataset.screen;

  telas.forEach(t => t.classList.remove("active"));
  document.getElementById("screen-" + destino).classList.add("active");

  btnVoltar.classList.remove("hidden");
});

// VOLTAR
btnVoltar.onclick = () => {
  telas.forEach(t => t.classList.remove("active"));
  document.getElementById("screen-home").classList.add("active");
  btnVoltar.classList.add("hidden");
};

// MOCK (pra não quebrar)
function salvarProduto() {
  alert("Produto salvo");
}

function salvarCliente() {
  alert("Cliente salvo");
}

function addItem() {
  alert("Item adicionado");
}

function salvarPedido() {
  alert("Pedido salvo");
}

function gerarRelatorio() {
  document.getElementById("resultado").innerText = "Relatório gerado";
}

function criarCampanha() {
  alert("Campanha criada");
}
