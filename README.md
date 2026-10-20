# 🍦 Sorveteria ERP — Sistema Completo

Sistema ERP completo para sorveteria, açaí e picolés — com PDV, produção, RH, financeiro, bot WhatsApp e site para celular.

## 📁 Estrutura

```
sorveteria-erp/
├── package.json          # Dependências (express, cors)
├── server.js             # Backend completo — todos os endpoints da API + bot + site
├── public/
│   ├── dashboard.html    # Painel administrativo (ERP completo)
│   └── site.html         # Site público com cardápio + chatbot (mobile)
├── sql/
│   └── 01-estrutura-completa.sql  # Estrutura do banco (para Supabase/PostgreSQL)
└── data.json             # Gerado automaticamente (persistência local)
```

## 🚀 Como rodar localmente

```bash
npm install
npm start
# Acesse:
#   Painel ERP:  http://localhost:8080/dashboard.html
#   Site/Cliente: http://localhost:8080/site.html
#   Login padrão: SV-2026-0001 / 123
```

## ☁️ Deploy no Render

1. Crie um novo **Web Service** no Render conectado ao seu repositório GitHub.
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. A porta é lida de `process.env.PORT` (o Render define automaticamente).
5. Os dados são salvos em `data.json` (persistência local). Para produção com múltiplas instâncias, conecte ao Supabase (veja abaixo).

## 🤖 Bot WhatsApp / Celular

O backend já inclui o endpoint de webhook:
- `POST /api/bot/webhook` — recebe mensagens do WhatsApp e responde automaticamente.

**Para integrar com WhatsApp real**, use uma das APIs:
- **Evolution API** (open-source, self-hosted)
- **Z-API** / **Wati** / **Twilio** (SaaS)

Configure o webhook da sua API de WhatsApp para apontar para:
`https://SEU-SITE.onrender.com/api/bot/webhook`

O bot responde com base nas regras cadastradas no painel (menu **Bot Config**).

## 📱 Site para Celular

O `site.html` é uma página pública responsiva (mobile-first) com:
- Cardápio completo com preços
- Carrinho de compras
- Botão de WhatsApp
- Chatbot flutuante integrado (usa `/api/bot/responder`)

## 🔑 Funcionalidades Principais

| Módulo | Descrição |
|---|---|
| **Controle Matriz** | Matriz abre/fecha sistema; filial bloqueada sem Matriz; PDV Emergencial |
| **PDV/Caixa** | Comanda QR, balança (kg), iFood, venda sem comanda pede ADM |
| **Produção** | Fichas técnicas com passo a passo + tempos; Ordens de Serviço delegadas |
| **Estoque** | Lotes, validade, remessas Matriz→Filial com conferência |
| **Financeiro** | Tesouraria (abre antes do caixa), contas, NF com 3 regimes tributários |
| **RH** | Ponto (só ADM acerta), férias+1/3, 13º proporcional, holerites, rescisão simulada, documentos |
| **Patrimônio** | Cadeiras, freezers, balcões — etiquetados com checklist de mudança |
| **Checklists** | Envio, recebimento, mudança, evento, pagamento, contratação |
| **Bot** | WhatsApp + site com regras personalizáveis |
| **IA Vendas** | Recomendação de sabores e combos |

## 🗄️ Usando Supabase (opcional)

O sistema funciona sem banco externo (persiste em `data.json`). Para usar PostgreSQL/Supabase:
1. Execute o `sql/01-estrutura-completa.sql` no SQL Editor do Supabase.
2. Instale: `npm install @supabase/supabase-js`
3. No `server.js`, substitua as funções de store (`DB.xxx.push`, etc.) por chamadas do Supabase.

## 🔐 Login padrão

- **Matrícula**: `SV-2026-0001`
- **Senha**: `123`
- Perfil: Administrador (Matriz)

---
Feito com 💙 para sorveterias, açaíterias e fábricas de picolés.
