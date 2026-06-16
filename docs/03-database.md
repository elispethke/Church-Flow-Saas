# Church Flow — Database Design

**Versão:** 1.0  
**Status:** Aprovado  
**Data:** 2026-06-16  
**Responsável:** Database Architect / Software Architect  
**Dependências:** `02-architecture.md` (Aprovado)

---

## Índice

1. [Estratégia de Banco de Dados](#1-estratégia-de-banco-de-dados)
2. [Modelagem Conceitual](#2-modelagem-conceitual)
3. [Relacionamentos](#3-relacionamentos)
4. [Multi-Tenancy no Banco](#4-multi-tenancy-no-banco)
5. [Especificação das Tabelas](#5-especificação-das-tabelas)
6. [Tabelas Adicionais Necessárias](#6-tabelas-adicionais-necessárias)
7. [Auditoria no Banco](#7-auditoria-no-banco)
8. [Índices e Performance](#8-índices-e-performance)
9. [Segurança no Banco](#9-segurança-no-banco)
10. [Convenções](#10-convenções)
11. [Riscos e Considerações Futuras](#11-riscos-e-considerações-futuras)

---

## 1. Estratégia de Banco de Dados

### 1.1 Escolha do PostgreSQL

O Church Flow utiliza **PostgreSQL 16** como único banco de dados relacional. A escolha é intencional e não deve ser revertida para um banco NoSQL ou SQLite em nenhum ambiente.

**Justificativas:**

| Característica | Valor para o Church Flow |
|---|---|
| **ACID completo** | Integridade transacional é crítica para o módulo financeiro — débito e crédito em uma transferência devem ser atômicos |
| **Tipos de dados ricos** | `DECIMAL` para valores monetários (sem floating-point errors), `JSONB` para auditoria (before/after), `UUID` nativo para IDs |
| **Row-level security** | Suporte nativo a políticas de acesso por linha — camada adicional de isolamento possível em V2 |
| **Performance analítica** | Window functions, CTEs, índices parciais — essenciais para relatórios financeiros |
| **Particionamento nativo** | Suporte a table partitioning por range/list — necessário para escalar `audit_logs` |
| **Extensões robustas** | `uuid-ossp` ou `gen_random_uuid()` nativo, `pg_trgm` para buscas por texto |

**Por que não MySQL/MariaDB:** Suporte inferior a JSONB, window functions e particionamento. UUID como tipo nativo é mais simples no PostgreSQL.

**Por que não um banco NoSQL:** O modelo de dados do Church Flow é inerentemente relacional — tenants, usuários, transações financeiras, departamentos têm relacionamentos fortes com integridade referencial. Um banco documental tornaria queries de join e relatórios financeiros significativamente mais complexos.

### 1.2 ORM: Prisma

O acesso ao banco é feito exclusivamente via **Prisma ORM**. Decisões:

- Migrations gerenciadas pelo Prisma (`prisma migrate dev` em desenvolvimento, `prisma migrate deploy` em produção)
- Nunca modificar o banco diretamente em produção sem migration correspondente
- Migrations em produção são executadas durante o deploy (GitHub Actions) — antes de subir a nova versão da API
- Queries complexas de relatório podem usar `prisma.$queryRaw` com template literals tipados — para evitar SQL injection mesmo em raw queries

**Trade-offs do Prisma:**
- Problema de N+1 se `include` não for usado conscientemente — mitigado via review de queries em services
- Para relatórios financeiros complexos (DRE, fluxo de caixa), Prisma `$queryRaw` ou views materializadas serão necessárias
- Schema single-file em V1 — aceito para este porte; em V2 considerar multi-file schema

### 1.3 Convenções Globais do Schema

| Convenção | Padrão Adotado |
|---|---|
| **IDs** | `UUID v4` gerado pelo banco (`gen_random_uuid()`) em todas as tabelas. Nunca auto-increment integer. |
| **Timestamps** | Todas as tabelas têm `created_at TIMESTAMPTZ DEFAULT NOW()` e `updated_at TIMESTAMPTZ` |
| **Soft delete** | Tabelas com histórico relevante têm `deleted_at TIMESTAMPTZ DEFAULT NULL`. Registros com `deleted_at IS NOT NULL` são considerados inativos. |
| **Tenant ID** | `church_id UUID NOT NULL` em todas as tabelas multi-tenant. FK para `churches.id`. |
| **Timezone** | Todos os timestamps em UTC (`TIMESTAMPTZ`). Conversão para timezone do tenant ocorre na camada de aplicação. |
| **Valores monetários** | `DECIMAL(12, 2)` — suporta valores até 9.999.999.999,99. Nunca `FLOAT` ou `DOUBLE`. |
| **Enums** | Definidos como `TEXT` com constraint `CHECK` em V1. Permite evolução sem migration de tipo. |
| **Nomes de tabelas** | `snake_case` plural |
| **Nomes de colunas** | `snake_case` |

**Por que UUID e não SERIAL/BIGSERIAL:**
- UUIDs permitem geração de ID no cliente antes de persistir (utill para otimistic updates)
- Sem previsibilidade sequencial — atacante não consegue enumerar IDs
- Preparado para merge de dados entre tenants ou ambientes sem colisão de IDs
- Custo: levemente maior que inteiros em índices — aceitável para o porte esperado

---

## 2. Modelagem Conceitual

### 2.1 Domínios do Sistema

O schema está organizado em **6 domínios** lógicos:

```
┌─────────────────────────────────────────────────────────────┐
│  PLATAFORMA                                                   │
│  churches · plans · subscriptions · invoices                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  IDENTIDADE E ACESSO                                          │
│  users · roles · permissions · user_roles                    │
│  role_permissions · refresh_tokens · user_invites            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ORGANIZAÇÃO                                                  │
│  departments · department_leaders · department_members        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FINANCEIRO                                                   │
│  bank_accounts · financial_categories · financial_transactions│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PATRIMÔNIO                                                   │
│  asset_categories · assets · asset_movements                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EVENTOS                                                      │
│  events · event_attendees                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SISTEMA                                                      │
│  audit_logs · notifications                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Relacionamentos

### 3.1 Diagrama de Relacionamentos

```
churches ──────────── 1:N ──────────── users
churches ──────────── 1:N ──────────── departments
churches ──────────── 1:N ──────────── bank_accounts
churches ──────────── 1:N ──────────── financial_categories
churches ──────────── 1:N ──────────── financial_transactions
churches ──────────── 1:N ──────────── assets
churches ──────────── 1:N ──────────── events
churches ──────────── 1:1 ──────────── subscriptions (ativa)
churches ──────────── 1:N ──────────── invoices
churches ──────────── 1:N ──────────── audit_logs

users ──────────────── 1:N ──────────── refresh_tokens
users ──────────────── 1:N ──────────── user_invites (enviados)
users ──────────────── M:N ──────────── roles         (via user_roles)
users ──────────────── M:N ──────────── departments    (via department_leaders — como líder)
users ──────────────── 1:N ──────────── notifications

roles ──────────────── M:N ──────────── permissions    (via role_permissions)

departments ────────── 1:N ──────────── departments    (self-reference: parent_id)
departments ────────── M:N ──────────── users          (via department_leaders)
departments ────────── 1:N ──────────── department_members

financial_categories ── 1:N ──────────── financial_categories (self-reference: parent_id)
financial_transactions ─ N:1 ─────────── bank_accounts
financial_transactions ─ N:1 ─────────── financial_categories
financial_transactions ─ N:1 (opt) ────── departments
financial_transactions ─ N:1 (opt) ────── events

assets ──────────────── N:1 ─────────── asset_categories
assets ──────────────── 1:N ─────────── asset_movements

events ──────────────── N:1 (opt) ────── departments
events ──────────────── 1:N ─────────── event_attendees

plans ───────────────── 1:N ─────────── subscriptions
subscriptions ──────────── 1:N ─────────── invoices
```

### 3.2 Regras de Integridade Referencial

- **Cascade delete:** Nunca usado em dados de negócio — preservação histórica é obrigatória
- **Restrict delete:** Aplicado onde entidades são referenciadas (ex: não pode deletar `bank_account` com `financial_transactions` vinculadas)
- **Set null:** Aplicado em referências opcionais onde a entidade referenciada pode ser deletada (ex: `department_id` em `financial_transactions` pode ser nulo se departamento for inativado)
- **Soft delete:** Mecanismo primário — não deleta fisicamente, apenas marca `deleted_at`

---

## 4. Multi-Tenancy no Banco

### 4.1 Regra Fundamental

**Toda tabela que contém dados de negócio de um tenant específico DEVE ter `church_id UUID NOT NULL`.**

Tabelas globais (sem `church_id`): `plans`, `roles`, `permissions`, `role_permissions`
Estas são tabelas de configuração do sistema — iguais para todos os tenants.

### 4.2 Foreign Key Constraints

Todas as relações entre entidades do mesmo tenant devem ser verificáveis:
- `departments.church_id` deve ser igual ao `users.church_id` do líder associado em `department_leaders`
- `financial_transactions.church_id` deve ser igual ao `bank_accounts.church_id` e `financial_categories.church_id`
- Esta verificação é feita no **service layer** (não como FK constraint), pois FK cross-column de tenant seria excessivamente complexa em PostgreSQL

### 4.3 Índices de Tenant

Todo índice em tabelas multi-tenant **começa com `church_id`**:
```sql
-- Correto
CREATE INDEX idx_transactions_church_id_date
  ON financial_transactions (church_id, competence_date DESC);

-- Incorreto — não aproveita o filtro de tenant
CREATE INDEX idx_transactions_date
  ON financial_transactions (competence_date DESC);
```

**Justificativa:** A maioria das queries filtra por `church_id` primeiro. Um índice que começa com `church_id` é aproveitado mesmo quando apenas `church_id` é filtrado.

---

## 5. Especificação das Tabelas

---

### `churches`

Entidade central do sistema. Representa um tenant.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `TEXT` | NOT NULL | — | Nome oficial da organização |
| `slug` | `TEXT` | NOT NULL | — | Identificador único URL-safe. Gerado a partir do nome. |
| `cnpj` | `TEXT` | NULL | — | CNPJ formatado (nullable — igrejas informais) |
| `email` | `TEXT` | NOT NULL | — | Email institucional |
| `phone` | `TEXT` | NULL | — | Telefone principal |
| `address_street` | `TEXT` | NULL | — | Endereço |
| `address_number` | `TEXT` | NULL | — | Número |
| `address_complement` | `TEXT` | NULL | — | Complemento |
| `address_district` | `TEXT` | NULL | — | Bairro |
| `address_city` | `TEXT` | NULL | — | Cidade |
| `address_state` | `CHAR(2)` | NULL | — | UF (ex: SP, RJ) |
| `address_zip` | `TEXT` | NULL | — | CEP |
| `logo_url` | `TEXT` | NULL | — | URL do logotipo no MinIO |
| `timezone` | `TEXT` | NOT NULL | `'America/Sao_Paulo'` | Timezone para exibição de datas |
| `currency` | `CHAR(3)` | NOT NULL | `'BRL'` | Código ISO 4217 da moeda |
| `status` | `TEXT` | NOT NULL | `'pending'` | `pending` \| `trial` \| `active` \| `suspended` \| `cancelled` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `uq_churches_slug` → `UNIQUE (slug)`
- `uq_churches_cnpj` → `UNIQUE (cnpj)` WHERE cnpj IS NOT NULL
- `chk_churches_status` → `CHECK (status IN ('pending','trial','active','suspended','cancelled'))`

**Índices:**
- `idx_churches_slug` → `(slug)` — busca por slug em autenticação
- `idx_churches_status` → `(status)` — para operações de manutenção interna

**Observações:**
- `slug` é gerado no onboarding a partir do nome (ex: `"Igreja da Graça"` → `"igreja-da-graca"`). Precisa de lógica de deduplicação (sufixo numérico se já existe).
- `status` controla o acesso ao sistema. A transição de status é gerenciada pelo módulo de billing via webhooks Stripe.

---

### `users`

Usuários do sistema. Pertencem a exatamente uma igreja.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `name` | `TEXT` | NOT NULL | — | Nome completo |
| `email` | `TEXT` | NOT NULL | — | Email — único globalmente |
| `password_hash` | `TEXT` | NOT NULL | — | Hash Argon2id |
| `phone` | `TEXT` | NULL | — | Telefone pessoal |
| `avatar_url` | `TEXT` | NULL | — | URL da foto no MinIO |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Controle de acesso |
| `email_verified_at` | `TIMESTAMPTZ` | NULL | — | NULL = email não confirmado |
| `last_login_at` | `TIMESTAMPTZ` | NULL | — | Último login bem-sucedido |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `uq_users_email` → `UNIQUE (email)` — email único globalmente
- `fk_users_church` → `FOREIGN KEY (church_id) REFERENCES churches(id)`

**Índices:**
- `idx_users_church_id` → `(church_id)` — listagem de usuários por tenant
- `idx_users_email` → `(email)` — lookup no login
- `idx_users_church_active` → `(church_id, is_active)` — filtragem de usuários ativos

**Observações críticas:**
- `password_hash` nunca deve aparecer em logs, respostas de API ou registros de auditoria
- `email` único globalmente implica que uma pessoa gerenciando duas igrejas distintas precisará de dois emails diferentes — limitação conhecida da V1
- `deleted_at` não é usado ativamente no V1 (usuários são desativados via `is_active`). Reservado para compliance de LGPD: anonimização de dados pessoais de usuários que solicitarem exclusão.

---

### `roles`

Roles do sistema. Tabela global — sem `church_id`.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `TEXT` | NOT NULL | — | `SUPER_ADMIN` \| `CHURCH_ADMIN` \| `TREASURER` \| `SECRETARY` \| `DEPARTMENT_LEADER` \| `VIEWER` |
| `description` | `TEXT` | NULL | — | Descrição legível |
| `is_system` | `BOOLEAN` | NOT NULL | `TRUE` | Roles do sistema não podem ser deletadas |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Constraints:**
- `uq_roles_name` → `UNIQUE (name)`

**Observações:**
- Populada via seed no deploy inicial — estas roles são imutáveis via aplicação
- Estrutura suporta roles customizadas por tenant em V2 (adicionar `church_id nullable`)

---

### `permissions`

Permissões granulares por módulo e ação. Tabela global.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `module` | `TEXT` | NOT NULL | — | `FINANCE` \| `ASSETS` \| `EVENTS` \| `DEPARTMENTS` \| `USERS` \| `AUDIT` \| `BILLING` \| `SETTINGS` |
| `action` | `TEXT` | NOT NULL | — | `CREATE` \| `READ` \| `UPDATE` \| `DELETE` \| `EXPORT` |
| `description` | `TEXT` | NULL | — | Descrição legível |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Constraints:**
- `uq_permissions_module_action` → `UNIQUE (module, action)`

**Observações:**
- Populada via seed. Combinação `module + action` define uma permissão atômica.

---

### `user_roles`

Associação entre usuários e roles. Escopo por tenant implícito no usuário.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `role_id` | `UUID` | NOT NULL | — | FK → `roles.id` |
| `assigned_by_user_id` | `UUID` | NULL | — | FK → `users.id` — quem atribuiu |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Constraints:**
- `uq_user_roles_user_role` → `UNIQUE (user_id, role_id)`
- `fk_user_roles_user` → `FOREIGN KEY (user_id) REFERENCES users(id)`
- `fk_user_roles_role` → `FOREIGN KEY (role_id) REFERENCES roles(id)`

**Índices:**
- `idx_user_roles_user_id` → `(user_id)` — carregamento de roles do usuário

---

### `role_permissions`

Associação entre roles e permissões.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `role_id` | `UUID` | NOT NULL | — | FK → `roles.id` |
| `permission_id` | `UUID` | NOT NULL | — | FK → `permissions.id` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Constraints:**
- `uq_role_permissions` → `UNIQUE (role_id, permission_id)`

---

### `departments`

Departamentos e ministérios de uma igreja.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `parent_id` | `UUID` | NULL | — | FK → `departments.id` (hierarquia, máx 2 níveis) |
| `name` | `TEXT` | NOT NULL | — | Nome do departamento |
| `description` | `TEXT` | NULL | — | Descrição |
| `color` | `CHAR(7)` | NULL | — | Cor hexadecimal (`#f59e0b`) |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `fk_departments_church` → `FOREIGN KEY (church_id) REFERENCES churches(id)`
- `fk_departments_parent` → `FOREIGN KEY (parent_id) REFERENCES departments(id)`

**Índices:**
- `idx_departments_church_id` → `(church_id)` — listagem por tenant
- `idx_departments_parent_id` → `(parent_id)` — navegação da hierarquia

**Observações:**
- A restrição de máximo 2 níveis é verificada na camada de aplicação (service), não via constraint de banco — seria uma constraint recursiva complexa
- `parent_id` aponta para um departamento do mesmo `church_id` — verificado no service

---

### `department_leaders`

Associação muitos-para-muitos entre departamentos e líderes (usuários). Inclui histórico temporal.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `department_id` | `UUID` | NOT NULL | — | FK → `departments.id` |
| `user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `started_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Início da liderança |
| `ended_at` | `TIMESTAMPTZ` | NULL | — | Fim da liderança. NULL = líder atual |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Constraints:**
- `fk_dept_leaders_dept` → `FOREIGN KEY (department_id) REFERENCES departments(id)`
- `fk_dept_leaders_user` → `FOREIGN KEY (user_id) REFERENCES users(id)`

**Índices:**
- `idx_dept_leaders_dept_current` → `(department_id, ended_at)` WHERE `ended_at IS NULL` — líderes atuais de um departamento
- `idx_dept_leaders_user` → `(user_id)` — departamentos de um usuário

**Observações:**
- Para encontrar líderes **atuais** de um departamento: `WHERE department_id = $id AND ended_at IS NULL`
- Para encerrar liderança: `UPDATE SET ended_at = NOW() WHERE department_id = $id AND user_id = $userId AND ended_at IS NULL`
- Todos os líderes de um departamento têm permissões iguais — não há coluna de hierarquia de liderança

---

### `financial_categories`

Categorias de receita e despesa. Customizáveis por tenant, com hierarquia de 2 níveis.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `parent_id` | `UUID` | NULL | — | FK → `financial_categories.id` |
| `name` | `TEXT` | NOT NULL | — | Nome da categoria |
| `type` | `TEXT` | NOT NULL | — | `INCOME` \| `EXPENSE` |
| `color` | `CHAR(7)` | NULL | — | Cor hexadecimal |
| `icon` | `TEXT` | NULL | — | Identificador do ícone |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | |
| `is_system` | `BOOLEAN` | NOT NULL | `FALSE` | TRUE = criada no onboarding, não deletável |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `uq_categories_church_name_type` → `UNIQUE (church_id, name, type)` — sem categorias duplicadas por tenant
- `chk_categories_type` → `CHECK (type IN ('INCOME', 'EXPENSE'))`
- `fk_categories_church` → `FOREIGN KEY (church_id) REFERENCES churches(id)`

**Índices:**
- `idx_categories_church_type` → `(church_id, type)` — listagem filtrada por tipo

---

### `bank_accounts`

Contas bancárias do tenant. **Esta tabela não estava na lista inicial mas é necessária** — `financial_transactions` referencia contas bancárias, que são entidades próprias com saldo calculado.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `name` | `TEXT` | NOT NULL | — | Ex: "Conta Corrente BB", "Caixa Físico" |
| `bank_name` | `TEXT` | NULL | — | Nome do banco |
| `account_type` | `TEXT` | NOT NULL | — | `CHECKING` \| `SAVINGS` \| `CASH` |
| `initial_balance` | `DECIMAL(12,2)` | NOT NULL | `0.00` | Saldo inicial ao cadastrar |
| `initial_balance_date` | `DATE` | NOT NULL | — | Data do saldo inicial |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `chk_bank_account_type` → `CHECK (account_type IN ('CHECKING','SAVINGS','CASH'))`
- `fk_bank_accounts_church` → `FOREIGN KEY (church_id) REFERENCES churches(id)`

**Índices:**
- `idx_bank_accounts_church_id` → `(church_id)` — listagem por tenant

**Observações:**
- Saldo atual NÃO é armazenado como coluna. É calculado: `initial_balance + SUM(INCOME transactions) - SUM(EXPENSE transactions)` onde `transaction_date >= initial_balance_date`
- Calcular saldo na query evita inconsistências por atualização concorrente
- Para performance em tenants com muitas transações: considerar coluna de saldo com atualização via trigger em V2

---

### `financial_transactions`

Coração do módulo financeiro. Registra receitas, despesas e transferências.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id`. **Imutável após criação.** |
| `type` | `TEXT` | NOT NULL | — | `INCOME` \| `EXPENSE` \| `TRANSFER` |
| `status` | `TEXT` | NOT NULL | `'CONFIRMED'` | `CONFIRMED` \| `PENDING` \| `CANCELLED` |
| `description` | `TEXT` | NOT NULL | — | Descrição do lançamento |
| `amount` | `DECIMAL(12,2)` | NOT NULL | — | Valor. Sempre positivo. O tipo define se é entrada ou saída. |
| `competence_date` | `DATE` | NOT NULL | — | Data de competência (mês de referência) |
| `transaction_date` | `DATE` | NOT NULL | — | Data de realização (pagamento/recebimento) |
| `category_id` | `UUID` | NOT NULL | — | FK → `financial_categories.id` |
| `bank_account_id` | `UUID` | NOT NULL | — | FK → `bank_accounts.id` (conta de origem) |
| `destination_account_id` | `UUID` | NULL | — | FK → `bank_accounts.id`. Apenas para `TRANSFER`. |
| `department_id` | `UUID` | NULL | — | FK → `departments.id`. Associação opcional. |
| `event_id` | `UUID` | NULL | — | FK → `events.id`. Associação opcional. |
| `recurrence_group_id` | `UUID` | NULL | — | UUID compartilhado entre lançamentos de uma recorrência |
| `recurrence_type` | `TEXT` | NULL | — | `DAILY` \| `WEEKLY` \| `MONTHLY` \| `ANNUAL` |
| `recurrence_index` | `INTEGER` | NULL | — | Posição na sequência (1, 2, 3...) |
| `attachment_url` | `TEXT` | NULL | — | URL do comprovante no MinIO |
| `notes` | `TEXT` | NULL | — | Observações |
| `created_by_user_id` | `UUID` | NOT NULL | — | FK → `users.id`. Preenchido pelo service. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `chk_transaction_type` → `CHECK (type IN ('INCOME','EXPENSE','TRANSFER'))`
- `chk_transaction_status` → `CHECK (status IN ('CONFIRMED','PENDING','CANCELLED'))`
- `chk_transaction_amount` → `CHECK (amount > 0)` — valores sempre positivos
- `chk_transfer_dest` → `CHECK (type != 'TRANSFER' OR destination_account_id IS NOT NULL)` — TRANSFER exige conta de destino
- `fk_transactions_church` → `FOREIGN KEY (church_id) REFERENCES churches(id)`
- `fk_transactions_category` → `FOREIGN KEY (category_id) REFERENCES financial_categories(id)`
- `fk_transactions_account` → `FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)`

**Índices:**
- `idx_transactions_church_date` → `(church_id, competence_date DESC)` — queries de relatório por período
- `idx_transactions_church_account` → `(church_id, bank_account_id)` — extrato por conta
- `idx_transactions_church_category` → `(church_id, category_id)` — agrupamento por categoria
- `idx_transactions_church_dept` → `(church_id, department_id)` WHERE `department_id IS NOT NULL`
- `idx_transactions_church_event` → `(church_id, event_id)` WHERE `event_id IS NOT NULL`
- `idx_transactions_recurrence` → `(recurrence_group_id)` WHERE `recurrence_group_id IS NOT NULL`

**Observações críticas:**
- `church_id` é NOT NULL e deve ser imutável após criação — verificado via lógica no service (UPDATE nunca altera `church_id`)
- `amount` sempre positivo; o `type` determina o sentido do fluxo
- Para DRE: agrupa por `competence_date` (mês), não `transaction_date`
- Para fluxo de caixa: agrupa por `transaction_date`
- `recurrence_group_id` permite identificar e gerenciar todos os lançamentos de uma série recorrente

---

### `assets`

Bens patrimoniais da igreja.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `code` | `TEXT` | NOT NULL | — | Código interno (auto-gerado ou manual) |
| `name` | `TEXT` | NOT NULL | — | Nome do bem |
| `description` | `TEXT` | NULL | — | Descrição detalhada |
| `category` | `TEXT` | NOT NULL | — | Categoria do bem (ver observações) |
| `brand` | `TEXT` | NULL | — | Marca |
| `model` | `TEXT` | NULL | — | Modelo |
| `serial_number` | `TEXT` | NULL | — | Número de série |
| `acquisition_date` | `DATE` | NOT NULL | — | Data de aquisição |
| `acquisition_value` | `DECIMAL(12,2)` | NOT NULL | — | Valor de aquisição |
| `current_location` | `TEXT` | NULL | — | Localização atual |
| `condition` | `TEXT` | NOT NULL | `'GOOD'` | `EXCELLENT` \| `GOOD` \| `REGULAR` \| `POOR` |
| `status` | `TEXT` | NOT NULL | `'ACTIVE'` | `ACTIVE` \| `MAINTENANCE` \| `TRANSFERRED` \| `DONATED` \| `DISCARDED` |
| `notes` | `TEXT` | NULL | — | Observações |
| `next_maintenance_at` | `DATE` | NULL | — | Data prevista da próxima manutenção |
| `created_by_user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `uq_assets_church_code` → `UNIQUE (church_id, code)`
- `chk_asset_condition` → `CHECK (condition IN ('EXCELLENT','GOOD','REGULAR','POOR'))`
- `chk_asset_status` → `CHECK (status IN ('ACTIVE','MAINTENANCE','TRANSFERRED','DONATED','DISCARDED'))`

**Índices:**
- `idx_assets_church_status` → `(church_id, status)` — inventário ativo
- `idx_assets_church_maintenance` → `(church_id, next_maintenance_at)` WHERE `next_maintenance_at IS NOT NULL` — alertas de manutenção

**Observações:**
- `category` é `TEXT` com valores predefinidos validados no service (não um enum de banco para permitir evolução). Valores: `REAL_ESTATE`, `VEHICLE`, `AUDIO_VIDEO`, `FURNITURE`, `MUSICAL_INSTRUMENT`, `IT_EQUIPMENT`, `OTHER`
- `next_maintenance_at` é atualizado quando uma manutenção é agendada e zerado quando realizada

---

### `asset_movements`

Histórico imutável de movimentações de bens patrimoniais.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `asset_id` | `UUID` | NOT NULL | — | FK → `assets.id` |
| `type` | `TEXT` | NOT NULL | — | `LOCATION_CHANGE` \| `MAINTENANCE_DONE` \| `MAINTENANCE_SCHEDULED` \| `DISPOSAL` \| `DONATION` \| `CONDITION_CHANGE` |
| `description` | `TEXT` | NOT NULL | — | Descrição da movimentação |
| `from_location` | `TEXT` | NULL | — | Localização anterior (para LOCATION_CHANGE) |
| `to_location` | `TEXT` | NULL | — | Nova localização |
| `cost` | `DECIMAL(12,2)` | NULL | — | Custo (para MAINTENANCE_DONE) |
| `performed_at` | `DATE` | NOT NULL | — | Data da ocorrência |
| `registered_by_user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Observações:**
- Tabela **imutável** — sem UPDATE ou DELETE
- Cada tipo de movimento tem campos relevantes diferentes — `from_location`/`to_location` apenas fazem sentido para `LOCATION_CHANGE`

**Índices:**
- `idx_asset_movements_asset` → `(asset_id, performed_at DESC)` — histórico de um bem

---

### `events`

Eventos da igreja. **Esta tabela não estava na lista inicial mas é necessária** — módulo de eventos está no escopo da V1.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `department_id` | `UUID` | NULL | — | FK → `departments.id`. Departamento organizador. |
| `name` | `TEXT` | NOT NULL | — | Nome do evento |
| `description` | `TEXT` | NULL | — | Descrição |
| `type` | `TEXT` | NOT NULL | — | `WORSHIP` \| `CONFERENCE` \| `MEETING` \| `TRAINING` \| `OTHER` |
| `status` | `TEXT` | NOT NULL | `'DRAFT'` | `DRAFT` \| `PUBLISHED` \| `COMPLETED` \| `CANCELLED` |
| `start_datetime` | `TIMESTAMPTZ` | NOT NULL | — | Data e hora de início |
| `end_datetime` | `TIMESTAMPTZ` | NOT NULL | — | Data e hora de término |
| `location` | `TEXT` | NULL | — | Local do evento |
| `max_capacity` | `INTEGER` | NULL | — | Capacidade máxima (NULL = sem limite) |
| `cover_image_url` | `TEXT` | NULL | — | URL da imagem de capa no MinIO |
| `notes` | `TEXT` | NULL | — | Observações internas |
| `responsible_user_id` | `UUID` | NULL | — | FK → `users.id`. Responsável pelo evento. |
| `created_by_user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Constraints:**
- `chk_event_dates` → `CHECK (end_datetime > start_datetime)`
- `chk_event_type` → `CHECK (type IN ('WORSHIP','CONFERENCE','MEETING','TRAINING','OTHER'))`
- `chk_event_status` → `CHECK (status IN ('DRAFT','PUBLISHED','COMPLETED','CANCELLED'))`
- `chk_max_capacity` → `CHECK (max_capacity IS NULL OR max_capacity > 0)`

**Índices:**
- `idx_events_church_start` → `(church_id, start_datetime DESC)` — calendário por tenant
- `idx_events_church_status` → `(church_id, status)` — filtro por status
- `idx_events_location_dates` → `(church_id, location, start_datetime, end_datetime)` WHERE `location IS NOT NULL` — detecção de conflito de agenda

---

### `event_attendees`

Controle operacional de presença em eventos.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `event_id` | `UUID` | NOT NULL | — | FK → `events.id` |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` (denormalizado para índice eficiente) |
| `name` | `TEXT` | NOT NULL | — | Nome do participante |
| `user_id` | `UUID` | NULL | — | FK → `users.id`. NULL se participante externo. |
| `checked_in_at` | `TIMESTAMPTZ` | NULL | — | NULL = não compareceu ainda |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Índices:**
- `idx_attendees_event` → `(event_id)` — lista de participantes de um evento
- `idx_attendees_event_checkin` → `(event_id, checked_in_at)` WHERE `checked_in_at IS NOT NULL` — contagem de presentes

---

### `department_members`

Integrantes dos departamentos. **Esta tabela não estava na lista inicial mas é necessária** — líderes precisam registrar membros básicos de sua equipe (nome, telefone, email). Não são usuários do sistema necessariamente.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `department_id` | `UUID` | NOT NULL | — | FK → `departments.id` |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `name` | `TEXT` | NOT NULL | — | Nome do integrante |
| `phone` | `TEXT` | NULL | — | Telefone |
| `email` | `TEXT` | NULL | — | Email |
| `user_id` | `UUID` | NULL | — | FK → `users.id`. NULL se não tem conta no sistema. |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | |
| `created_by_user_id` | `UUID` | NOT NULL | — | FK → `users.id` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `deleted_at` | `TIMESTAMPTZ` | NULL | — | Soft delete |

**Índices:**
- `idx_dept_members_dept` → `(department_id, is_active)` — membros ativos de um departamento
- `idx_dept_members_church` → `(church_id)` — contagem total por tenant

**Observações:**
- Esta é a implementação mínima para satisfazer o requisito: líderes registram nome, telefone e email dos integrantes
- Não tem nenhuma relação com gestão pastoral — é puramente informação de contato de equipe
- Se o membro também é usuário do sistema, `user_id` é preenchido para cross-reference
- O sistema calcula a quantidade de integrantes via `COUNT(*) WHERE department_id = $id AND is_active = TRUE AND deleted_at IS NULL`

---

### `plans`

Planos de assinatura disponíveis. Tabela global — sem `church_id`.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `name` | `TEXT` | NOT NULL | — | Nome do plano |
| `description` | `TEXT` | NULL | — | Descrição |
| `max_users` | `INTEGER` | NULL | — | Limite de usuários. NULL = ilimitado. |
| `max_storage_gb` | `INTEGER` | NULL | — | Limite de storage em GB. NULL = ilimitado. |
| `features` | `JSONB` | NOT NULL | `'{}'` | Features habilitadas para o plano |
| `stripe_product_id` | `TEXT` | NULL | — | ID do produto no Stripe |
| `stripe_price_monthly_id` | `TEXT` | NULL | — | ID do preço mensal no Stripe |
| `stripe_price_annual_id` | `TEXT` | NULL | — | ID do preço anual no Stripe |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Plano disponível para novos cadastros |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Observações:**
- Preços não são armazenados aqui — são gerenciados no Stripe. A fonte da verdade de preço é sempre o Stripe.
- `features` JSONB armazena flags de features: `{ "audit": true, "export_pdf": true, "advanced_reports": false }`

---

### `subscriptions`

Assinatura ativa de um tenant.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `plan_id` | `UUID` | NOT NULL | — | FK → `plans.id` |
| `stripe_subscription_id` | `TEXT` | NULL | — | ID da subscription no Stripe |
| `stripe_customer_id` | `TEXT` | NOT NULL | — | ID do customer no Stripe |
| `status` | `TEXT` | NOT NULL | — | `TRIAL` \| `ACTIVE` \| `PAST_DUE` \| `SUSPENDED` \| `CANCELLED` |
| `billing_cycle` | `TEXT` | NOT NULL | `'MONTHLY'` | `MONTHLY` \| `ANNUAL` |
| `trial_ends_at` | `TIMESTAMPTZ` | NULL | — | Fim do trial |
| `current_period_start` | `TIMESTAMPTZ` | NULL | — | Início do período atual |
| `current_period_end` | `TIMESTAMPTZ` | NULL | — | Fim do período atual |
| `cancelled_at` | `TIMESTAMPTZ` | NULL | — | Data de cancelamento |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Constraints:**
- `uq_subscriptions_church` → `UNIQUE (church_id)` — uma assinatura ativa por church
- `chk_subscription_status` → `CHECK (status IN ('TRIAL','ACTIVE','PAST_DUE','SUSPENDED','CANCELLED'))`
- `uq_subscriptions_stripe` → `UNIQUE (stripe_subscription_id)` WHERE `stripe_subscription_id IS NOT NULL`

**Índices:**
- `idx_subscriptions_church_id` → `(church_id)` — lookup por tenant
- `idx_subscriptions_stripe_id` → `(stripe_subscription_id)` — processamento de webhooks

---

### `invoices`

Faturas geradas pelo Stripe.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id` |
| `subscription_id` | `UUID` | NOT NULL | — | FK → `subscriptions.id` |
| `stripe_invoice_id` | `TEXT` | NOT NULL | — | ID da invoice no Stripe |
| `amount` | `DECIMAL(10,2)` | NOT NULL | — | Valor em reais |
| `currency` | `CHAR(3)` | NOT NULL | `'BRL'` | |
| `status` | `TEXT` | NOT NULL | — | `PAID` \| `OPEN` \| `VOID` \| `UNCOLLECTIBLE` |
| `invoice_date` | `DATE` | NOT NULL | — | Data de emissão |
| `due_date` | `DATE` | NULL | — | Data de vencimento |
| `paid_at` | `TIMESTAMPTZ` | NULL | — | Data de pagamento |
| `invoice_url` | `TEXT` | NULL | — | URL da invoice hospedada no Stripe |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | |

**Índices:**
- `idx_invoices_church_id` → `(church_id, invoice_date DESC)` — histórico por tenant
- `idx_invoices_stripe_id` → `(stripe_invoice_id)` — processamento de webhooks

---

### `audit_logs`

Histórico imutável de ações. Cresce indefinidamente — requer estratégia de particionamento.

| Coluna | Tipo | Nullable | Default | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `gen_random_uuid()` | PK |
| `church_id` | `UUID` | NOT NULL | — | FK → `churches.id`. Não nullable — toda ação tem contexto de tenant. |
| `user_id` | `UUID` | NULL | — | FK → `users.id`. NULL para ações de sistema. |
| `user_name` | `TEXT` | NULL | — | Snapshot do nome no momento da ação |
| `user_email` | `TEXT` | NULL | — | Snapshot do email no momento da ação |
| `action` | `TEXT` | NOT NULL | — | Tipo de ação (ver lista em 02-architecture.md) |
| `module` | `TEXT` | NOT NULL | — | Módulo de origem |
| `entity` | `TEXT` | NOT NULL | — | Nome da entidade afetada (ex: `financial_transaction`) |
| `entity_id` | `UUID` | NULL | — | ID da entidade afetada |
| `before` | `JSONB` | NULL | — | Estado anterior. NULL para CREATE. |
| `after` | `JSONB` | NULL | — | Estado posterior. NULL para DELETE. |
| `ip_address` | `INET` | NULL | — | IP da requisição |
| `user_agent` | `TEXT` | NULL | — | User-Agent do cliente |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Imutável |

**Regra crítica:** Nenhuma operação de UPDATE ou DELETE é permitida nesta tabela. Garantida por:
1. Ausência de endpoints de mutação na API
2. Permissões de banco: a role da aplicação tem GRANT INSERT, SELECT — sem UPDATE, DELETE

**Índices:**
- `idx_audit_church_created` → `(church_id, created_at DESC)` — consulta de auditoria por tenant
- `idx_audit_church_module` → `(church_id, module, created_at DESC)` — filtro por módulo
- `idx_audit_church_user` → `(church_id, user_id, created_at DESC)` — filtro por usuário
- `idx_audit_entity` → `(entity, entity_id)` — histórico de uma entidade específica

---

## 6. Tabelas Adicionais Necessárias

As tabelas abaixo não estavam na lista inicial mas são **necessárias para a V1** e derivam diretamente dos requisitos funcionais aprovados.

### `refresh_tokens`

| Coluna | Tipo | Nullable | Descrição |
|---|---|---|---|
| `id` | `UUID` | NOT NULL | PK |
| `user_id` | `UUID` | NOT NULL | FK → `users.id` |
| `token_hash` | `TEXT` | NOT NULL | Hash SHA-256 do token opaque |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | TTL de 7 dias |
| `revoked_at` | `TIMESTAMPTZ` | NULL | NULL = token válido |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**Índices:** `idx_refresh_tokens_hash` → `(token_hash)` — lookup no refresh

### `user_invites`

| Coluna | Tipo | Nullable | Descrição |
|---|---|---|---|
| `id` | `UUID` | NOT NULL | PK |
| `church_id` | `UUID` | NOT NULL | FK → `churches.id` |
| `email` | `TEXT` | NOT NULL | Email do convidado |
| `role_id` | `UUID` | NOT NULL | FK → `roles.id` — role a ser atribuída |
| `token_hash` | `TEXT` | NOT NULL | Hash do token do link de convite |
| `invited_by_user_id` | `UUID` | NOT NULL | FK → `users.id` |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | TTL de 7 dias |
| `accepted_at` | `TIMESTAMPTZ` | NULL | NULL = convite pendente |
| `revoked_at` | `TIMESTAMPTZ` | NULL | NULL = convite ativo |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**Índices:** `idx_invites_church_email` → `(church_id, email)`, `idx_invites_token` → `(token_hash)`

### `notifications`

| Coluna | Tipo | Nullable | Descrição |
|---|---|---|---|
| `id` | `UUID` | NOT NULL | PK |
| `church_id` | `UUID` | NOT NULL | FK → `churches.id` |
| `user_id` | `UUID` | NOT NULL | FK → `users.id` — destinatário |
| `type` | `TEXT` | NOT NULL | Tipo da notificação |
| `title` | `TEXT` | NOT NULL | Título exibido |
| `body` | `TEXT` | NOT NULL | Corpo da notificação |
| `data` | `JSONB` | NULL | Metadata adicional (ex: link, entity_id) |
| `read_at` | `TIMESTAMPTZ` | NULL | NULL = não lida |
| `archived_at` | `TIMESTAMPTZ` | NULL | Arquivada após 90 dias |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

**Índices:** `idx_notifications_user_unread` → `(user_id, read_at)` WHERE `read_at IS NULL`

### `password_reset_tokens`

| Coluna | Tipo | Nullable | Descrição |
|---|---|---|---|
| `id` | `UUID` | NOT NULL | PK |
| `user_id` | `UUID` | NOT NULL | FK → `users.id` |
| `token_hash` | `TEXT` | NOT NULL | Hash do token enviado por email |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | TTL de 1 hora |
| `used_at` | `TIMESTAMPTZ` | NULL | NULL = token ainda válido |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

---

## 7. Auditoria no Banco

### 7.1 Particionamento da Tabela audit_logs

A tabela `audit_logs` cresce monotonicamente — nunca há DELETE. Para um tenant com 50 usuários ativos realizando 100 ações/dia, em 1 ano há ~1.825.000 registros apenas nesse tenant.

**Recomendação para V1:** Criar `audit_logs` com **particionamento por range em `created_at`** (partição por trimestre). Isso permite:
- Arquivamento/exclusão de partições antigas sem lock de tabela
- Melhor performance em queries com filtro de data recente
- Backup incremental por partição

```sql
-- Estrutura sugerida (não implementar como SQL direto — usar migration Prisma)
CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);
CREATE TABLE audit_logs_2026_q2 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
```

**Para V1 com Prisma:** Particionamento nativo via SQL em migration. Prisma não tem suporte declarativo a particionamento no schema — será feito em migration raw.

### 7.2 Imutabilidade Garantida por Permissões de Banco

```sql
-- Role de aplicação para Church Flow
CREATE ROLE churchflow_app;
GRANT SELECT, INSERT ON audit_logs TO churchflow_app;
-- Sem UPDATE, sem DELETE
```

Mesmo que um bug de código tente fazer `prisma.auditLog.delete()`, o banco recusará com permissão negada.

---

## 8. Índices e Performance

### 8.1 Estratégia Geral de Índices

| Padrão | Regra |
|---|---|
| **Todo FK tem índice** | Foreign keys sem índice causam table scans em JOINs |
| **Índices compostos começam com `church_id`** | Toda query filtra por tenant primeiro |
| **Índices parciais para valores não-nulos frequentemente filtrados** | `WHERE deleted_at IS NULL`, `WHERE ended_at IS NULL` |
| **Índices DESC para queries de listagem ordenada** | Listas pagináveis sempre ordenadas por data DESC |

### 8.2 Queries Críticas e seus Índices

**Dashboard financeiro (saldo atual):**
```sql
SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END)
FROM financial_transactions
WHERE church_id = $1
  AND bank_account_id = $2
  AND status = 'CONFIRMED'
  AND deleted_at IS NULL
-- Atendido por: idx_transactions_church_account
```

**DRE mensal:**
```sql
SELECT category_id, type, SUM(amount)
FROM financial_transactions
WHERE church_id = $1
  AND competence_date BETWEEN $2 AND $3
  AND status = 'CONFIRMED'
  AND deleted_at IS NULL
GROUP BY category_id, type
-- Atendido por: idx_transactions_church_date
```

**Líderes atuais de departamento:**
```sql
SELECT user_id FROM department_leaders
WHERE department_id = $1 AND ended_at IS NULL
-- Atendido por: idx_dept_leaders_dept_current (índice parcial)
```

**Manutenções vencidas:**
```sql
SELECT * FROM assets
WHERE church_id = $1
  AND next_maintenance_at < NOW()
  AND status = 'ACTIVE'
  AND deleted_at IS NULL
-- Atendido por: idx_assets_church_maintenance
```

### 8.3 Queries de Relatório (Alto Volume)

Relatórios financeiros complexos (DRE anual, fluxo de caixa histórico) podem envolver milhares de registros por tenant. Para esses casos:

- **V1:** Prisma `$queryRaw` com query SQL otimizada
- **V2:** Views materializadas atualizadas por trigger ou job noturno para relatórios pré-calculados
- **Alternativa de curto prazo:** Read replica do PostgreSQL para queries analíticas, sem impacto na instância principal

---

## 9. Segurança no Banco

### 9.1 Usuário de Banco por Serviço

```
Produção:
  churchflow_app    → Role da aplicação (CRUD nas tabelas de negócio, sem DELETE em audit_logs)
  churchflow_backup → Role de backup (SELECT only em todas as tabelas)
  churchflow_admin  → Role de administração (apenas para operações manuais via SSH — nunca usado pela app)
```

### 9.2 Dados Sensíveis

| Campo | Medida |
|---|---|
| `users.password_hash` | Hash Argon2id — nunca retornado em responses de API |
| `refresh_tokens.token_hash` | Hash SHA-256 do token opaque — raw token nunca armazenado |
| `user_invites.token_hash` | Hash SHA-256 — raw token apenas no email |
| `password_reset_tokens.token_hash` | Hash SHA-256 — raw token apenas no email |

### 9.3 SSL/TLS na Conexão

- Conexão entre API e PostgreSQL com SSL obrigatório em produção
- Certificado do banco verificado pela aplicação (`sslmode=verify-ca`)
- String de conexão armazenada como variável de ambiente — nunca em código ou log

### 9.4 Backup e Criptografia

- Backups criptografados em repouso (AES-256) antes de enviar ao storage
- Chave de criptografia de backup armazenada separadamente dos arquivos de backup

---

## 10. Convenções

### 10.1 Nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabelas | `snake_case` plural | `financial_transactions` |
| Colunas | `snake_case` | `church_id`, `created_at` |
| Índices | `idx_{tabela}_{coluna(s)}` | `idx_transactions_church_date` |
| Unique constraints | `uq_{tabela}_{coluna(s)}` | `uq_users_email` |
| Check constraints | `chk_{tabela}_{nome}` | `chk_transaction_amount` |
| FK constraints | `fk_{tabela}_{coluna}` | `fk_transactions_church` |
| Sequences (se usadas) | `seq_{tabela}_{coluna}` | — |

### 10.2 Migrations

- Toda mudança de schema via migration Prisma — nunca DDL manual em produção
- Nome de migration: `{timestamp}_{descricao_kebab_case}`
- Migrations são revisadas como código — impacto em dados existentes deve ser documentado
- Migrations destrutivas (DROP COLUMN, DROP TABLE) só após confirmação que dados não são necessários
- Migrations em produção sempre executadas **antes** de subir nova versão da API que depende delas

### 10.3 Enums vs TEXT com CHECK

O schema adota `TEXT` com `CHECK constraint` para valores enumerados em vez de `ENUM` nativo do PostgreSQL.

**Justificativa:**
- `ALTER TYPE` em PostgreSQL é uma operação que pode requerer lock exclusivo
- Adicionar um valor a `TEXT CHECK` é apenas uma alteração de constraint — mais simples em produção
- Prisma mapeia para enum TypeScript de qualquer forma — o type safety é garantido pela aplicação

---

## 11. Riscos e Considerações Futuras

| Risco | Quando se Materializa | Mitigação |
|---|---|---|
| **audit_logs sem particionamento** | 6–12 meses em produção com tenants ativos | Criar tabela já particionada desde o início (migration raw) |
| **Saldo financeiro calculado por query** | Tenants com 10.000+ lançamentos | Avaliar materialização de saldo em V2 via trigger ou job |
| **email único global impede mesmo admin em dois tenants** | Primeiras reclamações de clientes em rede | DEC pendente; projetar `user_church_accounts` table para V2 |
| **Índices não cobrem queries de relatório custom** | Quando relatórios mais complexos forem adicionados | Monitorar slow query log; adicionar índices conforme necessidade real |
| **JSONB em `before`/`after` sem schema** | Consultas de auditoria complexas | Definir e documentar o schema de each entity snapshot |
| **Tabela `events` sem suporte a recorrência** | Igrejas com cultos semanais recorrentes | Adicionar `recurrence_group_id` em V2 (pattern já existe em `financial_transactions`) |

---

*Próximo documento: `04-api-spec.md`*  
*Dependência: Aprovação deste documento.*
