# Church Flow — Architecture Document

**Versão:** 1.0  
**Status:** Aprovado  
**Data:** 2026-06-16  
**Responsável:** Software Architect / Staff Engineer  
**Dependências:** `00-vision.md` (Aprovado), `01-prd.md` (Aprovado)

---

## Índice

1. [Visão Arquitetural](#1-visão-arquitetural)
2. [Arquitetura do Monorepo](#2-arquitetura-do-monorepo)
3. [Arquitetura Frontend](#3-arquitetura-frontend)
4. [Arquitetura Backend](#4-arquitetura-backend)
5. [Multi-Tenancy](#5-multi-tenancy)
6. [Sistema de Permissões (RBAC)](#6-sistema-de-permissões-rbac)
7. [Fluxo de Autenticação](#7-fluxo-de-autenticação)
8. [Auditoria](#8-auditoria)
9. [Estratégia de Deploy](#9-estratégia-de-deploy)
10. [Convenções](#10-convenções)
11. [Decisões Arquiteturais Aprovadas](#11-decisões-arquiteturais-aprovadas)

---

## 1. Visão Arquitetural

### 1.1 Objetivos da Arquitetura

A arquitetura do Church Flow foi concebida para suportar um produto SaaS comercial em produção desde o primeiro deploy. As decisões aqui descritas não são teóricas — cada escolha carrega justificativa técnica explícita, análise de trade-offs e consideração dos riscos futuros.

**Objetivos primários:**

| Objetivo | Descrição |
|---|---|
| **Security First** | Isolamento de dados entre tenants, autenticação robusta, sem atalhos de segurança em nenhuma camada |
| **Manutenibilidade** | Código previsível, colocado logicamente, sem mágica implícita — qualquer desenvolvedor deve conseguir navegar o sistema em menos de 1 hora |
| **Escalabilidade horizontal** | Nenhuma dependência de estado local em processo — API stateless, pronta para múltiplas instâncias |
| **Observabilidade desde o dia 1** | Logs estruturados, métricas expostas, rastreabilidade de ações — não como feature futura, mas como requisito de produção |
| **Evolução controlada** | Decisões de V1 não devem travar V2 — multi-tenancy, schema e RBAC devem suportar extensões sem reescrita |

### 1.2 Princípios Técnicos

Os seguintes princípios orientam **toda** decisão de implementação no Church Flow. São não negociáveis.

**1. Separação explícita de responsabilidades**
Cada camada da aplicação tem responsabilidade única e delimitada. Controller não contém lógica de negócio. Service não conhece detalhes de transporte HTTP. Repository não toma decisões de domínio. Violações devem ser questionadas em code review.

**2. Tenant-first em toda query**
Toda operação que toca o banco de dados deve ser precedida de resolução do contexto de tenant. Não existe query legítima sem `church_id` nas tabelas multi-tenant. A arquitetura de repositório torna isso impossível de esquecer por design.

**3. Fail fast e explícito**
Erros devem ser lançados cedo, com mensagens claras e tipos explícitos. Não há silenciamento de exceções. Não há `catch` sem handling apropriado.

**4. Imutabilidade de dados críticos**
Logs de auditoria, registros financeiros e histórico de movimentações de patrimônio não são deletáveis. Soft delete é padrão para entidades com histórico relevante.

**5. Validação nas bordas do sistema**
Input é validado na borda (DTO com class-validator no backend, Zod no frontend). Dados que chegam ao service são considerados válidos. Não há validação duplicada nas camadas internas.

**6. Zero trust entre camadas**
Guards de autenticação e autorização são aplicados em toda rota protegida sem exceção. O fato de uma rota "parecer segura" não dispensa a aplicação dos guards.

### 1.3 Escalabilidade

**Modelo atual (V1):** Single-instance stateless API com PostgreSQL gerenciado. Adequado para os primeiros clientes e carga operacional esperada.

**Caminho de escala (sem reescrita):**
- API escala horizontalmente via múltiplos contêineres — sem estado de sessão em memória, tokens JWT são stateless
- PostgreSQL escala via réplica de leitura para queries analíticas (relatórios financeiros)
- Upload de arquivos em MinIO, não no filesystem da API — permite múltiplas instâncias sem conflito
- Jobs assíncronos (notificações, relatórios pesados) isolados via BullMQ em fila Redis — adicionável sem tocar na API core

**O que NÃO escala sem mudança:** Schema por tenant (decidido contra) e estado em memória (proibido por design). O modelo row-level com `church_id` suporta milhares de tenants sem alteração de infraestrutura.

### 1.4 Manutenibilidade

A estrutura de pastas, nomenclaturas e camadas foram definidas para que:
- Qualquer desenvolvedor novo localize um bug ou feature em menos de 5 minutos
- Testes existam onde importam (services e lógica de negócio), não onde não agregam (controllers triviais)
- Mudanças em um módulo não causem efeitos colaterais inesperados em outro

### 1.5 Segurança

A segurança é tratada como **propriedade de sistema**, não como feature. Os mecanismos de segurança são:

- Autenticação via JWT com TTL curto (15 min) + refresh token rotacionado em cookie HttpOnly
- RBAC verificado em guard e em service (defense in depth)
- Tenant isolation via `church_id` em toda query — verificado a nível de repositório
- Subscription guard em toda rota autenticada — tenant suspenso tem acesso bloqueado
- Argon2id para hashing de senhas — resistente a GPU cracking e timing attacks
- Rate limiting em rotas de autenticação — proteção contra brute force
- Headers HTTP de segurança configurados no Nginx — HSTS, CSP, X-Frame-Options
- Input validation no DTO layer — proteção contra injection e payloads malformados

### 1.6 Observabilidade

**Logs:** Estruturados em JSON com campos: `timestamp`, `level`, `service`, `tenantId`, `userId`, `traceId`, `message`, `metadata`. Nunca logam dados sensíveis (senhas, tokens, dados pessoais em texto plano).

**Métricas:** Prometheus endpoint exposto pela API (`/metrics`) coletando: latência de endpoints, contagem de requests por rota, erros por tipo, tamanho de query pool, contagem de tenants ativos.

**Rastreabilidade:** Toda request autenticada carrega `X-Trace-ID` gerado pelo Nginx e propagado pela cadeia. Correlaciona logs de API com logs de Nginx.

**Auditoria de negócio:** Separada dos logs técnicos. Toda mutação de dado de negócio gera registro em `audit_logs` — rastreável por tenant, usuário, entidade e período.

---

## 2. Arquitetura do Monorepo

### 2.1 Justificativa do Monorepo

O Church Flow utiliza **monorepo com pnpm workspaces e Turborepo** como estratégia de organização de código. A alternativa seria repositórios separados (polyrepo).

**Por que monorepo:**
- Compartilhamento de tipos TypeScript entre `api` e `web` sem versionamento manual de pacotes
- Um único pipeline de CI verifica a consistência do sistema como um todo
- Refatorações que afetam múltiplos pacotes (ex: renomear um DTO) são atômicas e verificáveis
- Consistência de tooling (ESLint, TypeScript config, formatação) aplicada centralmente

**Por que Turborepo:**
- Cache de builds incremental — tarefas que não mudaram não são reexecutadas
- Paralelização inteligente de tasks entre workspaces
- Pipeline declarativo em `turbo.json` — dependências entre tasks são explícitas

**Trade-off assumido:** Monorepos têm curva de onboarding maior e podem ter performance degradada em repositórios muito grandes. Para o porte do Church Flow, o benefício supera o custo.

### 2.2 Estrutura Completa

```
church-flow/
├── apps/
│   ├── web/              # Aplicação React (frontend)
│   └── api/              # Aplicação NestJS (backend)
│
├── packages/
│   ├── ui/               # Design system compartilhado (Shadcn + custom)
│   ├── types/            # Tipos TypeScript compartilhados (DTOs, enums, contratos)
│   ├── eslint-config/    # Configuração ESLint base compartilhada
│   └── tsconfig/         # Configurações TypeScript base compartilhadas
│
├── docs/
│   ├── 00-vision.md
│   ├── 01-prd.md
│   ├── 02-architecture.md
│   ├── 03-database.md
│   ├── 04-api-spec.md
│   └── decisions/        # Architecture Decision Records (ADRs)
│
├── infra/
│   ├── docker/           # Dockerfiles de cada serviço
│   ├── nginx/            # Configurações Nginx (dev e prod)
│   └── scripts/          # Scripts de manutenção, seed, backup
│
├── .github/
│   └── workflows/        # GitHub Actions pipelines
│
├── package.json          # Root package (scripts globais)
├── turbo.json            # Turborepo pipeline
├── pnpm-workspace.yaml   # Definição de workspaces
└── README.md
```

### 2.3 Responsabilidades por Área

#### `apps/web` — Frontend React
- Única responsável pela interface do usuário
- Consome a API REST de `apps/api`
- Importa tipos de `packages/types` (nunca define contratos próprios)
- Importa componentes base de `packages/ui`
- Não contém lógica de negócio — toda regra vive na API

#### `apps/api` — Backend NestJS
- Única responsável pela lógica de negócio e acesso a dados
- Expõe API REST consumida pelo `web`
- Integra com PostgreSQL via Prisma, MinIO, Stripe e Resend
- Exporta tipos para `packages/types` quando relevante para o contrato público

#### `packages/ui` — Design System
- Componentes React baseados em Shadcn UI customizados para o tema Church Flow
- Sem lógica de negócio, sem chamadas de API
- Totalmente estático — props in, JSX out
- Versionado independentemente para permitir evolução sem afetar o app

#### `packages/types` — Contratos Compartilhados
- Tipos TypeScript, interfaces e enums que são compartilhados entre frontend e backend
- Exemplos: `UserRole`, `SubscriptionStatus`, `TransactionType`, `AuditAction`
- Nunca importa de `apps/` — dependência unidirecional

#### `packages/eslint-config` — Qualidade de Código
- Configuração ESLint base com regras para TypeScript, React e NestJS
- Estendida por cada app/package com customizações locais
- Garante consistência de estilo sem configurar em cada projeto

#### `packages/tsconfig` — Configuração TypeScript
- Configurações base: `base.json`, `react.json`, `nestjs.json`
- Cada app estende com configurações específicas
- Garante `strict: true` em todo o codebase

#### `docs/` — Documentação Técnica
- Documentação versionada junto ao código
- `decisions/` contém ADRs (Architecture Decision Records) numerados

#### `infra/` — Infraestrutura como Código
- Dockerfiles de cada serviço
- Configurações Nginx para desenvolvimento e produção
- Scripts de manutenção operacional

### 2.4 Turborepo Pipeline

```
turbo.json define as seguintes tasks em ordem de dependência:

build → depende de: types build, ui build
  web:build → depende de: packages/types, packages/ui
  api:build → depende de: packages/types

test → paralelo entre packages
lint → paralelo entre packages
typecheck → paralelo, bloqueia build se falhar
```

---

## 3. Arquitetura Frontend

### 3.1 Princípios de Organização

O frontend adota **organização por features** (vertical slicing), não por camadas técnicas (horizontal slicing). Cada feature é um módulo coeso que contém todos os artefatos necessários para aquela parte do produto.

**Por que feature-based:**
- Localidade do código — tudo relacionado a `finance` está em `features/finance/`
- Reduz acoplamento acidental entre features distintas
- Escala melhor que layer-based à medida que o produto cresce
- Facilita code ownership por desenvolvedor ou squad

**Regra de dependência entre features:**
- Features podem importar de `shared/`, nunca diretamente de outra feature
- Comunicação entre features acontece via estado global (Zustand) ou URL params (React Router)

### 3.2 Estrutura de Pastas

```
apps/web/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── router.tsx           # Definição central de rotas (React Router v6)
│   │   ├── providers.tsx        # Composição de providers globais
│   │   ├── shell.tsx            # Layout autenticado (sidebar + header + content)
│   │   └── query-client.ts      # Configuração global do TanStack Query
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/      # LoginForm, ForgotPasswordForm, etc.
│   │   │   ├── hooks/           # useLogin, useForgotPassword
│   │   │   ├── pages/           # LoginPage, ForgotPasswordPage, ResetPasswordPage
│   │   │   ├── schemas/         # Zod schemas de validação de formulários
│   │   │   └── services/        # Funções de chamada à API de auth
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/      # Cards de resumo, gráficos
│   │   │   ├── hooks/           # useDashboardData
│   │   │   └── pages/           # DashboardPage
│   │   │
│   │   ├── finance/
│   │   │   ├── components/
│   │   │   │   ├── TransactionForm.tsx
│   │   │   │   ├── TransactionTable.tsx
│   │   │   │   ├── CategoryBadge.tsx
│   │   │   │   └── FinancialChart.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTransactions.ts
│   │   │   │   ├── useCreateTransaction.ts
│   │   │   │   └── useFinancialSummary.ts
│   │   │   ├── pages/
│   │   │   │   ├── FinanceDashboardPage.tsx
│   │   │   │   ├── TransactionsPage.tsx
│   │   │   │   └── ReportsPage.tsx
│   │   │   ├── schemas/
│   │   │   └── services/
│   │   │
│   │   ├── assets/
│   │   ├── events/
│   │   ├── departments/
│   │   ├── users/
│   │   ├── settings/
│   │   ├── billing/
│   │   └── audit/
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── PageContainer.tsx
│   │   │   ├── data-display/
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── LoadingSpinner.tsx
│   │   │   └── feedback/
│   │   │       ├── ConfirmDialog.tsx
│   │   │       └── ErrorBoundary.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-auth.ts       # Acessa auth store, helpers de permissão
│   │   │   ├── use-permissions.ts
│   │   │   └── use-debounce.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api-client.ts     # Instância Axios configurada
│   │   │   └── format.ts         # Formatadores de data, moeda, etc.
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.store.ts     # Estado de autenticação (Zustand)
│   │   │   └── ui.store.ts       # Estado de UI (sidebar, modais)
│   │   │
│   │   └── utils/
│   │       └── cn.ts             # Utility para Tailwind class merging
│   │
│   └── assets/
│       └── fonts/
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### 3.3 Estratégia de Componentes

**Três categorias de componentes:**

**1. Design System (`packages/ui`)**
Componentes puramente visuais. Sem chamadas de API, sem acesso a stores. Recebem tudo via props. Exemplos: `Button`, `Input`, `Card`, `Badge`, `Dialog`. São os blocos de construção — substituíveis e testáveis em isolamento.

**2. Feature Components (`features/*/components`)**
Componentes que orquestram lógica de negócio dentro de uma feature. Consomem hooks da própria feature, mas não importam diretamente de outras features. Exemplos: `TransactionForm`, `DepartmentCard`, `EventCalendar`.

**3. Shared Components (`shared/components`)**
Componentes de aplicação com lógica reutilizável entre features. Podem acessar stores globais. Exemplos: `Sidebar`, `DataTable`, `ConfirmDialog`.

**Regra:** Nunca criar componentes que misturem as três categorias.

### 3.4 Estratégia de Estado

O estado da aplicação é dividido em dois domínios com responsabilidades distintas:

#### Estado de Servidor → TanStack Query
Todo dado que vem da API é gerenciado pelo TanStack Query. Isso inclui listas, detalhes, métricas e relatórios. O TanStack Query cuida de:
- Cache com stale-while-revalidate
- Revalidação automática ao re-focar a janela
- Mutations com invalidação automática de cache relacionado
- Loading e error states por query
- Paginação e infinite scroll

```
Convenção de query keys:
['finance', 'transactions', { churchId, filters }]
['departments', 'list', { churchId }]
['assets', 'detail', assetId]
```

**Por que essa convenção:** Keys hierárquicas permitem invalidar granularmente. `queryClient.invalidateQueries(['finance'])` invalida tudo de finance. `invalidateQueries(['finance', 'transactions'])` invalida apenas transações.

#### Estado de UI → Zustand
Estado que não é do servidor: sidebar colapsada, modal aberto, filtros locais de tabela, tema, notificações não lidas (contagem). Zustand é leve, sem boilerplate de Redux, e com TypeScript nativo.

**O que NÃO vai no Zustand:** dados de server. Qualquer coisa que a API retorna é responsabilidade do TanStack Query.

**auth.store.ts** contém a exceção deliberada: o access token e os dados do usuário autenticado são armazenados em Zustand (memória) porque não devem ir ao localStorage por razões de segurança (XSS). O refresh token está em cookie HttpOnly — inacessível ao JavaScript.

### 3.5 Estratégia de Formulários

Todos os formulários utilizam **React Hook Form** para gerenciamento de estado de formulário e **Zod** para validação de schema. A integração é feita via `@hookform/resolvers/zod`.

**Justificativa:**
- React Hook Form: performance superior por não re-renderizar o componente a cada keystroke; register-based approach reduz boilerplate
- Zod: validação type-safe com inferência de tipos TypeScript; o mesmo schema pode ser usado no backend (via `packages/types`) garantindo consistência de validação

**Convenção:**
```
features/finance/schemas/transaction.schema.ts
  → define CreateTransactionSchema (Zod)
  → exporta CreateTransactionInput (inferido via z.infer)
  → importado no form e no DTO do backend (via packages/types)
```

### 3.6 Estratégia de Cache

O TanStack Query é configurado com:
- `staleTime: 60_000` (1 minuto) para dados de listagem
- `staleTime: 300_000` (5 minutos) para dados raramente mutados (planos, configurações)
- `staleTime: 0` para dashboard financeiro (sempre frescos)
- `gcTime: 600_000` (10 minutos) para garbage collection de cache inativo
- `retry: 1` para falhas de rede (evita flooding em erros persistentes)

**Invalidação após mutação:**
Toda mutation que altera dados invalida as query keys relacionadas:
```
Criar transação → invalida ['finance', 'transactions'] e ['finance', 'summary']
Convidar usuário → invalida ['users', 'list'] e ['users', 'invites']
```

### 3.7 Estratégia de Validação

**Frontend (Zod):** Validação ao submeter o formulário e, opcionalmente, ao perder o foco em campos críticos. Erros exibidos inline nos campos correspondentes.

**Backend (class-validator + ValidationPipe):** Toda request é validada no DTO antes de chegar ao controller. Requisições com payload inválido retornam 400 Bad Request com detalhe dos campos.

**Princípio:** A validação do frontend é para UX. A validação do backend é para segurança. Nunca confiar apenas na validação do cliente.

---

## 4. Arquitetura Backend

### 4.1 Estrutura de Módulos NestJS

```
apps/api/src/
├── main.ts                      # Bootstrap da aplicação
├── app.module.ts                # Módulo raiz — importa todos os módulos
│
├── modules/
│   ├── auth/                    # Autenticação e sessão
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── refresh.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── refresh.dto.ts
│   │
│   ├── churches/                # Gestão do tenant (igreja)
│   │   ├── churches.module.ts
│   │   ├── churches.controller.ts
│   │   ├── churches.service.ts
│   │   ├── churches.repository.ts
│   │   └── dto/
│   │
│   ├── users/                   # Gestão de usuários e convites
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── invites/
│   │   │   ├── invites.service.ts
│   │   │   └── invites.repository.ts
│   │   └── dto/
│   │
│   ├── departments/             # Departamentos e líderes
│   │   ├── departments.module.ts
│   │   ├── departments.controller.ts
│   │   ├── departments.service.ts
│   │   ├── departments.repository.ts
│   │   └── dto/
│   │
│   ├── finance/                 # Módulo financeiro
│   │   ├── finance.module.ts
│   │   ├── transactions/
│   │   │   ├── transactions.controller.ts
│   │   │   ├── transactions.service.ts
│   │   │   ├── transactions.repository.ts
│   │   │   └── dto/
│   │   ├── categories/
│   │   │   ├── categories.controller.ts
│   │   │   ├── categories.service.ts
│   │   │   └── categories.repository.ts
│   │   ├── bank-accounts/
│   │   │   ├── bank-accounts.controller.ts
│   │   │   ├── bank-accounts.service.ts
│   │   │   └── bank-accounts.repository.ts
│   │   └── reports/
│   │       ├── reports.controller.ts
│   │       └── reports.service.ts
│   │
│   ├── assets/                  # Patrimônio
│   │   ├── assets.module.ts
│   │   ├── assets.controller.ts
│   │   ├── assets.service.ts
│   │   ├── assets.repository.ts
│   │   └── dto/
│   │
│   ├── events/                  # Eventos
│   │   ├── events.module.ts
│   │   ├── events.controller.ts
│   │   ├── events.service.ts
│   │   ├── events.repository.ts
│   │   └── dto/
│   │
│   ├── billing/                 # Assinaturas e Stripe
│   │   ├── billing.module.ts
│   │   ├── billing.controller.ts
│   │   ├── billing.service.ts
│   │   ├── stripe/
│   │   │   ├── stripe.service.ts
│   │   │   └── stripe-webhook.controller.ts
│   │   └── dto/
│   │
│   ├── notifications/           # Notificações internas e email
│   │   ├── notifications.module.ts
│   │   ├── notifications.service.ts
│   │   ├── email/
│   │   │   └── email.service.ts
│   │   └── dto/
│   │
│   └── audit/                   # Logs de auditoria
│       ├── audit.module.ts
│       ├── audit.controller.ts
│       ├── audit.service.ts
│       └── audit.repository.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # Extrai usuário do JWT
│   │   ├── current-tenant.decorator.ts  # Extrai church_id do usuário
│   │   └── roles.decorator.ts           # Metadado de roles permitidas
│   │
│   ├── filters/
│   │   └── http-exception.filter.ts     # Serialização padronizada de erros
│   │
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            # Valida JWT em rotas protegidas
│   │   ├── roles.guard.ts               # Verifica role do usuário
│   │   └── subscription.guard.ts        # Verifica status da assinatura
│   │
│   ├── interceptors/
│   │   ├── audit.interceptor.ts         # Captura mutações e gera audit logs
│   │   └── transform.interceptor.ts     # Formata responses em envelope padrão
│   │
│   ├── middlewares/
│   │   └── request-logger.middleware.ts # Log estruturado de toda requisição
│   │
│   └── pipes/
│       └── validation.pipe.ts           # GlobalPipe para validação de DTOs
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── stripe.config.ts
│   ├── minio.config.ts
│   └── resend.config.ts
│
└── prisma/
    ├── prisma.module.ts     # Módulo global do Prisma
    └── prisma.service.ts    # PrismaClient encapsulado
```

### 4.2 Camadas da Aplicação

O backend segue um modelo de camadas com dependências unidirecionais:

```
HTTP Request
    ↓
[Middleware]         → Log de request, resolução de contexto
    ↓
[Guard]              → JwtAuthGuard → RolesGuard → SubscriptionGuard
    ↓
[Interceptor]        → AuditInterceptor (antes e depois do handler)
    ↓
[Pipe]               → ValidationPipe (valida e transforma DTO)
    ↓
[Controller]         → Recebe request validada, delega ao Service
    ↓
[Service]            → Lógica de negócio, orquestra calls ao Repository
    ↓
[Repository]         → Queries Prisma, sempre filtradas por church_id
    ↓
[Prisma Client]      → PostgreSQL
```

**Controller** — Responsabilidade única: receber request, extrair dados do DTO e contexto, chamar o método correto do service, retornar o resultado. Zero lógica de negócio.

**Service** — Contém toda a lógica de negócio do módulo. Valida regras de domínio, coordena múltiplas operações, decide o que fazer com o resultado do repository. Não conhece HTTP (não acessa `req`, não sabe sobre status codes).

**Repository** — Única camada que conhece o Prisma. Traduz chamadas de domínio em queries do banco. Sempre recebe `churchId` como parâmetro obrigatório — sem exceção. Nunca contém lógica de negócio.

**Prisma Service** — Encapsula o PrismaClient. Garante que há apenas uma instância do client na aplicação. Provê acesso ao Prisma através do sistema de DI do NestJS.

### 4.3 Padrão de DTO

Dois tipos de DTO por operação:

**Request DTO** — Define e valida o que o cliente pode enviar. Usa `class-validator` decorators. Nenhum campo sensível (ex: `church_id`, `created_by_user_id`) é aceito do cliente — são injetados pelo contexto no service.

**Response DTO** — Define exatamente o que é retornado ao cliente. Nenhum campo interno (hashes, IDs de sistema, campos de auditoria) vaza acidentalmente. Mapeado explicitamente a partir da entidade.

**Exemplo de nomenclatura:**
```
CreateTransactionDto       → POST /finance/transactions
UpdateTransactionDto       → PATCH /finance/transactions/:id
TransactionResponseDto     → Retorno de qualquer endpoint de transaction
PaginatedTransactionDto    → Listagem paginada
```

### 4.4 Guards

**JwtAuthGuard** — Aplicado globalmente. Extrai e valida o JWT do header `Authorization: Bearer <token>`. Popula o objeto de usuário no request. Rotas públicas são marcadas com decorator `@Public()`.

**RolesGuard** — Verifica se o usuário autenticado possui ao menos um dos roles declarados no decorator `@Roles()` da rota. Acoplado ao JwtAuthGuard.

**SubscriptionGuard** — Verifica o status da assinatura do tenant do usuário. Bloqueia completamente se `status` for `suspended` ou `cancelled`. Roda após o JwtAuthGuard.

**Ordem de execução dos guards:** JwtAuthGuard → RolesGuard → SubscriptionGuard. A ordem importa — não faz sentido verificar subscription antes de saber quem é o usuário.

### 4.5 Interceptors

**AuditInterceptor** — Intercepta chamadas aos métodos marcados com `@Auditable()`. Antes da execução, captura o estado anterior da entidade (se aplicável). Após a execução bem-sucedida, registra o evento de auditoria com before/after. Erros não geram registro de auditoria. Não afeta o fluxo de resposta.

**TransformInterceptor** — Envolve toda response em envelope padronizado:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "...", "path": "..." }
}
```

### 4.6 Middlewares

**RequestLoggerMiddleware** — Registra cada request com: método, path, `tenant_id`, `user_id`, duração em ms, status code. Output em JSON estruturado. Aplicado globalmente.

### 4.7 Configuração de Ambiente

Toda configuração sensível é carregada via variáveis de ambiente validadas por schema (usando `@nestjs/config` com `Joi`). Não há valores hardcoded de ambiente no código. O arquivo `.env.example` documenta todas as variáveis requeridas.

---

## 5. Multi-Tenancy

### 5.1 Estratégia Adotada: Row-Level Isolation

O Church Flow implementa multi-tenancy via **isolamento por linha (row-level)** com `church_id` presente em todas as tabelas de dados de negócio.

**Alternativas consideradas e descartadas:**

| Estratégia | Por que descartada |
|---|---|
| **Schema-per-tenant** | Explosão de schemas no PostgreSQL; migração que toca todos os tenants é operacionalmente perigosa; complexidade de connection pool por schema |
| **Database-per-tenant** | Custo operacional proibitivo para SaaS; não escala para centenas de tenants sem infraestrutura dedicada |
| **Row-level com RLS (PostgreSQL Row Level Security)** | Adiciona garantia extra, mas requer sessão de banco por tenant — incompatível com connection pool compartilhado do Prisma |

**Row-level escolhido porque:** Operacionalmente simples, funciona com connection pool único, suporta queries cross-tenant para operações internas (SUPER_ADMIN), escalável para milhares de tenants sem alteração de infraestrutura.

**Risco principal:** Developer esquece de filtrar por `church_id` em uma query. **Mitigação:** Repository pattern que recebe `churchId` como parâmetro obrigatório — impossível chamar sem fornecer o tenant.

### 5.2 TenantContext

O contexto do tenant é resolvido a partir do JWT e propagado pela cadeia de execução:

```
JWT payload contém: { sub: userId, churchId, roles[], iat, exp }

JwtStrategy extrai e valida o payload
  ↓
CurrentUser decorator disponibiliza o payload no controller
  ↓
Controller passa churchId para o Service
  ↓
Service passa churchId para o Repository
  ↓
Repository inclui WHERE church_id = $churchId em toda query
```

**Princípio:** O `church_id` nunca vem do corpo da request (body/params) para operações de isolamento. Sempre do JWT. Um cliente não pode manipular o `church_id` da própria request para acessar dados de outro tenant.

**Exceção deliberada:** Rotas do módulo de billing que recebem webhooks do Stripe identificam o tenant via `metadata.church_id` do evento Stripe — tratado como dado confiável de sistema externo, não de cliente.

### 5.3 Regras de Isolamento

| Camada | Mecanismo de isolamento |
|---|---|
| **API Layer** | JWT não pode ser forjado sem a chave secreta |
| **Guard Layer** | SubscriptionGuard verifica status ativo do tenant |
| **Service Layer** | Business rules verificam que entidade referenciada pertence ao mesmo church_id |
| **Repository Layer** | Todo `findOne`, `findMany`, `update` e `delete` inclui `where: { church_id }` |
| **Database Layer** | Constraints de FK garantem integridade referencial entre entidades do mesmo tenant |

**Cross-tenant reference check:** Quando um lançamento financeiro referencia um departamento, o service valida que o `department.church_id === transaction.church_id`. Este check existe no service, não apenas no frontend.

### 5.4 Escalabilidade Futura do Multi-Tenant

O modelo row-level suporta as evoluções planejadas sem reescrita:

- **Redes e denominações (V2):** Adicionar tabela `church_networks` com `church_id` e `network_id`. Queries de rede agregam por `network_id` em vez de `church_id`. Sem mudança no modelo de tenant individual.
- **Compliance de dados regionais:** Row-level permite future sharding por região geográfica mapeado pelo `church_id`.
- **Read replicas para relatórios:** Queries analíticas pesadas redirecionadas para replica — funciona sem mudança no modelo de tenant.

---

## 6. Sistema de Permissões (RBAC)

### 6.1 Modelo de Roles

O sistema utiliza **RBAC hierárquico com roles fixas** em V1. Roles são definidas em enum — não são configuráveis pelo tenant. Esta decisão simplifica a implementação e reduz superfície de erros.

**Justificativa de roles fixas em V1:** Roles configuráveis por tenant adicionam complexidade de UI, risco de misconfiguration pelo admin, e lógica de resolução de permissão mais complexa. O benefício não justifica o custo na V1. A tabela `roles` e `permissions` no schema suporta evolução para RBAC customizável em V2 sem reescrita.

### 6.2 Definição de Roles

| Role | Escopo | Descrição |
|---|---|---|
| `SUPER_ADMIN` | Sistema | Equipe interna Church Flow. Acesso de suporte transversal. Nunca pertence a um tenant. |
| `CHURCH_ADMIN` | Tenant | Administrador total da igreja. Acesso irrestrito a todos os módulos do próprio tenant. |
| `TREASURER` | Tenant | Tesoureiro. Acesso completo ao módulo financeiro. Leitura nos demais. |
| `SECRETARY` | Tenant | Secretaria. Acesso a usuários, departamentos e eventos. Sem acesso financeiro detalhado. |
| `DEPARTMENT_LEADER` | Departamento | Líder de departamento. Acesso restrito ao(s) próprio(s) departamento(s). |
| `VIEWER` | Tenant | Somente leitura em módulos configurados pelo CHURCH_ADMIN. |

### 6.3 Matriz de Permissões por Módulo

| Módulo | CHURCH_ADMIN | TREASURER | SECRETARY | DEPT_LEADER | VIEWER |
|---|---|---|---|---|---|
| **Dashboard** | R | R | R | R (dept) | R |
| **Financeiro** | CRUD | CRUD | — | R (dept) | R |
| **Relatórios** | CRUD | CRUD | — | — | — |
| **Patrimônio** | CRUD | R | CRUD | — | R |
| **Eventos** | CRUD | R | CRUD | CRUD (dept) | R |
| **Departamentos** | CRUD | R | CRUD | R (own) | R |
| **Usuários** | CRUD | R | R | — | — |
| **Configurações** | CRUD | — | — | — | — |
| **Billing** | CRUD | — | — | — | — |
| **Auditoria** | R | — | — | — | — |

> **Nota:** `DEPT_LEADER` com acesso a eventos significa apenas eventos do próprio departamento. A restrição de escopo é implementada no service, não apenas no guard.

### 6.4 Implementação Técnica

**Decorator de roles:**
```
@Roles(UserRole.CHURCH_ADMIN, UserRole.TREASURER)
@Get('transactions')
findAll() { ... }
```

**RolesGuard** lê os metadados do decorator e verifica se `request.user.roles` contém ao menos um dos roles requeridos.

**DEPARTMENT_LEADER scoping:** Para rotas onde o DEPARTMENT_LEADER tem acesso restrito, o service recebe o `departmentIds[]` do usuário (resolvido via JWT ou consulta adicional) e aplica filtro. O guard verifica a role; o service verifica o escopo do departamento.

### 6.5 Resolução de Conflito de Roles

Um usuário pode ter múltiplas roles. A resolução é **additive** — um usuário com roles `TREASURER` e `DEPARTMENT_LEADER` tem a união das permissões de ambas as roles.

**Invariante:** `CHURCH_ADMIN` sempre prevalece. Um usuário com `CHURCH_ADMIN` tem acesso irrestrito ao tenant, independentemente de outras roles.

---

## 7. Fluxo de Autenticação

### 7.1 Visão Geral da Estratégia

| Token | TTL | Armazenamento | Transporte |
|---|---|---|---|
| Access Token (JWT) | 15 minutos | Memória (Zustand) | `Authorization: Bearer` header |
| Refresh Token (opaque UUID) | 7 dias | Cookie HttpOnly | Cookie automático |

**Por que access token em memória, não localStorage:**
LocalStorage é acessível via JavaScript — qualquer XSS que injetar código na página pode exfiltrar o token. Memória de sessão é zerada ao fechar o browser e não é acessível via DOM.

**Por que refresh token em cookie HttpOnly:**
Cookie HttpOnly não é acessível via JavaScript — imune a XSS. `SameSite=Strict` previne CSRF. `Secure` garante transmissão apenas via HTTPS. O trade-off é que o cookie é enviado automaticamente (comportamento de browser) — aceito pois o endpoint de refresh é a única rota que o usa.

### 7.2 Fluxo de Login

```
1. Cliente → POST /auth/login { email, password }

2. AuthService:
   a. Busca usuário por email (busca global — email é unique globalmente)
   b. Verifica hash da senha com Argon2id
   c. Verifica status do usuário (is_active = true)
   d. Verifica status da assinatura do tenant (trial | active)
   e. Gera access token JWT: payload { sub: userId, churchId, roles[], iat, exp }
   f. Gera refresh token: UUID v4 armazenado em tabela refresh_tokens com hash
   g. Atualiza last_login_at do usuário

3. Response:
   Header: Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh
   Body: { accessToken, user: { id, name, email, roles[], church: {...} } }

4. Cliente armazena accessToken em Zustand (memória)
   Cliente não armazena refresh token — gerenciado automaticamente pelo browser
```

### 7.3 Fluxo de Refresh Token

```
1. Cliente detecta resposta 401 de qualquer endpoint
   (Interceptor Axios captura automaticamente)

2. Cliente → POST /auth/refresh
   (Refresh token enviado automaticamente via cookie)

3. RefreshStrategy:
   a. Extrai refresh token do cookie
   b. Busca hash do token na tabela refresh_tokens
   c. Verifica validade (não expirado, não revogado)
   d. Verifica que o usuário ainda está ativo e o tenant ativo
   e. INVALIDA o refresh token atual (rotação: token de único uso)
   f. Gera novo access token + novo refresh token
   g. Armazena hash do novo refresh token

4. Response com novo par de tokens
   Cliente atualiza accessToken em memória
   Novo cookie de refresh token definido automaticamente

5. Cliente re-tenta a requisição original com novo access token
```

**Rotação de refresh token:** Cada uso do refresh token invalida o token atual e emite um novo. Se um refresh token for roubado e usado pelo atacante, o uso legítimo subsequente do token antigo (pelo usuário real) falhará — detectando o comprometimento.

### 7.4 Fluxo de Logout

```
1. Cliente → POST /auth/logout

2. AuthService:
   a. Extrai refresh token do cookie
   b. Invalida o registro na tabela refresh_tokens (revoked_at = now())
   c. Todas as instâncias de refresh token do usuário podem ser revogadas opcionalmente

3. Response:
   Header: Set-Cookie: refresh_token=; HttpOnly; Secure; Max-Age=0 (remove cookie)
   Body: { success: true }

4. Cliente limpa accessToken do Zustand
   Browser remove o cookie via Max-Age=0
```

### 7.5 Proteção de Rotas no Frontend

React Router define rotas protegidas via componente `ProtectedRoute`:

```
Ao tentar acessar rota autenticada:
  1. Verifica se accessToken existe em Zustand
  2. Se não existe: redireciona para /login
  3. Se existe mas expirado: tenta refresh automático (Axios interceptor)
  4. Se refresh falha: redireciona para /login (sessão expirada)
  5. Se refresh sucede: prossegue para a rota solicitada

Para rotas com role específica:
  usePermissions() verifica roles do usuário em Zustand
  Sem permissão: redireciona para /403 ou página adequada
```

### 7.6 Recuperação de Senha

```
1. POST /auth/forgot-password { email }
   → Sempre retorna 200 (não vaza se email existe ou não)
   → Se email existe: gera token único (UUID v4), armazena com hash + expiry (1h)
   → Envia email via Resend com link: https://app.churchflow.com.br/reset-password?token=<raw>

2. POST /auth/reset-password { token, password, passwordConfirmation }
   → Valida token (hash match, não expirado, não usado)
   → Hash nova senha com Argon2id
   → Invalida token (usado = true)
   → Invalida TODOS os refresh tokens do usuário
   → Retorna 200
```

---

## 8. Auditoria

### 8.1 Princípio de Design

A auditoria é implementada como **cross-cutting concern** via interceptor — não é código manual em cada service. Este design garante:
- Cobertura uniforme — impossível "esquecer" de auditar uma ação
- Service code limpo — sem lógica de auditoria misturada com lógica de negócio
- Comportamento consistente — formato de log idêntico em todos os módulos

### 8.2 AuditInterceptor

O `AuditInterceptor` intercepta chamadas a handlers marcados com `@Auditable(action, module)`:

```
Antes da execução:
  1. Captura estado anterior da entidade (para UPDATE e DELETE)
     → Busca o registro pelo ID extraído dos params
  2. Registra metadata: user, tenant, IP, user-agent, timestamp

Após execução bem-sucedida:
  1. Captura estado posterior (para CREATE e UPDATE)
  2. Sanitiza dados sensíveis do before/after (remove campos: password_hash, token, secret)
  3. Persiste registro em audit_logs

Em caso de erro:
  Não gera registro de auditoria (ação não foi concluída)
```

### 8.3 Eventos Auditáveis

| Módulo | Ação | Evento Registrado |
|---|---|---|
| Auth | Login bem-sucedido | `AUTH_LOGIN` |
| Auth | Logout | `AUTH_LOGOUT` |
| Auth | Falha de login | `AUTH_LOGIN_FAILED` |
| Auth | Reset de senha | `AUTH_PASSWORD_RESET` |
| Users | Convidar usuário | `USER_INVITED` |
| Users | Ativar convite | `USER_INVITE_ACCEPTED` |
| Users | Desativar usuário | `USER_DEACTIVATED` |
| Users | Alterar role | `USER_ROLE_CHANGED` |
| Finance | Criar transação | `TRANSACTION_CREATED` |
| Finance | Editar transação | `TRANSACTION_UPDATED` |
| Finance | Excluir transação | `TRANSACTION_DELETED` |
| Assets | Criar bem | `ASSET_CREATED` |
| Assets | Registrar movimentação | `ASSET_MOVED` |
| Assets | Registrar baixa | `ASSET_DISPOSED` |
| Departments | Criar departamento | `DEPARTMENT_CREATED` |
| Departments | Atribuir líder | `DEPARTMENT_LEADER_ASSIGNED` |
| Billing | Plano alterado | `SUBSCRIPTION_CHANGED` |
| Settings | Configuração alterada | `SETTINGS_UPDATED` |

### 8.4 Imutabilidade

```
Regras de imutabilidade do audit_log:
- Não existe endpoint DELETE para audit_logs
- Não existe endpoint UPDATE para audit_logs
- CHURCH_ADMIN: READ apenas (filtrado pelo próprio church_id)
- SUPER_ADMIN: READ apenas (acesso transversal para suporte)
- Banco de dados: nenhuma role de aplicação tem permissão de DELETE na tabela audit_logs
  (garantia adicional via PostgreSQL GRANT)
```

### 8.5 Considerações de Performance e Retenção

**Performance:** A escrita em `audit_logs` é síncrona na V1. Para volumes baixos, é aceitável. Em V2, migrar para escrita assíncrona via event emitter (NestJS EventEmitter) para desacoplar do fluxo principal.

**Retenção:** A tabela `audit_logs` crescerá indefinidamente. Decisão de retenção está pendente (DEC-005). Recomendar: particionamento por `created_at` (PostgreSQL table partitioning) desde o início para permitir arquivamento/purge de partições antigas sem lock de tabela.

---

## 9. Estratégia de Deploy

### 9.1 Visão Geral do Ambiente de Produção

```
Internet
    ↓
[Cloudflare / DNS]
    ↓
[VPS — Ubuntu LTS]
    ├── Nginx (reverse proxy + SSL termination)
    │   ├── / → web container (React build estático)
    │   ├── /api → api container (NestJS)
    │   └── /minio → MinIO (presigned URLs apenas)
    │
    ├── Docker Compose Stack:
    │   ├── web       (Nginx servindo build estático do React)
    │   ├── api       (NestJS — porta 3000)
    │   ├── postgres  (PostgreSQL — porta 5432, não exposta externamente)
    │   ├── minio     (MinIO — porta 9000/9001, não exposta externamente)
    │   ├── prometheus (porta 9090, não exposta externamente)
    │   └── grafana   (porta 3001, acesso restrito por IP ou VPN)
    │
    └── Backups automáticos (cron → script → S3-compatible storage)
```

### 9.2 Containers

**`web` container:**
- Build multi-stage: Node (build do Vite) → Nginx (serve estático)
- Tamanho final: < 30MB
- Nginx configurado para: SPA fallback (todas as rotas retornam index.html), gzip, cache de assets estáticos

**`api` container:**
- Build multi-stage: Node (build NestJS) → Node Alpine (runtime)
- Roda como usuário não-root
- Health check em `/health`
- Variáveis de ambiente via arquivo `.env` montado como volume (nunca hardcoded na imagem)

**`postgres` container:**
- PostgreSQL 16 Alpine
- Dados persistidos em volume nomeado
- Não exposto externamente (apenas rede Docker interna)
- Backup diário via `pg_dump` → comprimido → enviado ao storage

**`minio` container:**
- MinIO latest
- Dados persistidos em volume nomeado
- Console de administração acessível apenas internamente (ou via túnel SSH)

### 9.3 Nginx Configuration

```
Responsabilidades do Nginx externo (reverse proxy):
- Terminação SSL (certificado Let's Encrypt via Certbot)
- Redirecionamento HTTP → HTTPS
- Headers de segurança: HSTS, X-Content-Type-Options, X-Frame-Options, CSP
- Rate limiting nas rotas /api/auth/* (5 req/min por IP)
- Geração de X-Request-ID para correlação de logs
- Proxy pass para containers internos
- Cache de assets estáticos (imagens, fontes) com headers adequados
```

### 9.4 CI/CD com GitHub Actions

```
Pipeline em .github/workflows/:

[ci.yml] — Disparado em: push para qualquer branch, PR para main
  1. Checkout
  2. Setup pnpm
  3. Install dependencies (cache de pnpm store)
  4. Typecheck (turbo run typecheck)
  5. Lint (turbo run lint)
  6. Tests (turbo run test)
  → Falha em qualquer step bloqueia merge

[deploy.yml] — Disparado em: push para main (após CI passar)
  1. Build Docker images (api e web)
  2. Push images para registry (GitHub Container Registry — ghcr.io)
  3. SSH no VPS
  4. Pull novas imagens
  5. docker compose up -d --pull always (zero-downtime com --no-deps se configurado)
  6. Executar migrations Prisma (prisma migrate deploy)
  7. Health check (curl /health)
  8. Notificação de deploy bem-sucedido (ou rollback se health check falhar)
```

### 9.5 Gestão de Segredos

- Variáveis de ambiente de produção armazenadas como GitHub Secrets
- SSH key para deploy armazenada como GitHub Secret
- `.env` no servidor nunca versionado — gerado via script de provisionamento
- Rotação de secrets: processo documentado em `infra/scripts/rotate-secrets.md`

### 9.6 Backup e Recovery

```
Backup diário automatizado:
  - pg_dump → comprimido com gzip → enviado para bucket MinIO ou S3
  - Retenção: 30 dias
  - Teste de restore: executado mensalmente via script em ambiente staging

Recovery procedure documentada em infra/scripts/restore.md:
  1. Parar containers api e web
  2. Restore pg_dump para novo volume
  3. Substituir volume e reiniciar
  4. Validar integridade dos dados
  5. Reiniciar serviços
```

---

## 10. Convenções

### 10.1 Nomenclatura

**TypeScript / JavaScript:**
- Arquivos: `kebab-case.ts` / `kebab-case.tsx`
- Classes e Interfaces: `PascalCase`
- Funções e variáveis: `camelCase`
- Constantes globais: `SCREAMING_SNAKE_CASE`
- Tipos de enum: `PascalCase`, valores: `SCREAMING_SNAKE_CASE`

**Backend (NestJS):**
- Módulos: `finance.module.ts`, `users.module.ts`
- Controllers: `transactions.controller.ts`
- Services: `transactions.service.ts`
- Repositories: `transactions.repository.ts`
- DTOs: `create-transaction.dto.ts`, `transaction-response.dto.ts`
- Guards: `jwt-auth.guard.ts`
- Interceptors: `audit.interceptor.ts`

**Frontend (React):**
- Componentes: `TransactionForm.tsx`, `DepartmentCard.tsx`
- Hooks: `use-transactions.ts`, `use-auth.ts`
- Stores Zustand: `auth.store.ts`, `ui.store.ts`
- Páginas: `TransactionsPage.tsx`
- Schemas: `transaction.schema.ts`

**Banco de Dados:**
- Tabelas: `snake_case` plural: `financial_transactions`, `audit_logs`
- Colunas: `snake_case`: `church_id`, `created_at`, `deleted_at`
- Índices: `idx_{tabela}_{coluna(s)}`: `idx_transactions_church_id`
- Constraints: `uq_{tabela}_{coluna}`, `fk_{tabela}_{coluna}`

### 10.2 Git Workflow

O Church Flow adota **GitHub Flow** — modelo simplificado adequado para equipes pequenas com deploy contínuo.

```
Branches principais:
  main          → Produção. Toda push aqui dispara deploy.

Branches de trabalho:
  feature/{slug}    → ex: feature/finance-reports-export
  fix/{slug}        → ex: fix/refresh-token-rotation
  chore/{slug}      → ex: chore/upgrade-prisma-version
  docs/{slug}       → ex: docs/add-api-spec

Fluxo:
  1. Cria branch a partir de main
  2. Desenvolve com commits atômicos
  3. Abre Pull Request para main
  4. CI deve passar (typecheck, lint, tests)
  5. Code review por ao menos 1 desenvolvedor
  6. Squash & merge para main
  7. Branch deletada após merge
  8. Deploy automático disparado
```

**Regras:**
- Nunca commitar diretamente em `main`
- PRs sem CI passando não podem ser mergeados
- Cada PR deve ter descrição clara do que faz e por quê

### 10.3 Commits

Formato: **Conventional Commits**

```
<type>(<scope>): <descrição curta em português ou inglês>

Tipos:
  feat      → nova funcionalidade
  fix       → correção de bug
  chore     → manutenção, dependências, tooling
  docs      → documentação
  test      → adição ou correção de testes
  refactor  → refatoração sem mudança de comportamento
  perf      → melhoria de performance
  ci        → mudanças em CI/CD

Scopes: api, web, db, infra, docs, auth, finance, assets, events, departments

Exemplos:
  feat(finance): adicionar exportação de DRE em PDF
  fix(auth): corrigir rotação de refresh token em logout concorrente
  chore(deps): atualizar Prisma para 5.x
  docs(api): adicionar spec de endpoints de auditoria
```

### 10.4 Organização de Code Review

- Toda mudança em `common/guards/` ou `common/interceptors/` requer revisão cuidadosa de segurança
- Mudanças em `prisma/schema.prisma` e migrations requerem revisão de impacto de dados
- Mudanças em módulos de autenticação (`modules/auth/`) requerem revisão de segurança explícita
- PRs grandes (> 400 linhas) devem ser quebrados em partes menores quando possível

---

## 11. Decisões Arquiteturais Aprovadas

Esta seção consolida todas as decisões arquiteturais relevantes tomadas para a V1. Mudanças nessas decisões requerem discussão explícita e novo registro.

| ID | Decisão | Escolha | Justificativa |
|---|---|---|---|
| ADR-001 | Estratégia de multi-tenancy | Row-level isolation com `church_id` | Menor complexidade operacional, suporta escala sem mudança de infraestrutura, compatível com connection pool do Prisma |
| ADR-002 | Armazenamento de access token | Memória (Zustand) | Imune a XSS — JavaScript não persiste entre recarregamentos; tokens curtos (15min) limitam janela de exposição |
| ADR-003 | Armazenamento de refresh token | Cookie HttpOnly | Imune a XSS; `Secure` + `SameSite=Strict` previne interceptação e CSRF |
| ADR-004 | Rotação de refresh token | A cada uso (token de único uso) | Uso indevido de token roubado é detectável; sessão do usuário legítimo falha ao usar token já consumido |
| ADR-005 | Hashing de senha | Argon2id | Vencedor do Password Hashing Competition; resistente a GPU/ASIC cracking; parâmetros configuráveis de memória/CPU |
| ADR-006 | Relação usuário-tenant | 1 usuário : 1 igreja | Modelo mais simples para V1; multi-church requer contas separadas; sem tabela de junção `user_churches` |
| ADR-007 | Roles no RBAC | Roles fixas (enum), não configuráveis por tenant | Menor complexidade de V1; schema suporta evolução para roles dinâmicas em V2 sem reescrita |
| ADR-008 | Auditoria | Cross-cutting via AuditInterceptor | Cobertura garantida sem código manual em cada service; formato consistente |
| ADR-009 | Soft delete | Padrão em todas entidades com histórico relevante | Preservação de dados para auditoria, LGPD, integridade referencial |
| ADR-010 | Organização frontend | Feature-based (vertical slicing) | Melhor localidade de código; features independentes; escala melhor que layer-based |
| ADR-011 | Estado de servidor | TanStack Query (separado do UI state) | Separação clara entre estado de servidor e estado de UI; cache inteligente nativo |
| ADR-012 | Estado de UI | Zustand | Leve, sem boilerplate, TypeScript nativo; alternativa simples ao Redux |
| ADR-013 | Validação de formulários | React Hook Form + Zod | Performance (uncontrolled inputs); type-safe validation; schemas reutilizáveis entre frontend e backend |
| ADR-014 | Estrutura de projeto | Monorepo com Turborepo + pnpm | Compartilhamento de tipos; CI unificado; tooling consistente; cache incremental |
| ADR-015 | Suspensão de tenant | Bloqueio total + contato com suporte | Decisão de produto aprovada; SLA de suporte é dependência operacional que deve ser definida antes do lançamento |
| ADR-016 | Deploy | Docker Compose em VPS | Custo operacional baixo para V1; sem dependência de Kubernetes; migração viável para K8s em V2 se necessário |
| ADR-017 | CI/CD | GitHub Actions | Integrado ao repositório; sem custo adicional para repos privados no tier atual; suficiente para o porte da V1 |
| ADR-018 | Migrations | Prisma Migrate | Controle de versão de schema integrado ao ORM; `migrate deploy` seguro para produção |

---

*Próximo documento: `03-database.md`*
