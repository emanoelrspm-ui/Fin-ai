# FinAI — Inteligência Financeira

Aplicação web instalável (PWA) de controle financeiro pessoal em Reais (`R$` / BRL) com captura de despesas por texto ou foto de comprovante usando Cloudflare Workers AI, armazenamento privado de comprovantes no Cloudflare R2, banco de dados Cloudflare D1 e autenticação via Supabase Auth.

---

## 1. Pré-requisitos

Antes de publicar o projeto, tenha em mãos:

1. **Conta no Supabase** (gratuita):
   - URL do projeto (`VITE_SUPABASE_URL` / `SUPABASE_URL`)
   - Chave pública anônima (`VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` — **nunca** use `service_role`)
2. **Conta na Cloudflare** (gratuita):
   - **Cloudflare Pages** para hospedar o frontend e as Pages Functions (`/functions`)
   - **Cloudflare D1** (banco SQLite serverless)
   - **Cloudflare R2** (bucket privado para fotos de comprovantes)
   - **Cloudflare Workers AI** (habilitado na conta, sem chave externa)
3. **Repositório Git** (GitHub ou GitLab) conectado ao Cloudflare Pages (ou CLI `wrangler` para deploy manual).

---

## 2. Banco de Dados (SQL das Tabelas no Cloudflare D1)

No painel da Cloudflare, acesse **Workers & Pages → D1 SQL Database**, crie um banco (ex.: `finai-db`) e execute o script SQL abaixo na aba **Console**:

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Débito',
  source TEXT DEFAULT 'manual',
  ai_confidence REAL,
  receipt_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON expenses (user_id, expense_date DESC);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  limit_cents INTEGER NOT NULL,
  month TEXT
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_cat
  ON budgets (user_id, category);

CREATE TABLE IF NOT EXISTS merchant_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  merchant_normalized TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_merchant_rules_user
  ON merchant_rules (user_id);

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
```

> **Observação:** Todos os valores monetários são armazenados em **centavos inteiros** (`amount_cents`, `limit_cents`) e todas as datas no padrão `YYYY-MM-DD` (fuso `America/Sao_Paulo`).

---

## 3. Bindings Obrigatórios no Cloudflare Pages

No projeto do **Cloudflare Pages → Settings → Functions → Bindings**, configure exatamente com estes nomes (tanto para **Production** quanto para **Preview**):

| Tipo do Binding | Nome da Variável (Binding Name) | Recurso Apontado |
| :--- | :--- | :--- |
| **D1 database** | `DB` | Seu banco D1 (ex.: `finai-db`) |
| **R2 bucket** | `BUCKET` | Seu bucket R2 **privado** (sem acesso público) |
| **Workers AI** | `AI` | Binding nativo de IA da Cloudflare |

---

## 4. Variáveis de Ambiente

No painel do **Cloudflare Pages → Settings → Environment variables**, adicione estas 4 variáveis (em **Production** e **Preview**):

### Para o Frontend (usadas durante o build)
- `VITE_SUPABASE_URL` = URL do seu projeto Supabase (ex.: `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = Chave pública `anon` / `publishable` do Supabase

### Para as Pages Functions (usadas em tempo de execução no servidor)
- `SUPABASE_URL` = Mesma URL do projeto Supabase
- `SUPABASE_ANON_KEY` = Mesma chave pública `anon` / `publishable` do Supabase

> **Importante:** Nunca configure `SUPABASE_SERVICE_ROLE_KEY` ou chaves secretas de IA. O backend valida o usuário consultando `GET {SUPABASE_URL}/auth/v1/user` com o token do próprio usuário.

---

## 5. Como Fazer Deploy no Cloudflare Pages

1. Acesse **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.
2. Selecione o repositório do projeto.
3. Na configuração de build, informe exatamente:
   - **Framework preset**: `Vite` (ou `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Adicione as **Variáveis de Ambiente** da seção 4 antes de concluir o primeiro deploy (ou faça um novo deploy após adicioná-las).
5. Após criar o projeto, vá em **Settings → Functions → Bindings** e adicione `DB`, `BUCKET` e `AI`.
6. No painel do **Supabase → Authentication → URL Configuration**, adicione a URL final do seu Cloudflare Pages (`https://seu-app.pages.dev`) em **Site URL** e **Redirect URLs** (necessário para confirmação de e-mail e recuperação de senha).
7. Clique em **Retry deployment** (ou envie um novo commit) para que o build final já inclua as variáveis `VITE_*` e os bindings ativos.

---

## 6. Modelos de IA e Licença de Visão (Workers AI)

Os modelos estão centralizados em `functions/_lib/models.ts` para troca rápida caso necessário:
- **Texto / Classificação do Chat**: `@cf/meta/llama-3.1-8b-instruct`
- **Leitura de Comprovantes (Visão)**: `@cf/meta/llama-3.2-11b-vision-instruct`

### Aceite automático da licença do Llama 3.2 Vision
Na primeira utilização do modelo de visão em uma conta Cloudflare, a Meta exige um aceite único de licença (`{ prompt: "agree" }`). O backend detecta automaticamente esse erro na primeira foto enviada, realiza o aceite na sua conta e reenvia a leitura do comprovante sem exigir ação manual.

---

## 7. Checklist de Testes Pós-Deploy

Após publicar na Cloudflare Pages, valide os itens abaixo:

- [ ] **Cadastro e Login**: Criar uma conta, confirmar e-mail (se habilitado no Supabase), fazer login e conferir se o nome aparece no Painel.
- [ ] **Recuperação de Senha**: Testar *"Esqueci minha senha"* e abrir o link enviado para redefinir a senha.
- [ ] **Despesa Manual**: Criar, editar e excluir um lançamento; recarregar a página e confirmar persistência no D1.
- [ ] **Captura por Texto com IA**: Digitar *"uber 24,90 hoje"* na barra de IA, revisar e salvar.
- [ ] **Captura por Foto + R2**: No celular, tocar em **Tirar foto** (deve abrir a câmera traseira via `capture="environment"`), enviar um cupom, salvar e abrir **Comprovante** para verificar o carregamento privado via R2.
- [ ] **Orçamentos e Insights**: Definir um limite em **Orçamentos**, adicionar despesas até passar de 80% (alerta) e 100% (estourado), e conferir o card **Insights do Mês** no resumo.
- [ ] **Chat Financeiro**: Perguntar *"Quanto gastei este mês?"* e *"Mostre meus gastos por categoria"* no Consultor FinAI.
- [ ] **Exportação CSV**: Filtrar por data em **Lançamentos** e clicar em **Exportar CSV**.
- [ ] **Isolamento entre Usuários**: Tentar acessar `/api/receipts/...` ou `/api/expenses/:id` de outra conta deve retornar **404**.
- [ ] **PWA e Segurança**: Verificar no DevTools → Application se o `manifest.webmanifest` e o Service Worker estão ativos, se o botão **Instalar app** aparece e se `/api/*` responde com `Cache-Control: no-store`.

---

## 8. Solução de Problemas Comuns

### 1. Erro `401 Unauthorized` em todas as chamadas `/api/*`
- **Causa comum**: `SUPABASE_URL` ou `SUPABASE_ANON_KEY` não estão configuradas nas **Environment variables** do Cloudflare Pages (ou foram adicionadas apenas com o prefixo `VITE_`), ou há divergência entre o projeto Supabase do frontend e do backend.
- **Como resolver**: Confira se **ambos** os pares (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` **e** `SUPABASE_URL` + `SUPABASE_ANON_KEY`) estão preenchidos e apontam para o mesmo projeto Supabase.

### 2. Erro de Binding Ausente (`DB`, `BUCKET` ou `AI` não configurado)
- **Causa comum**: O nome do binding no Cloudflare Pages não corresponde exatamente a `DB`, `BUCKET` ou `AI`, ou foi configurado apenas em *Preview* e não em *Production*.
- **Como resolver**: Em **Settings → Functions → Bindings**, garanta que `DB`, `BUCKET` e `AI` estejam vinculados em **Production** e **Preview**, e faça um novo deploy.

### 3. Cota de IA esgotada (`429 AI_LIMIT` ou `503 AI_UNAVAILABLE`)
- **Causa comum**: O usuário atingiu o limite de proteção de **40 chamadas diárias** na tabela `ai_usage`, ou a cota gratuita diária de Neurons da Cloudflare foi alcançada.
- **Como resolver**: O sistema abre automaticamente o preenchimento manual sem perder os dados. O contador diário reinicia à meia-noite no fuso `America/Sao_Paulo`.

### 4. Variável `VITE_*` alterada não surtiu efeito no site publicado
- **Causa comum**: No Vite, variáveis que começam com `VITE_` são embutidas no código JavaScript **apenas no momento do build** (`npm run build`), e não em tempo de execução.
- **Como resolver**: Sempre que criar ou editar `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` no painel da Cloudflare, execute um **novo deploy (Retry deployment)** para gerar um novo bundle em `dist`.
