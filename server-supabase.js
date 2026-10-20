// =====================================================
// SORVETERIA ERP — BACKEND COM SUPABASE
// Configure no Render (env vars):
//   SUPABASE_URL = https://seu-projeto.supabase.co
//   SUPABASE_KEY = sua chave anon (ou service_role para acesso total)
// As tabelas devem ser criadas executando sql/01-estrutura-completa.sql
// Se as env vars não estiverem definidas, usa arquivo local (data.json)
// =====================================================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USAR_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

const supabase = USAR_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas amigáveis (sem .html)
app.get('/', (req, res) => res.redirect('/dashboard.html'));
app.get('/dashboard', (req, res) => res.redirect('/dashboard.html'));
app.get('/site', (req, res) => res.redirect('/site.html'));
app.get('/painel', (req, res) => res.redirect('/dashboard.html'));
app.get('/loja', (req, res) => res.redirect('/site.html'));

// ===== STORE — Supabase (se configurado) ou arquivo local =====
let DB = {};
const TABELAS = ['unidades','funcionarios','produtos','clientes','fidelidade','fornecedores','caixas','tesouraria','vendas','comandas','contas','notas_fiscais','autorizacoes','ponto','ferias','holerites','documentos_rh','remessas','patrimonio','imoveis','eventos','fichas_tecnicas','ordens_servico','estoque','mov_estoque','pdv_emergencial','log_bloqueio','log_caixa','mov_caixa','logistica','frota','checklists_exec','pedidos_site','bot_config','bot_regras','ia_pedidos','receitas','acertos','abonos','transferencias','bot_log'];

async function loadDB() {
  if (USAR_SUPABASE) {
    console.log('🔌 Conectando ao Supabase:', SUPABASE_URL);
    DB = {};
    for (const tabela of TABELAS) {
      try {
        const { data, error } = await supabase.from(tabela).select('*');
        if (!error) DB[tabela] = data || [];
        else DB[tabela] = [];
      } catch(e) { DB[tabela] = []; }
    }
    try {
      const { data } = await supabase.from('controle_sistema').select('*').limit(1).single();
      DB.controle_sistema = data || { id:1, matriz_aberta:true, status_geral:'aberta', permite_pdv_emergencial:true, mensagem_aviso:'Sistema operando normalmente' };
    } catch(e) {
      DB.controle_sistema = { id:1, matriz_aberta:true, status_geral:'aberta', permite_pdv_emergencial:true, mensagem_aviso:'Sistema operando normalmente' };
    }
    console.log('✅ Supabase carregado —', Object.keys(DB).length, 'coleções');
  } else {
    try { if (fs.existsSync(DATA_FILE)) DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) { DB = {}; }
    if (!DB.unidades || !DB.unidades.length) seed();
  }
}

let salvando = false;
function saveDB() {
  if (!USAR_SUPABASE) { fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2)); return; }
  if (salvando) return;
  salvando = true;
  (async () => {
    try {
      for (const tabela of TABELAS) {
        const dados = DB[tabela] || [];
        if (dados.length) await supabase.from(tabela).upsert(dados, { onConflict: 'id' });
      }
      if (DB.controle_sistema) await supabase.from('controle_sistema').upsert(DB.controle_sistema, { onConflict: 'id' });
    } catch(e) { console.error('Erro ao salvar no Supabase:', e.message); }
    salvando = false;
  })();
}
function nextId(col) { DB[col] = DB[col] || []; return (DB[col].reduce((m, r) => Math.max(m, r.id || 0), 0)) + 1; }
function fmt(v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); }
function hoje() { return new Date().toISOString().slice(0, 10); }
function agora() { return new Date().toISOString(); }

// ===== SEED INICIAL =====
function seed() {
  DB.unidades = [
    { id: 1, nome: 'Matriz - Sede', tipo: 'matriz', e_matriz: true, regime_tributario: 'simples_nacional', ativo: true },
    { id: 2, nome: 'Filial - Centro', tipo: 'filial', e_matriz: false, regime_tributario: 'simples_nacional', ativo: true }
  ];
  DB.funcionarios = [
    { id: 1, matricula: 'SV-2026-0001', nome: 'Administrador Geral', cargo: 'Administrador', unidade_id: 1, unidade_tipo: 'matriz', role: 'admin', senha_hash: '123', status: 'ATIVO', salario_base: 5000, jornada_diaria: 8, data_admissao: '2024-01-15' },
    { id: 2, matricula: 'SV-2026-0002', nome: 'Maria Silva', cargo: 'Atendente', unidade_id: 2, unidade_tipo: 'filial', role: 'operador', senha_hash: '123', status: 'ATIVO', salario_base: 1600, jornada_diaria: 8, data_admissao: '2025-03-10' }
  ];
  DB.controle_sistema = { id: 1, matriz_aberta: true, status_geral: 'aberta', permite_pdv_emergencial: true, mensagem_aviso: 'Sistema operando normalmente', updated_at: agora() };
  DB.produtos = [
    { id: 1, sku: 'SOR-MOR', nome: 'Sorvete Morango 2L', categoria: 'Sorvetes', sabor: 'Morango', preco_venda: 45.90, preco_por_kg: 22.95, custo: 18, estoque_minimo: 20, producao_propria: true, status: 'ATIVO', unidade_id: 1 },
    { id: 2, sku: 'PIC-CHOC', nome: 'Picolé Chocolate', categoria: 'Picolés', sabor: 'Chocolate', preco_venda: 4.50, custo: 1.20, estoque_minimo: 100, producao_propria: true, status: 'ATIVO', unidade_id: 1 },
    { id: 3, sku: 'ACA-300', nome: 'Açaí 300ml', categoria: 'Açaí', sabor: 'Açaí com granola', preco_venda: 12.90, custo: 4.50, estoque_minimo: 30, producao_propria: true, status: 'ATIVO', unidade_id: 1 },
    { id: 4, sku: 'BEB-COLA', nome: 'Refrigerante Cola 350ml', categoria: 'Bebidas', preco_venda: 5.00, custo: 2.50, estoque_minimo: 48, producao_propria: false, status: 'ATIVO', unidade_id: 1 },
    { id: 5, sku: 'INS-LEITE', nome: 'Leite Integral 1L', categoria: 'Insumos', preco_venda: 6.50, custo: 4.80, estoque_minimo: 50, producao_propria: false, status: 'ATIVO', unidade_id: 1 }
  ];
  DB.clientes = [{ id: 1, nome: 'Cliente Balcão', cpf_cnpj: '', telefone: '', ativo: true, pontos_disponiveis: 0, valor_total_gasto: 0 }];
  DB.fidelidade = [{ id: 1, cliente_id: 1, pontos_total: 0, pontos_disponiveis: 0, valor_total_gasto: 0 }];
  DB.fornecedores = [{ id: 1, nome: 'Laticínios Bom Leite', cnpj: '00.000.000/0001-00', telefone: '(41) 3333-3333', categoria_fornecimento: 'Insumos', status: 'ATIVO' }];
  DB.caixas = [{ id: 1, nome: 'Caixa Principal', status: 'fechado', saldo_inicial: 0, saldo_atual: 0, unidade_id: 1, ativo: true }];
  DB.tesouraria = [];
  DB.vendas = []; DB.comandas = []; DB.contas = []; DB.notas_fiscais = []; DB.autorizacoes = [];
  DB.ponto = []; DB.ferias = []; DB.holerites = []; DB.documentos_rh = [];
  DB.remessas = []; DB.patrimonio = []; DB.imoveis = []; DB.eventos = [];
  DB.fichas_tecnicas = []; DB.ordens_servico = []; DB.estoque = []; DB.mov_estoque = [];
  DB.pdv_emergencial = []; DB.log_bloqueio = []; DB.log_caixa = []; DB.mov_caixa = [];
  DB.logistica = []; DB.frota = []; DB.checklists_exec = []; DB.pedidos_site = [];
  DB.bot_config = [{ nome: 'nome_bot', valor: 'SorveteBot' }, { nome: 'saudacao', valor: 'Olá! Bem-vindo à Sorveteria!' }];
  DB.bot_regras = [
    { id: 1, palavras_chave: 'sabor|sabores|sorvete', resposta: 'Temos os sabores: Morango, Chocolate, Baunilha, Açaí com granola e muito mais!' },
    { id: 2, palavras_chave: 'picole|picolé|picoles', resposta: 'Nossos picolés são R$ 4,50 cada — chocolate, morango, uva e limão!' },
    { id: 3, palavras_chave: 'preco|preço|valor|quanto', resposta: 'Sorvete 2L R$ 45,90 | Açaí 300ml R$ 12,90 | Picolé R$ 4,50 | Refrigerante R$ 5,00' },
    { id: 4, palavras_chave: 'horario|horário|abre|fecha|funcionamento', resposta: 'Funcionamos de segunda a domingo, das 10h às 22h!' },
    { id: 5, palavras_chave: 'evento|festa|aniversario|empresa', resposta: 'Fazemos eventos e festas! Envie data, quantidade de pessoas e local que enviamos o orçamento.' },
    { id: 6, palavras_chave: 'ifood|delivery|entrega|entregador', resposta: 'Estamos no iFood! Ou se preferir, fazemos entrega própria — informe seu endereço.' }
  ];
  DB.ia_pedidos = [];
  saveDB();
}

// ===== MIDDLEWARE: verifica estado do sistema (Matriz aberta?) =====
function verificarEstado(req, res, next) {
  const body = req.body || {};
  const unidadeId = body.unidade_id || 1;
  const modulo = req.path.split('/')[2] || 'geral';
  const cs = DB.controle_sistema;
  const unidade = (DB.unidades || []).find(u => u.id == unidadeId);
  // Matriz sempre liberada
  if (unidade && unidade.e_matriz) return next();
  // Matriz aberta → tudo liberado
  if (cs.matriz_aberta) return next();
  // Matriz fechada → só PDV emergencial e ponto
  const permitidos = ['pdv-emergencial', 'rh'];
  if (cs.permite_pdv_emergencial && permitidos.some(p => req.path.includes(p))) return next();
  // Bloqueia
  DB.log_bloqueio.push({ id: nextId('log_bloqueio'), unidade_id: unidadeId, funcionario_id: body.funcionario_id || null, modulo_tentado: modulo, data_tentativa: agora(), mensagem_retorno: cs.mensagem_aviso });
  saveDB();
  return res.json({ erro: cs.mensagem_aviso || 'Matriz fechada', codigo: 'MATRIZ_FECHADA', liberado: false });
}

// ===== AUTH =====
app.post('/api/login', (req, res) => {
  const { matricula, senha } = req.body;
  const f = (DB.funcionarios || []).find(x => x.matricula === matricula && x.senha_hash === senha);
  if (!f) return res.json({ erro: 'Matrícula ou senha inválidos' });
  res.json({ sucesso: true, token: 'tok-' + f.id, funcionario: f, unidade: (DB.unidades || []).find(u => u.id === f.unidade_id) });
});

// ===== DASHBOARD =====
app.get('/api/dashboard/resumo', (req, res) => {
  const vendasHoje = (DB.vendas || []).filter(v => (v.data || '').slice(0, 10) === hoje());
  const totalHoje = vendasHoje.reduce((s, v) => s + Number(v.total || 0), 0);
  const vendasMes = (DB.vendas || []).filter(v => (v.data || '').slice(0, 7) === hoje().slice(0, 7));
  const totalMes = vendasMes.reduce((s, v) => s + Number(v.total || 0), 0);
  const picoles = vendasHoje.flatMap(v => v.itens || []).filter(i => (i.produto_nome || '').toLowerCase().includes('picolé')).reduce((s, i) => s + Number(i.qty || 0), 0);
  const receber = (DB.contas || []).filter(c => c.tipo === 'RECEBER' && c.status === 'ABERTO' && c.vencimento <= hoje()).reduce((s, c) => s + Number(c.valor || 0), 0);
  const pagar = (DB.contas || []).filter(c => c.tipo === 'PAGAR' && c.status === 'ABERTO' && c.vencimento <= hoje()).reduce((s, c) => s + Number(c.valor || 0), 0);
  const vendas7d = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    vendas7d.push({ dia: ds, valor: (DB.vendas || []).filter(v => (v.data || '').slice(0, 10) === ds).reduce((s, v) => s + Number(v.total || 0), 0) });
  }
  res.json({ saldo_bancos: 5000, receber_hoje: receber, pagar_hoje: pagar, vendas_hoje: totalHoje, vendas_mes: totalMes, picoles_hoje: picoles, vendas_7d: vendas7d });
});

app.get('/api/gerente/alertas', (req, res) => {
  const alertas = [];
  const estoqueBaixo = (DB.estoque || []).filter(e => Number(e.qty || 0) < Number(e.estoque_minimo || 20));
  if (estoqueBaixo.length) alertas.push({ nivel: 'critico', mensagem: `${estoqueBaixo.length} produto(s) com estoque baixo` });
  const contasVencidas = (DB.contas || []).filter(c => c.status === 'ABERTO' && c.vencimento < hoje());
  if (contasVencidas.length) alertas.push({ nivel: 'alerta', mensagem: `${contasVencidas.length} conta(s) vencida(s)` });
  const emergPend = (DB.pdv_emergencial || []).filter(p => !p.sincronizado);
  if (emergPend.length) alertas.push({ nivel: 'alerta', mensagem: `${emergPend.length} registro(s) emergencial(is) pendente(s) de sincronização` });
  const pontoIncompleto = (DB.ponto || []).filter(p => p.situacao === 'incompleto');
  if (pontoIncompleto.length) alertas.push({ nivel: 'alerta', mensagem: `${pontoIncompleto.length} ponto(s) incompleto(s)` });
  res.json({ alertas });
});

// ===== CONTROLE SISTEMA (Matriz) =====
app.get('/api/controle-sistema/estado', (req, res) => res.json({ ...DB.controle_sistema }));
app.post('/api/controle-sistema/abrir', (req, res) => {
  const { unidade_id, mensagem_aviso } = req.body;
  const unidade = (DB.unidades || []).find(u => u.id == unidade_id);
  if (!unidade || !unidade.e_matriz) return res.json({ erro: 'Apenas Matriz pode abrir o sistema' });
  DB.controle_sistema = { ...DB.controle_sistema, matriz_aberta: true, status_geral: 'aberta', data_abertura: agora(), aberta_por: req.body.funcionario_id || 1, mensagem_aviso: mensagem_aviso || 'Sistema operando normalmente', updated_at: agora() };
  saveDB();
  res.json({ sucesso: true, mensagem: 'Sistema aberto! Filiais liberadas.' });
});
app.post('/api/controle-sistema/fechar', (req, res) => {
  const { unidade_id, mensagem_aviso } = req.body;
  const unidade = (DB.unidades || []).find(u => u.id == unidade_id);
  if (!unidade || !unidade.e_matriz) return res.json({ erro: 'Apenas Matriz pode fechar o sistema' });
  DB.controle_sistema = { ...DB.controle_sistema, matriz_aberta: false, status_geral: 'fechada', data_fechamento: agora(), fechada_por: req.body.funcionario_id || 1, mensagem_aviso: mensagem_aviso || 'Matriz fechada — aguarde reabertura', updated_at: agora() };
  saveDB();
  res.json({ sucesso: true, mensagem: 'Sistema fechado! Filiais bloqueadas.' });
});
app.post('/api/controle-sistema/mensagem', (req, res) => {
  DB.controle_sistema.mensagem_aviso = req.body.mensagem_aviso;
  DB.controle_sistema.updated_at = agora();
  saveDB();
  res.json({ sucesso: true });
});
app.get('/api/controle-sistema/log-bloqueios', (req, res) => {
  const logs = (DB.log_bloqueio || []).slice(-50).reverse().map(l => ({ ...l, unidade_nome: ((DB.unidades || []).find(u => u.id === l.unidade_id) || {}).nome }));
  res.json({ logs });
});

// ===== PDV EMERGENCIAL =====
app.get('/api/pdv-emergencial/pendentes', (req, res) => {
  const registros = (DB.pdv_emergencial || []).slice(-50).reverse().map(r => ({ ...r, unidade_nome: ((DB.unidades || []).find(u => u.id === r.unidade_id) || {}).nome }));
  res.json({ total: registros.filter(r => !r.sincronizado).length, registros });
});
app.post('/api/pdv-emergencial/registrar', (req, res) => {
  const codigo = 'EMERG-' + hoje().replace(/-/g, '') + '-' + String((DB.pdv_emergencial || []).length + 1).padStart(3, '0');
  const reg = { id: nextId('pdv_emergencial'), codigo, unidade_id: req.body.unidade_id || 2, funcionario_id: req.body.funcionario_id || 2, tipo_registro: 'venda', dados_json: req.body, valor_total: req.body.valor_total || 0, sincronizado: false, created_at: agora() };
  DB.pdv_emergencial.push(reg);
  saveDB();
  res.json({ sucesso: true, codigo, registro: reg });
});
app.post('/api/pdv-emergencial/sincronizar', (req, res) => {
  let sincronizados = 0;
  (DB.pdv_emergencial || []).filter(p => !p.sincronizado).forEach(p => {
    const dados = p.dados_json || {};
    DB.vendas.push({ id: nextId('vendas'), data: p.created_at, cliente_nome: dados.cliente_nome || 'Emergencial', forma_pagamento: dados.forma_pagamento || 'DINHEIRO', origem: 'emergencial', total: p.valor_total, itens: dados.itens || [], status: 'CONCLUIDA', operador_matricula: 'EMERG', observacao: 'Sincronizado de ' + p.codigo });
    p.sincronizado = true; p.sincronizado_em = agora(); p.sincronizado_por = req.body.funcionario_id || 1;
    sincronizados++;
  });
  saveDB();
  res.json({ sucesso: true, sincronizados });
});

// ===== UNIDADES =====
app.get('/api/unidades', (req, res) => res.json({ unidades: DB.unidades || [] }));

// ===== CAIXA / PDV =====
app.get('/api/caixa/status-online', (req, res) => {
  const abertos = (DB.caixas || []).filter(c => c.status === 'aberto');
  const saldo = abertos.reduce((s, c) => s + Number(c.saldo_atual || 0), 0);
  const autPend = (DB.autorizacoes || []).filter(a => a.status === 'pendente').length;
  res.json({ caixas_abertos: abertos, saldo_atual: saldo, autorizacoes_pendentes: autPend });
});
app.post('/api/caixa/abrir', verificarEstado, (req, res) => {
  const tesAberta = (DB.tesouraria || []).some(t => t.status === 'aberta' && t.data === hoje());
  if (!tesAberta) return res.json({ erro: 'Tesouraria fechada! Abra a tesouraria primeiro.' });
  const cx = (DB.caixas || [])[0];
  cx.status = 'aberto'; cx.saldo_inicial = req.body.fundo_inicial || 0; cx.saldo_atual = req.body.fundo_inicial || 0;
  cx.aberta_por = req.body.funcionario_id || 1; cx.aberta_em = agora();
  DB.log_caixa.push({ id: nextId('log_caixa'), evento: 'ABERTURA_CAIXA', matricula: req.body.matricula || '-', created_at: agora() });
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/caixa/fechar', verificarEstado, (req, res) => {
  const cx = (DB.caixas || []).find(c => c.id == req.body.caixa_id) || (DB.caixas || [])[0];
  cx.status = 'fechado'; cx.fechada_por = req.body.funcionario_id || 1; cx.fechada_em = agora();
  DB.log_caixa.push({ id: nextId('log_caixa'), evento: 'FECHAMENTO_CAIXA', matricula: req.body.matricula || '-', created_at: agora() });
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/caixa/movimento', verificarEstado, (req, res) => {
  const { tipo, valor, descricao } = req.body;
  const cx = (DB.caixas || []).find(c => c.status === 'aberto');
  if (!cx) return res.json({ erro: 'Nenhum caixa aberto' });
  const precisaAut = ['REMESSA', 'RECOLHIMENTO', 'SANGRIA'].includes(tipo);
  if (precisaAut && !req.body.senha_adm) {
    const aut = { id: nextId('autorizacoes'), codigo: 'AUT-' + Date.now(), tipo_acao: tipo.toLowerCase(), solicitante_id: req.body.funcionario_id || 2, dados_acao: { valor, descricao }, status: 'pendente', data_solicitacao: agora() };
    DB.autorizacoes.push(aut); saveDB();
    return res.json({ autorizacao_pendente: true, autorizacao_id: aut.id });
  }
  cx.saldo_atual = Number(cx.saldo_atual) + (['ENTRADA', 'SUPRIMENTO'].includes(tipo) ? Number(valor) : -Number(valor));
  DB.mov_caixa.push({ id: nextId('mov_caixa'), tipo, valor, descricao, origem: 'caixa', created_at: agora(), responsavel: req.body.matricula || '-' });
  saveDB();
  res.json({ sucesso: true });
});
app.get('/api/caixa/movimentos', (req, res) => res.json({ movimentos: (DB.mov_caixa || []).slice(-50).reverse() }));
app.get('/api/log-caixa', (req, res) => res.json({ log: (DB.log_caixa || []).slice(-100).reverse() }));

// ===== VENDAS =====
app.post('/api/venda/criar', verificarEstado, (req, res) => {
  const { itens, forma_pagamento, comanda_id, cliente_nome } = req.body;
  const total = (itens || []).reduce((s, i) => s + Number(i.total || 0), 0);
  const venda = { id: nextId('vendas'), data: agora(), cliente_nome: cliente_nome || 'Balcão', forma_pagamento, origem: comanda_id ? 'comanda' : 'balcao', total, itens, status: 'CONCLUIDA', operador_matricula: req.body.matricula || '-', comanda_id };
  DB.vendas.push(venda);
  // Baixa estoque
  (itens || []).forEach(i => {
    const est = (DB.estoque || []).find(e => e.produto_id == i.product_id);
    if (est) est.qty = Math.max(0, Number(est.qty) - Number(i.qty || 1));
  });
  // Crédito no caixa
  const cx = (DB.caixas || []).find(c => c.status === 'aberto');
  if (cx) cx.saldo_atual = Number(cx.saldo_atual) + total;
  // Fidelidade
  const cli = (DB.clientes || []).find(c => c.nome === cliente_nome);
  if (cli) {
    const fid = (DB.fidelidade || []).find(f => f.cliente_id === cli.id);
    if (fid) { const pts = Math.floor(total); fid.pontos_total += pts; fid.pontos_disponiveis += pts; fid.valor_total_gasto += total; cli.pontos_disponiveis = fid.pontos_disponiveis; cli.valor_total_gasto = fid.valor_total_gasto; }
  }
  saveDB();
  res.json({ sucesso: true, venda_id: venda.id, total });
});
app.post('/api/venda/estornar', (req, res) => {
  const v = (DB.vendas || []).find(x => x.id == req.body.venda_id);
  if (!v) return res.json({ erro: 'Venda não encontrada' });
  v.status = 'ESTORNADA'; v.motivo_estorno = req.body.motivo; v.estornada_em = agora();
  const cx = (DB.caixas || []).find(c => c.status === 'aberto');
  if (cx) cx.saldo_atual = Number(cx.saldo_atual) - Number(v.total);
  saveDB();
  res.json({ sucesso: true });
});
app.get('/api/venda/cupom', (req, res) => {
  const v = (DB.vendas || []).find(x => x.id == req.query.id);
  if (!v) return res.json({ erro: 'Não encontrada' });
  res.json({ venda: v, itens: v.itens || [] });
});
app.get('/api/vendas', (req, res) => res.json({ vendas: (DB.vendas || []).slice(-100).reverse() }));

// ===== PRODUTOS =====
app.get('/api/produtos', (req, res) => res.json({ produtos: DB.produtos || [] }));
app.post('/api/produtos/salvar', (req, res) => {
  const { id } = req.body;
  if (id) {
    const p = (DB.produtos || []).find(x => x.id == id);
    if (p) Object.assign(p, req.body);
  } else {
    DB.produtos.push({ id: nextId('produtos'), ...req.body, status: 'ATIVO' });
  }
  saveDB();
  res.json({ sucesso: true });
});

// ===== PRODUÇÃO / RECEITAS =====
app.get('/api/producao/receitas', (req, res) => {
  const recs = (DB.receitas || []).filter(r => r.produto_id == req.query.produto_id);
  res.json({ receitas: recs });
});
app.post('/api/producao/receita/salvar', (req, res) => {
  DB.receitas = DB.receitas || [];
  DB.receitas.push({ id: nextId('receitas'), ...req.body });
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/producao/receita/excluir', (req, res) => {
  DB.receitas = (DB.receitas || []).filter(r => r.id != req.body.id);
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/producao/simular', (req, res) => {
  const { produto_id, qtd } = req.body;
  const prod = (DB.produtos || []).find(p => p.id == produto_id);
  const recs = (DB.receitas || []).filter(r => r.produto_id == produto_id);
  const ingredientes = recs.map(r => {
    const est = (DB.estoque || []).find(e => e.produto_id == r.insumo_id);
    const necessario = Number(r.quantidade_por_unidade) * Number(qtd);
    const disponivel = est ? Number(est.qty) : 0;
    return { insumo: r.insumo_nome, necessario, disponivel, unidade: r.unidade || 'UN', suficiente: disponivel >= necessario };
  });
  const falta = ingredientes.some(i => !i.suficiente);
  res.json({ sucesso: !falta, falta_insumo: falta, ingredientes, qtd_produzir: qtd, produto: prod, mensagem: falta ? 'Falta insumo para produção' : 'Tudo disponível' });
});
app.post('/api/producao/confirmar', (req, res) => {
  const { produto_id, qtd } = req.body;
  const prod = (DB.produtos || []).find(p => p.id == produto_id);
  // Baixa insumos
  (DB.receitas || []).filter(r => r.produto_id == produto_id).forEach(r => {
    const est = (DB.estoque || []).find(e => e.produto_id == r.insumo_id);
    if (est) est.qty = Math.max(0, Number(est.qty) - Number(r.quantidade_por_unidade) * Number(qtd));
  });
  // Adiciona produto acabado ao estoque
  let est = (DB.estoque || []).find(e => e.produto_id == produto_id);
  if (!est) { est = { id: nextId('estoque'), produto_id, produto_nome: prod.nome, sku: prod.sku, qty: 0, valor_unitario: prod.custo, unidade_id: 1, lote: 'LOTE-' + hoje(), data_validade: null }; DB.estoque.push(est); }
  est.qty = Number(est.qty) + Number(qtd);
  saveDB();
  res.json({ sucesso: true, mensagem: `Produzidas ${qtd} unidades de ${prod.nome}! Estoque atualizado.` });
});

// ===== CLIENTES + FIDELIDADE =====
app.get('/api/clientes', (req, res) => res.json({ clientes: (DB.clientes || []).map(c => ({ ...c, pontos_disponiveis: ((DB.fidelidade || []).find(f => f.cliente_id === c.id) || {}).pontos_disponiveis || 0, valor_total_gasto: ((DB.fidelidade || []).find(f => f.cliente_id === c.id) || {}).valor_total_gasto || 0 })) }));
app.post('/api/clientes/salvar', (req, res) => {
  const c = { id: nextId('clientes'), ...req.body, ativo: true, data_cadastro: hoje() };
  DB.clientes.push(c);
  DB.fidelidade.push({ id: nextId('fidelidade'), cliente_id: c.id, pontos_total: 0, pontos_disponiveis: 0, pontos_resgatados: 0, valor_total_gasto: 0, atualizado_em: agora() });
  saveDB();
  res.json({ sucesso: true });
});
app.get('/api/fidelidade/:id', (req, res) => {
  const fid = (DB.fidelidade || []).find(f => f.cliente_id == req.params.id);
  res.json({ fidelidade: fid || { pontos_disponiveis: 0, pontos_total: 0, valor_total_gasto: 0 } });
});
app.post('/api/fidelidade/ajustar', (req, res) => {
  const fid = (DB.fidelidade || []).find(f => f.cliente_id == req.body.cliente_id);
  if (fid) { fid.pontos_disponiveis = Math.max(0, Number(fid.pontos_disponiveis) + Number(req.body.pontos)); fid.atualizado_em = agora(); }
  saveDB();
  res.json({ sucesso: true });
});

// ===== FORNECEDORES =====
app.get('/api/fornecedores', (req, res) => res.json({ fornecedores: DB.fornecedores || [] }));
app.post('/api/fornecedores/salvar', (req, res) => { DB.fornecedores.push({ id: nextId('fornecedores'), ...req.body, status: 'ATIVO' }); saveDB(); res.json({ sucesso: true }); });

// ===== FUNCIONÁRIOS =====
app.get('/api/funcionarios', (req, res) => res.json({ funcionarios: (DB.funcionarios || []).map(f => ({ ...f, unidade_nome: ((DB.unidades || []).find(u => u.id === f.unidade_id) || {}).nome })) }));
app.post('/api/funcionarios/salvar', (req, res) => { DB.funcionarios.push({ id: nextId('funcionarios'), ...req.body, status: 'ATIVO', data_admissao: hoje() }); saveDB(); res.json({ sucesso: true }); });

// ===== PATRIMÔNIO =====
app.get('/api/patrimonio', (req, res) => res.json({ bens: (DB.patrimonio || []).map(p => ({ ...p, unidade_nome: ((DB.unidades || []).find(u => u.id === p.localizacao_unidade_id) || {}).nome })) }));
app.post('/api/patrimonio/salvar', (req, res) => {
  const codigo = 'PAT-' + new Date().getFullYear() + '-' + String((DB.patrimonio || []).length + 1).padStart(5, '0');
  DB.patrimonio.push({ id: nextId('patrimonio'), codigo_etiqueta: codigo, ...req.body, status: 'ativo', condicao_atual: req.body.condicao_atual || 'bom', data_ultima_verificacao: hoje() });
  saveDB();
  res.json({ sucesso: true, codigo_etiqueta: codigo });
});
app.post('/api/patrimonio/transferir', (req, res) => {
  const bem = (DB.patrimonio || []).find(p => p.id == req.body.patrimonio_id);
  if (bem) {
    DB.transferencias = DB.transferencias || [];
    DB.transferencias.push({ id: nextId('transferencias'), patrimonio_id: bem.id, origem_unidade_id: bem.localizacao_unidade_id, destino_unidade_id: req.body.destino_unidade_id, motivo: req.body.motivo, data_saida: agora() });
    bem.localizacao_unidade_id = req.body.destino_unidade_id;
    bem.data_ultima_verificacao = hoje();
  }
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/patrimonio/checklist-mudanca', (req, res) => {
  const bens = (DB.patrimonio || []).filter(p => p.localizacao_unidade_id == req.body.unidade_id);
  const chk = { id: nextId('checklists_exec'), modelo_id: 3, referencia_externa_id: req.body.unidade_id, responsavel_execucao_id: req.body.funcionario_id || 1, unidade_id: req.body.unidade_id, status: 'incompleto', data_execucao: agora(), itens: bens.map(b => ({ texto: b.codigo_etiqueta + ' — ' + b.descricao, respondido: false })) };
  DB.checklists_exec.push(chk);
  saveDB();
  res.json({ sucesso: true, checklist_id: chk.id, totalItens: bens.length });
});

// ===== IMÓVEIS =====
app.get('/api/imoveis', (req, res) => res.json({ imoveis: (DB.imoveis || []).map(i => ({ ...i, unidade_nome: ((DB.unidades || []).find(u => u.id === i.unidade_id) || {}).nome })) }));
app.post('/api/imoveis/salvar', (req, res) => { DB.imoveis.push({ id: nextId('imoveis'), ...req.body, status: 'ativo' }); saveDB(); res.json({ sucesso: true }); });

// ===== FICHAS TÉCNICAS =====
app.get('/api/fichas-tecnicas', (req, res) => res.json({ fichas: DB.fichas_tecnicas || [] }));
app.get('/api/fichas-tecnicas/:id', (req, res) => { const f = (DB.fichas_tecnicas || []).find(x => x.id == req.params.id); res.json({ ficha: f || null }); });
app.post('/api/fichas-tecnicas/salvar', (req, res) => {
  const { tempo_producao_min, tempo_embalagem_min, tempo_acondicionamento_min } = req.body;
  const tempo_total = Number(tempo_producao_min || 0) + Number(tempo_embalagem_min || 0) + Number(tempo_acondicionamento_min || 0);
  DB.fichas_tecnicas.push({ id: nextId('fichas_tecnicas'), ...req.body, tempo_total_min: tempo_total, ativo: true });
  saveDB();
  res.json({ sucesso: true });
});

// ===== ORDENS DE SERVIÇO =====
app.get('/api/ordens-servico', (req, res) => res.json({ ordens: (DB.ordens_servico || []).map(o => ({ ...o, ficha_nome: ((DB.fichas_tecnicas || []).find(f => f.id === o.ficha_tecnica_id) || {}).nome_sabor, responsavel_nome: ((DB.funcionarios || []).find(f => f.id === o.responsavel_id) || {}).nome })) }));
app.post('/api/ordens-servico/criar', (req, res) => {
  const codigo = 'OS-' + hoje().replace(/-/g, '') + '-' + String((DB.ordens_servico || []).length + 1).padStart(3, '0');
  DB.ordens_servico.push({ id: nextId('ordens_servico'), codigo, ...req.body, status: 'pendente', solicitante_id: req.body.funcionario_id || 1, created_at: agora() });
  saveDB();
  res.json({ sucesso: true, codigo });
});
app.post('/api/ordens-servico/delegar', (req, res) => {
  const os = (DB.ordens_servico || []).find(o => o.id == req.body.os_id);
  if (os) { os.responsavel_id = req.body.responsavel_id; os.status = 'em_andamento'; os.data_inicio = agora(); }
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/ordens-servico/concluir', (req, res) => {
  const os = (DB.ordens_servico || []).find(o => o.id == req.body.os_id);
  if (os) { os.status = 'concluida'; os.data_conclusao = agora(); os.tempo_gasto_real_min = req.body.tempo_gasto_real_min; }
  saveDB();
  res.json({ sucesso: true });
});

// ===== COMANDAS =====
app.get('/api/comandas', (req, res) => res.json({ comandas: DB.comandas || [] }));
app.get('/api/comandas/abertas', (req, res) => res.json({ comandas: (DB.comandas || []).filter(c => c.status === 'ABERTA') }));
app.post('/api/comandas/criar', (req, res) => {
  const numero = 'CMD-' + String((DB.comandas || []).length + 1).padStart(4, '0');
  DB.comandas.push({ id: nextId('comandas'), numero, ...req.body, status: 'ABERTA', total: 0, entrada_at: agora() });
  saveDB();
  res.json({ sucesso: true, numero });
});
app.post('/api/comandas/fechar', (req, res) => {
  const cmd = (DB.comandas || []).find(c => c.id == req.body.comanda_id);
  if (cmd) { cmd.status = 'FECHADA'; cmd.fechada_em = agora(); }
  saveDB();
  res.json({ sucesso: true });
});
app.get('/api/comandas/qr/:id', (req, res) => { const cmd = (DB.comandas || []).find(c => c.id == req.params.id); res.json({ qr: cmd ? 'QR-' + cmd.numero : null }); });

// ===== PEDIDOS SITE / IFOOD =====
app.get('/api/site/pedidos', (req, res) => res.json({ pedidos: DB.pedidos_site || [] }));
app.post('/api/site/pedido/status', (req, res) => {
  const p = (DB.pedidos_site || []).find(x => x.id == req.body.pedido_id);
  if (p) p.status = req.body.status;
  saveDB();
  res.json({ sucesso: true });
});

// ===== EVENTOS =====
app.get('/api/eventos', (req, res) => res.json({ eventos: DB.eventos || [] }));
app.post('/api/eventos/salvar', (req, res) => { DB.eventos.push({ id: nextId('eventos'), ...req.body, status: 'orcamento', created_at: agora() }); saveDB(); res.json({ sucesso: true }); });

// ===== ESTOQUE / WMS =====
app.get('/api/wms/estoque', (req, res) => res.json({ estoque: (DB.estoque || []).map(e => ({ ...e, unidade_nome: ((DB.unidades || []).find(u => u.id === e.unidade_id) || {}).nome, valor_total: Number(e.qty || 0) * Number(e.valor_unitario || 0) })) }));
app.post('/api/wms/entrada', (req, res) => {
  let est = (DB.estoque || []).find(e => e.sku === req.body.sku && e.unidade_id == req.body.unidade_id);
  if (!est) { est = { id: nextId('estoque'), ...req.body, qty: 0 }; DB.estoque.push(est); }
  est.qty = Number(est.qty) + Number(req.body.qty);
  est.valor_unitario = req.body.valor_unitario || est.valor_unitario;
  DB.mov_estoque.push({ id: nextId('mov_estoque'), tipo: 'ENTRADA', ...req.body, created_at: agora() });
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/wms/saida', (req, res) => {
  const est = (DB.estoque || []).find(e => e.sku === req.body.sku && e.unidade_id == req.body.unidade_id);
  if (est) est.qty = Math.max(0, Number(est.qty) - Number(req.body.qty));
  DB.mov_estoque.push({ id: nextId('mov_estoque'), tipo: 'SAIDA', ...req.body, created_at: agora() });
  saveDB();
  res.json({ sucesso: true });
});
app.get('/api/wms/movimentos', (req, res) => res.json({ movimentos: (DB.mov_estoque || []).slice(-100).reverse() }));

// ===== REMESSAS =====
app.get('/api/remessas', (req, res) => res.json({ remessas: (DB.remessas || []).map(r => ({ ...r, origem_nome: ((DB.unidades || []).find(u => u.id === r.origem_unidade_id) || {}).nome, destino_nome: ((DB.unidades || []).find(u => u.id === r.destino_unidade_id) || {}).nome })) }));
app.post('/api/remessas/criar', (req, res) => {
  const codigo = 'REM-' + hoje().replace(/-/g, '') + '-' + String((DB.remessas || []).length + 1).padStart(3, '0');
  DB.remessas.push({ id: nextId('remessas'), codigo, origem_unidade_id: 1, ...req.body, status: 'enviada', data_envio: agora(), responsavel_envio_id: req.body.funcionario_id || 1 });
  saveDB();
  res.json({ sucesso: true, codigo });
});
app.post('/api/remessas/receber', (req, res) => {
  const rem = (DB.remessas || []).find(r => r.codigo === req.body.codigo);
  if (rem) { rem.status = 'recebida'; rem.data_recebimento = agora(); rem.assinatura_recebedor = req.body.assinatura_recebedor; rem.responsavel_recebimento_id = req.body.funcionario_id || 2; }
  saveDB();
  res.json({ sucesso: true });
});

// ===== CONTAS =====
app.get('/api/contas', (req, res) => res.json({ contas: DB.contas || [] }));
app.post('/api/contabilidade/conta/criar', (req, res) => { DB.contas.push({ id: nextId('contas'), ...req.body, status: 'ABERTO' }); saveDB(); res.json({ sucesso: true }); });
app.post('/api/contabilidade/conta/pagar', (req, res) => { const c = (DB.contas || []).find(x => x.id == req.body.conta_id); if (c) { c.status = c.tipo === 'RECEBER' ? 'RECEBIDO' : 'PAGO'; c.data_pagamento = hoje(); } saveDB(); res.json({ sucesso: true }); });

// ===== TESOURARIA =====
app.get('/api/tesouraria/status', (req, res) => {
  const tes = (DB.tesouraria || []).find(t => t.data === hoje());
  const aberta = tes && tes.status === 'aberta';
  const caixasAbertos = (DB.caixas || []).filter(c => c.status === 'aberto');
  const movs = (DB.mov_caixa || []).slice(-20).reverse();
  res.json({ tesouraria_aberta: aberta, saldo_atual: tes ? tes.saldo_atual : 0, caixas_abertos: caixasAbertos, movimentos: movs });
});
app.post('/api/tesouraria/abrir', (req, res) => {
  if ((DB.tesouraria || []).some(t => t.data === hoje() && t.status === 'aberta')) return res.json({ erro: 'Tesouraria já aberta hoje' });
  DB.tesouraria.push({ id: nextId('tesouraria'), data: hoje(), status: 'aberta', saldo_inicial: 0, saldo_atual: 0, aberta_por: req.body.funcionario_id || 1, aberta_em: agora(), unidade_id: req.body.unidade_id || 1 });
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/tesouraria/fechar', (req, res) => {
  const caixasAbertos = (DB.caixas || []).filter(c => c.status === 'aberto');
  if (caixasAbertos.length) return res.json({ erro: 'Existem ' + caixasAbertos.length + ' caixa(s) aberto(s). Feche todos primeiro.' });
  const tes = (DB.tesouraria || []).find(t => t.data === hoje());
  if (tes) { tes.status = 'fechada'; tes.fechada_por = req.body.funcionario_id || 1; tes.fechada_em = agora(); }
  saveDB();
  res.json({ sucesso: true, mensagem: 'Tesouraria fechada! Dia encerrado.' });
});

// ===== NOTAS FISCAIS =====
app.get('/api/nf/lista', (req, res) => res.json({ notas: DB.notas_fiscais || [] }));
function calcularImposto(valorBruto, regime) {
  const aliquotas = { simples_nacional: 6, lucro_presumido: 12, lucro_real: 15 };
  const aliq = aliquotas[regime] || 6;
  return { aliquota: aliq, valor_imposto: valorBruto * aliq / 100, base_calculo: valorBruto };
}
app.post('/api/nf/emitir', (req, res) => {
  const { pedido_id, nf_id } = req.body;
  const pedido = (DB.pedidos_site || []).find(p => p.id == pedido_id) || { total: 0, cliente_nome: 'Cliente' };
  const numero = 'NF-' + String((DB.notas_fiscais || []).length + 1).padStart(6, '0');
  const regime = (DB.unidades || [])[0]?.regime_tributario || 'simples_nacional';
  const imp = calcularImposto(Number(pedido.total || 100), regime);
  const nf = { id: nextId('notas_fiscais'), numero, serie: '1', origem_tipo: pedido_id ? 'ifood' : 'venda', origem_id: pedido_id || nf_id, razao_social_destinatario: pedido.cliente_nome || 'Cliente', valor_bruto: pedido.total || 100, regime_tributario: regime, ...imp, status: 'autorizada', chave_acesso: 'CHV' + Date.now(), data_emissao: agora() };
  DB.notas_fiscais.push(nf);
  if (pedido_id) pedido.nf_emitida = true;
  saveDB();
  res.json({ sucesso: true, numero, ...nf });
});
app.get('/api/nf/danfe/:id', (req, res) => { const nf = (DB.notas_fiscais || []).find(n => n.id == req.params.id); res.json({ danfe: nf || null }); });

// ===== AUTORIZAÇÕES =====
app.get('/api/autorizacoes', (req, res) => res.json({ autorizacoes: (DB.autorizacoes || []).map(a => ({ ...a, solicitante_nome: ((DB.funcionarios || []).find(f => f.id === a.solicitante_id) || {}).nome })) }));
app.post('/api/autorizacoes/decidir', (req, res) => {
  const a = (DB.autorizacoes || []).find(x => x.id == req.body.autorizacao_id);
  if (a) { a.status = req.body.decisao; a.autorizador_id = req.body.funcionario_id || 1; a.data_autorizacao = agora(); }
  saveDB();
  res.json({ sucesso: true });
});

// ===== RH: PONTO =====
app.get('/api/rh/ponto', (req, res) => res.json({ ponto: (DB.ponto || []).slice(-100).reverse().map(p => ({ ...p, funcionario_nome: ((DB.funcionarios || []).find(f => f.id === p.funcionario_id) || {}).nome })) }));
app.get('/api/rh/ponto/incompletos', (req, res) => {
  const incompletos = (DB.ponto || []).filter(p => p.situacao === 'incompleto').map(p => ({ ...p, funcionario_nome: ((DB.funcionarios || []).find(f => f.id === p.funcionario_id) || {}).nome, motivo: !p.entrada ? 'Sem entrada' : !p.saida ? 'Sem saída' : 'Dados parciais' }));
  res.json({ incompletos });
});
app.post('/api/rh/ponto/registrar', (req, res) => {
  const func = (DB.funcionarios || []).find(f => f.matricula === req.body.funcionario_matricula);
  if (!func) return res.json({ erro: 'Funcionário não encontrado' });
  const { entrada, saida, saida_almoco, retorno_almoco } = req.body;
  let horas = 0, extras = 0, saldo = 0, situacao = 'completo';
  if (entrada && saida) {
    const e = new Date('1970-01-01T' + entrada); const s = new Date('1970-01-01T' + saida);
    let intervalo = 0;
    if (saida_almoco && retorno_almoco) intervalo = (new Date('1970-01-01T' + retorno_almoco) - new Date('1970-01-01T' + saida_almoco)) / 3600000;
    horas = ((s - e) / 3600000) - intervalo;
    extras = Math.max(0, horas - (func.jornada_diaria || 8));
    saldo = horas - (func.jornada_diaria || 8);
  } else situacao = 'incompleto';
  let reg = (DB.ponto || []).find(p => p.funcionario_id === func.id && p.data_registro === req.body.data);
  if (!reg) { reg = { id: nextId('ponto'), funcionario_id: func.id, data_registro: req.body.data, created_at: agora() }; DB.ponto.push(reg); }
  Object.assign(reg, { entrada, saida, saida_almoco, retorno_almoco, horas_trabalhadas: Number(horas.toFixed(2)), horas_extras: Number(extras.toFixed(2)), saldo_horas: Number(saldo.toFixed(2)), situacao });
  saveDB();
  res.json({ sucesso: true, registro: reg });
});
app.post('/api/rh/ponto/acertar', (req, res) => {
  const reg = (DB.ponto || []).find(p => p.id == req.body.registro_id);
  if (!reg) return res.json({ erro: 'Registro não encontrado' });
  DB.acertos = DB.acertos || [];
  DB.acertos.push({ id: nextId('acertos'), registro_ponto_id: reg.id, solicitado_por: req.body.funcionario_id || 1, autorizado_por: req.body.funcionario_id || 1, campo_alterado: req.body.campo, valor_anterior: reg[req.body.campo], valor_novo: req.body.valor_novo, justificativa: req.body.justificativa, data_acordo: agora() });
  reg[req.body.campo] = req.body.valor_novo;
  reg.bloqueado = true; reg.alterado_por = req.body.funcionario_id || 1; reg.data_alteracao = agora();
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/rh/abono-gancho', (req, res) => {
  const func = (DB.funcionarios || []).find(f => f.matricula === req.body.funcionario_matricula);
  if (!func) return res.json({ erro: 'Funcionário não encontrado' });
  DB.abonos = DB.abonos || [];
  DB.abonos.push({ id: nextId('abonos'), funcionario_id: func.id, tipo: req.body.tipo, quantidade_horas: req.body.quantidade_horas, justificativa: req.body.justificativa || '', autorizado_por: req.body.funcionario_id || 1, lancado_em: agora() });
  saveDB();
  res.json({ sucesso: true });
});

// ===== RH: FÉRIAS / 13º =====
app.get('/api/rh/ferias', (req, res) => res.json({ ferias: (DB.ferias || []).map(f => ({ ...f, funcionario_nome: ((DB.funcionarios || []).find(x => x.id === f.funcionario_id) || {}).nome })) }));
app.post('/api/rh/ferias/registrar', (req, res) => {
  const func = (DB.funcionarios || []).find(f => f.matricula === req.body.funcionario_matricula);
  if (!func) return res.json({ erro: 'Funcionário não encontrado' });
  const valor = func.salario_base;
  const umTerco = valor / 3;
  const total = valor + umTerco;
  DB.ferias.push({ id: nextId('ferias'), funcionario_id: func.id, ...req.body, valor_ferias: valor, um_terco_constitucional: umTerco, valor_total: total, status: 'aprovada', created_at: agora() });
  saveDB();
  res.json({ sucesso: true, valor_total: total });
});
app.get('/api/rh/decimo-terceiro/:mat', (req, res) => {
  const func = (DB.funcionarios || []).find(f => f.matricula === req.params.mat);
  if (!func) return res.json({ erro: 'Funcionário não encontrado' });
  const meses = Math.min(12, Math.max(1, Math.floor((new Date() - new Date(func.data_admissao)) / (1000 * 60 * 60 * 24 * 30))));
  const valor = (func.salario_base / 12) * meses;
  res.json({ meses_trabalhados: meses, valor_proporcional: valor, primeiraParcela: valor / 2, segundaParcela: valor / 2 });
});

// ===== RH: HOLERITES =====
app.get('/api/rh/holerites', (req, res) => res.json({ holerites: (DB.holerites || []).map(h => ({ ...h, funcionario_nome: ((DB.funcionarios || []).find(f => f.id === h.funcionario_id) || {}).nome })) }));
app.post('/api/rh/holerites/criar', (req, res) => {
  const func = (DB.funcionarios || []).find(f => f.matricula === req.body.funcionario_matricula);
  if (!func) return res.json({ erro: 'Funcionário não encontrado' });
  const base = Number(req.body.salario_base || func.salario_base);
  const extras = Number(req.body.valor_horas_extras || 0);
  const abonos = Number(req.body.abonos || 0);
  const descontos = Number(req.body.descontos_gancho || 0);
  const inss = base * 0.075; const irrf = Math.max(0, (base - inss) * 0.075); const fgts = base * 0.08;
  const liquido = base + extras + abonos - inss - irrf - descontos;
  DB.holerites.push({ id: nextId('holerites'), funcionario_id: func.id, ...req.body, salario_base: base, inss, irrf, fgts, pis_cofins: base * 0.03, valor_liquido: Number(liquido.toFixed(2)), status: 'processada', data_geracao: agora() });
  saveDB();
  res.json({ sucesso: true, valor_liquido: liquido });
});

// ===== RH: RESCISÃO =====
app.post('/api/rh/rescisao/simular', (req, res) => {
  const func = (DB.funcionarios || []).find(f => f.matricula === req.body.funcionario_matricula);
  if (!func) return res.json({ erro: 'Funcionário não encontrado' });
  const diasServico = Math.ceil((new Date(req.body.data_desligamento) - new Date(func.data_admissao)) / 86400000);
  const meses = Math.min(12, Math.max(1, Math.floor(diasServico / 30)));
  const decimo = (func.salario_base / 12) * meses;
  const feriasProp = (func.salario_base / 12) * meses;
  const feriasTotal = feriasProp + (feriasProp / 3);
  const saldoSalario = Number(req.body.saldo_salario || 0);
  const total = saldoSalario + decimo + feriasTotal;
  res.json({ funcionario: func.nome, tempoServicoDias: diasServico, saldoSalario, decimoTerceiro: Number(decimo.toFixed(2)), feriasProporcionais: Number(feriasTotal.toFixed(2)), feriasVencidas: 0, totalDevido: Number(total.toFixed(2)) });
});

// ===== RH: DOCUMENTOS =====
app.get('/api/rh/documentos', (req, res) => res.json({ documentos: (DB.documentos_rh || []).map(d => ({ ...d, funcionario_nome: ((DB.funcionarios || []).find(f => f.id === d.funcionario_id) || {}).nome })) }));
app.post('/api/rh/documentos/salvar', (req, res) => {
  const func = (DB.funcionarios || []).find(f => f.matricula === req.body.funcionario_matricula);
  DB.documentos_rh.push({ id: nextId('documentos_rh'), funcionario_id: func ? func.id : 1, ...req.body, data_cadastro: agora() });
  saveDB();
  res.json({ sucesso: true });
});

// ===== LOGÍSTICA / FROTA =====
app.get('/api/logistica/movimentos', (req, res) => res.json({ movimentos: DB.logistica || [] }));
app.post('/api/logistica/criar', (req, res) => { DB.logistica.push({ id: nextId('logistica'), ...req.body, status: 'EM_TRANSITO', created_at: agora() }); saveDB(); res.json({ sucesso: true }); });
app.post('/api/logistica/concluir', (req, res) => { const l = (DB.logistica || []).find(x => x.id == req.body.logistica_id); if (l) l.status = 'CONCLUIDO'; saveDB(); res.json({ sucesso: true }); });
app.get('/api/frota', (req, res) => res.json({ frota: (DB.frota || []).map(f => ({ ...f, entregador_nome: ((DB.funcionarios || []).find(x => x.id === f.entregador_id) || {}).nome })) }));
app.post('/api/frota/salvar', (req, res) => { DB.frota.push({ id: nextId('frota'), ...req.body, status: 'disponivel' }); saveDB(); res.json({ sucesso: true }); });

// ===== CHECKLISTS =====
app.get('/api/checklists/concluidos', (req, res) => res.json({ checklists: (DB.checklists_exec || []).slice(-50).reverse() }));
app.get('/api/checklists/executar/:tipo', (req, res) => res.json({ tipo: req.params.tipo, mensagem: 'Checklist aberto para execução' }));
app.get('/api/checklists/imprimir/:id', (req, res) => res.json({ checklist_id: req.params.id, mensagem: 'Impressão gerada' }));
app.get('/api/checklists/imprimir/evento/:id', (req, res) => res.json({ evento_id: req.params.id, mensagem: 'Checklist do evento gerado' }));

// ===== BOT WHATSAPP / CELULAR =====
app.get('/api/bot/config', (req, res) => res.json({ config_geral: DB.bot_config || [], regras: DB.bot_regras || [] }));
app.post('/api/bot/config', (req, res) => {
  ['nome_bot', 'saudacao', 'horario_atendimento', 'endereco'].forEach(k => {
    if (req.body[k] !== undefined) {
      let cfg = (DB.bot_config || []).find(c => c.nome === k);
      if (!cfg) { cfg = { nome: k, valor: '' }; DB.bot_config.push(cfg); }
      cfg.valor = req.body[k];
    }
  });
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/bot/regras', (req, res) => { DB.bot_regras.push({ id: nextId('bot_regras'), palavras_chave: req.body.palavras_chave, resposta: req.body.resposta }); saveDB(); res.json({ sucesso: true }); });
app.post('/api/bot/regras/excluir', (req, res) => { DB.bot_regras = (DB.bot_regras || []).filter(r => r.id != req.body.id); saveDB(); res.json({ sucesso: true }); });
// Endpoint principal do bot — usado pelo WhatsApp (webhook) e pelo site/celular
function responderBot(mensagem) {
  const msg = (mensagem || '').toLowerCase();
  const regra = (DB.bot_regras || []).find(r => r.palavras_chave.split('|').some(kw => msg.includes(kw.trim().toLowerCase())));
  if (regra) return regra.resposta;
  const nomeBot = ((DB.bot_config || []).find(c => c.nome === 'nome_bot') || {}).valor || 'Bot';
  return `Olá! Eu sou o ${nomeBot}. Posso te ajudar com: sabores e preços, picolés, açaí, eventos/festas, delivery/iFood e horários. O que deseja?`;
}
app.post('/api/bot/responder', (req, res) => res.json({ resposta: responderBot(req.body.mensagem) }));
// Webhook do WhatsApp (ex: Evolution API / Z-API / Twilio) — recebe mensagem do celular e responde
app.post('/api/bot/webhook', (req, res) => {
  const msg = req.body.message || req.body.text || req.body.body || '';
  const remetente = req.body.from || req.body.remetente || 'celular';
  const resposta = responderBot(msg);
  // Aqui você integra com a API do WhatsApp (Evolution/Z-API/Twilio) para enviar a resposta
  DB.bot_log = DB.bot_log || [];
  DB.bot_log.push({ id: nextId('bot_log'), remetente, mensagem: msg, resposta, data: agora() });
  saveDB();
  res.json({ resposta, remetente });
});
app.get('/api/bot/log', (req, res) => res.json({ log: (DB.bot_log || []).slice(-50).reverse() }));

// ===== IA VENDAS =====
app.get('/api/ia-vendas/metricas', (req, res) => res.json({ total_pedidos: (DB.ia_pedidos || []).length, receita_ia: (DB.ia_pedidos || []).reduce((s, p) => s + Number(p.total || 0), 0), clientes_site: new Set((DB.ia_pedidos || []).map(p => p.cliente_nome)).size }));
app.get('/api/ia-vendas/produtos-recomendados', (req, res) => res.json({ recomendados: (DB.produtos || []).filter(p => p.categoria !== 'Insumos').slice(0, 5) }));
app.post('/api/ia-vendas/chat', (req, res) => {
  const msg = (req.body.mensagem || '').toLowerCase();
  let resposta = responderBot(msg);
  let produtos = [];
  if (msg.includes('combo') || msg.includes('promo') || msg.includes('recomenda')) {
    produtos = (DB.produtos || []).filter(p => ['Picolés', 'Sorvetes', 'Açaí'].includes(p.categoria)).slice(0, 3);
    resposta = 'Montei um combo especial para você: ' + produtos.map(p => p.nome + ' (' + fmt(p.preco_venda) + ')').join(', ') + '. Posso adicionar ao pedido?';
  }
  res.json({ resposta, produtos });
});
app.post('/api/ia-vendas/salvar-pedido', (req, res) => {
  const pedido = { id: nextId('ia_pedidos'), ...req.body, status: 'CONFIRMADO', data: agora() };
  DB.ia_pedidos.push(pedido);
  DB.pedidos_site.push({ id: nextId('pedidos_site'), ...req.body, origem: 'site_ia', status: 'CONFIRMADO', nf_emitida: false, data: agora() });
  saveDB();
  res.json({ sucesso: true, pedido_id: pedido.id });
});

// ===== GERENTE =====
app.get('/api/gerente/status-modulos', (req, res) => {
  const modulos = [
    { modulo: 'Vendas Hoje', valor: fmt((DB.vendas || []).filter(v => (v.data || '').slice(0, 10) === hoje()).reduce((s, v) => s + Number(v.total || 0), 0)), status: 'ok' },
    { modulo: 'Caixa', valor: (DB.caixas || []).some(c => c.status === 'aberto') ? 'Aberto' : 'Fechado', status: (DB.caixas || []).some(c => c.status === 'aberto') ? 'ok' : 'atencao' },
    { modulo: 'Tesouraria', valor: (DB.tesouraria || []).some(t => t.status === 'aberta' && t.data === hoje()) ? 'Aberta' : 'Fechada', status: (DB.tesouraria || []).some(t => t.status === 'aberta' && t.data === hoje()) ? 'ok' : 'atencao' },
    { modulo: 'Estoque Baixo', valor: (DB.estoque || []).filter(e => Number(e.qty || 0) < 20).length + ' itens', status: (DB.estoque || []).filter(e => Number(e.qty || 0) < 20).length ? 'critico' : 'ok' },
    { modulo: 'Remessas em Trânsito', valor: (DB.remessas || []).filter(r => r.status !== 'recebida').length, status: (DB.remessas || []).filter(r => r.status !== 'recebida').length ? 'atencao' : 'ok' },
    { modulo: 'Ponto Incompleto', valor: (DB.ponto || []).filter(p => p.situacao === 'incompleto').length, status: (DB.ponto || []).filter(p => p.situacao === 'incompleto').length ? 'atencao' : 'ok' }
  ];
  res.json({ modulos });
});
app.get('/api/gerente/relatorio-vendas', (req, res) => {
  const vendas = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().slice(0, 10);
    const doDia = (DB.vendas || []).filter(v => (v.data || '').slice(0, 10) === ds);
    vendas.push({ dia: ds, origem: 'loja', valor: doDia.filter(v => v.origem !== 'site').reduce((s, v) => s + Number(v.total || 0), 0) });
    vendas.push({ dia: ds, origem: 'site', valor: doDia.filter(v => v.origem === 'site' || v.origem === 'ifood').reduce((s, v) => s + Number(v.total || 0), 0) });
  }
  res.json({ vendas });
});

// ===== SITE (página pública com chatbot para celular) =====
app.get('/api/site/produtos', (req, res) => res.json({ produtos: (DB.produtos || []).filter(p => p.categoria !== 'Insumos' && p.status === 'ATIVO') }));
app.post('/api/site/pedido', (req, res) => {
  const pedido = { id: nextId('pedidos_site'), ...req.body, origem: 'site', status: 'SOLICITADO', nf_emitida: false, data: agora() };
  DB.pedidos_site.push(pedido);
  saveDB();
  res.json({ sucesso: true, pedido_id: pedido.id });
});

// ===== CRM / CONTATOS =====
app.get('/api/crm/contatos', (req, res) => {
  const contatos = (DB.crm_contatos || []).slice(-50).reverse();
  const hojeStr = hoje();
  res.json({
    total_clientes: (DB.clientes || []).length,
    contatos_hoje: contatos.filter(c => (c.data || '').slice(0,10) === hojeStr).length,
    oportunidades: contatos.filter(c => c.status === 'pendente' || c.status === 'em_andamento').length,
    clientes_vip: (DB.clientes || []).filter(c => Number(c.valor_total_gasto || 0) > 500).length,
    contatos
  });
});
app.post('/api/crm/contato/salvar', (req, res) => {
  DB.crm_contatos = DB.crm_contatos || [];
  DB.crm_contatos.push({ id: nextId('crm_contatos'), ...req.body, data: agora(), status: req.body.status || 'pendente' });
  saveDB();
  res.json({ sucesso: true });
});
app.post('/api/crm/contato/finalizar', (req, res) => {
  const c = (DB.crm_contatos || []).find(x => x.id == req.body.contato_id);
  if (c) c.status = 'concluido';
  saveDB();
  res.json({ sucesso: true });
});

// ===== BOLETOS / BANCOS =====
app.get('/api/boletos/lista', (req, res) => {
  const boletos = (DB.boletos || []).slice(-50).reverse();
  res.json({
    boletos,
    pagos: boletos.filter(b => b.status === 'pago').length,
    pendentes: boletos.filter(b => b.status === 'pendente').length,
    vencidos: boletos.filter(b => b.status === 'vencido' || (b.vencimento < hoje() && b.status !== 'pago')).length,
    bancos_conectados: 1
  });
});
app.post('/api/boletos/gerar', (req, res) => {
  const numero = 'BOL-' + String((DB.boletos || []).length + 1).padStart(6, '0');
  DB.boletos = DB.boletos || [];
  DB.boletos.push({ id: nextId('boletos'), numero, ...req.body, status: 'pendente', data_geracao: agora() });
  saveDB();
  res.json({ sucesso: true, numero });
});
app.post('/api/boletos/pagar', (req, res) => {
  const b = (DB.boletos || []).find(x => x.id == req.body.boleto_id);
  if (b) { b.status = 'pago'; b.data_pagamento = agora(); }
  saveDB();
  res.json({ sucesso: true });
});
app.get('/api/boletos/imprimir/:id', (req, res) => {
  const b = (DB.boletos || []).find(x => x.id == req.params.id);
  res.json({ boleto: b, linha_digitavel: '0019050095401448160690601020000058185000000000' });
});

// ===== IFOOD =====
app.get('/api/ifood/status', (req, res) => {
  const cfg = DB.ifood_config || { conectado: false };
  const pedidos = (DB.pedidos_site || []).filter(p => p.origem === 'ifood').slice(-20).reverse();
  const hojeStr = hoje();
  res.json({
    conectado: cfg.conectado || false,
    pedidos_hoje: pedidos.filter(p => (p.data || '').slice(0,10) === hojeStr).length,
    valor_hoje: pedidos.filter(p => (p.data || '').slice(0,10) === hojeStr).reduce((s,p) => s + Number(p.total || 0), 0),
    taxa_media: 12,
    pedidos
  });
});
app.post('/api/ifood/configurar', (req, res) => {
  DB.ifood_config = { ...req.body, conectado: req.body.ativo, configurado_em: agora() };
  saveDB();
  res.json({ sucesso: true });
});

// ===== STATUS DAS LOJAS (para dashboard) =====
app.get('/api/lojas/status', (req, res) => {
  const lojas = (DB.unidades || []).map(u => ({
    id: u.id, nome: u.nome, tipo: u.tipo, e_matriz: u.e_matriz,
    online: true,
    caixa_aberto: (DB.caixas || []).some(c => c.unidade_id === u.id && c.status === 'aberto'),
    vendas_hoje: (DB.vendas || []).filter(v => (v.data || '').slice(0,10) === hoje() && v.unidade_id === u.id).reduce((s,v) => s + Number(v.total || 0), 0),
    pedidos_pendentes: (DB.pedidos_site || []).filter(p => p.unidade_id === u.id && p.status !== 'ENTREGUE' && p.status !== 'CANCELADO').length
  }));
  res.json({ lojas, matriz_aberta: DB.controle_sistema?.matriz_aberta || false });
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => res.json({ status: 'ok', sistema: DB.controle_sistema?.status_geral, banco: USAR_SUPABASE ? 'supabase' : 'local', hora: agora() }));

// ===== STARTUP (carrega Supabase antes de subir) =====
(async () => {
  await loadDB();
  app.listen(PORT, () => {
    console.log('🍦 Sorveteria ERP rodando na porta ' + PORT + ' | Banco: ' + (USAR_SUPABASE ? 'Supabase ✅' : 'Arquivo local (defina SUPABASE_URL e SUPABASE_KEY)'));
    console.log('   Dashboard: http://localhost:' + PORT + '/dashboard.html');
    console.log('   Site:      http://localhost:' + PORT + '/site.html');
    console.log('   Bot webhook: POST /api/bot/webhook');
  });
})();
