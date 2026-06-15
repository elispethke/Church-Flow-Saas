# Church Flow — Product Requirements Document (PRD)

**Versão:** 1.1  
**Status:** Draft — Aguardando Aprovação  
**Data:** 2026-06-15  
**Dependência:** `00-vision.md` (Aprovado)  
**Responsável:** Product Manager + Software Architect + Backend Lead + Frontend Lead + DevOps & Security  

---

## 1. Objetivo do Produto

O **Church Flow** é uma plataforma SaaS multi-tenant para **gestão administrativa e financeira de igrejas**. Seu objetivo é centralizar em um único sistema as operações que hoje são realizadas de forma fragmentada — planilhas, WhatsApp, papel físico e sistemas isolados — entregando controle financeiro, gestão de patrimônio, eventos, organização por departamentos e auditoria com a qualidade, segurança e experiência de um produto de software moderno.

O Church Flow organiza **usuários do sistema** (não o cadastro completo da congregação) em departamentos e ministérios para fins operacionais. Gestão pastoral individual, controle de frequência de membros e acompanhamento congregacional não fazem parte do escopo da V1.

O produto resolve um problema real de organizações religiosas que cresceram operacionalmente mas não têm ferramentas adequadas para gerir essa complexidade com transparência e confiabilidade.

A V1 será uma versão **comercialmente viável**, pronta para produção, com clientes reais pagando assinatura recorrente.

---

## 1.1 Regras de Negócio Fundamentais

As seguintes regras foram definidas e **não são negociáveis** para a V1. Qualquer decisão de arquitetura, schema ou implementação deve respeitar estes invariantes.

| # | Regra | Impacto |
|---|---|---|
| RN-001 | Uma igreja pode ter múltiplos usuários | Relação 1:N entre `churches` e `users`; `church_id` FK no usuário |
| RN-002 | Um usuário pertence a **exatamente uma** igreja | Sem tabela de junção `user_churches`; sem troca de tenant em sessão |
| RN-003 | Uma igreja pode ter múltiplos departamentos | Relação 1:N entre `churches` e `departments` |
| RN-004 | Um departamento pode ter múltiplos líderes com permissões iguais | Tabela de junção `department_leaders`; sem campo de hierarquia entre líderes |
| RN-005 | Toda movimentação financeira pertence **obrigatoriamente** a uma igreja | `church_id` NOT NULL em `financial_transactions`; não editável após criação |
| RN-006 | Uma assinatura ativa é **obrigatória** para acesso ao sistema | Guard global de assinatura em todas as rotas autenticadas |
| RN-007 | Tenant suspenso tem acesso **totalmente bloqueado** — regularização via suporte | Sem auto-serviço de billing durante suspensão; requer fluxo de suporte definido |
| RN-008 | Church Flow é uma plataforma de **gestão administrativa e financeira** | Gestão pastoral individual, cadastro de congregantes e escalas estão fora do escopo da V1 |

---

## 2. Escopo da V1

A seguir estão todos os módulos e funcionalidades que **obrigatoriamente** fazem parte do lançamento da V1. Nenhum item desta lista pode ser removido sem análise de impacto e aprovação formal.

### Plataforma SaaS
- [ ] Landing page pública com apresentação do produto, planos e CTA de cadastro
- [ ] Fluxo de cadastro de nova conta (church + usuário administrador)
- [ ] Autenticação (login, logout, refresh token)
- [ ] Recuperação de senha via email
- [ ] Gestão de assinatura integrada com Stripe
- [ ] Tela de billing (plano atual, histórico de faturas, atualização de método de pagamento)
- [ ] Gestão da conta do tenant (dados da organização, configurações gerais)

### Gestão da Igreja
- [ ] Cadastro e edição do perfil institucional da igreja
- [ ] Upload de logotipo
- [ ] Configurações gerais (timezone, moeda)

### Gestão de Usuários
- [ ] Convite de usuários por email
- [ ] Gestão de papéis (roles) por usuário
- [ ] Ativação de conta via link de convite
- [ ] Desativação de usuários
- [ ] Perfil do usuário (nome, foto, telefone)

### Departamentos
- [ ] Cadastro de departamentos e ministérios
- [ ] Atribuição de múltiplos líderes por departamento (permissões iguais entre líderes)
- [ ] Vinculação de colaboradores (usuários do sistema) a departamentos

### Financeiro
- [ ] Lançamento de receitas e despesas
- [ ] Categorias customizáveis
- [ ] Múltiplas contas bancárias
- [ ] Dashboard financeiro (saldo, receitas, despesas, gráficos)
- [ ] Demonstrativo de Resultado (DRE) por período
- [ ] Fluxo de caixa
- [ ] Exportação de relatórios (PDF e CSV)
- [ ] Associação de lançamentos a eventos ou departamentos

### Patrimônio
- [ ] Cadastro de bens com dados completos
- [ ] Categorização de bens
- [ ] Upload de fotos
- [ ] Histórico de movimentações
- [ ] Registro de manutenções
- [ ] Relatório de inventário exportável

### Eventos
- [ ] Criação e edição de eventos
- [ ] Controle de presença com check-in
- [ ] Orçamento de evento (receitas e despesas previstas vs. realizadas)
- [ ] Status do evento (rascunho, publicado, realizado, cancelado)
- [ ] Detecção de conflitos de agenda

### Notificações
- [ ] Notificações internas (in-app)
- [ ] Emails transacionais via Resend (convites, reset de senha, alertas)
- [ ] Preferências de notificação por usuário

### Auditoria
- [ ] Log imutável de todas as ações
- [ ] Interface de visualização com filtros
- [ ] Exportação do histórico de auditoria

---

## 3. Fora do Escopo da V1

Os itens abaixo são funcionalidades planejadas para versões futuras. Não devem ser desenvolvidos na V1, mas a arquitetura deve ser concebida sem bloquear sua implementação posterior.

| Funcionalidade | Justificativa do adiamento |
|---|---|
| App mobile nativo (iOS/Android) | Alto custo de desenvolvimento; responsividade web é suficiente para V1 |
| Suporte a múltiplas filiais/redes | Complexidade de hierarquia de tenants; validar PMF com modelo simples primeiro |
| API pública para desenvolvedores | Requer estabilidade do schema e documentação robusta |
| Marketplace de integrações | Requer base de clientes para justificar o investimento |
| Contabilidade fiscal (NF, SPED) | Fora do domínio do produto; integração com contador externo |
| Streaming de cultos | Fora do domínio administrativo |
| Doações públicas (crowdfunding) | Outro produto; requer regulação financeira |
| CRM de evangelismo | Fora do escopo de gestão administrativa |
| App de check-in autônomo (totem) | Avaliar com base no uso do módulo de eventos |
| Comunicação interna (chat) | WhatsApp resolve para V1; feature requer alta retensão antes de valer |
| Integração com bancos (Open Finance) | Complexidade regulatória; avaliar em V2 |
| Escalas e controle de voluntários | Avaliar demanda após lançamento; não é gestão administrativa core |
| Controle de estoque | Fora do escopo de patrimônio definido para V1 |
| **Gestão completa de membros da congregação** | **V1 não possui cadastro individual de congregantes. Apenas usuários do sistema são gerenciados.** |
| **Acompanhamento pastoral individual** | Dados pastorais (saúde, família, visitas, aniversários) fora do escopo da V1 |
| **Controle de presença de membros nos cultos** | Presença em eventos existe para controle operacional de eventos cadastrados, não para rastreamento pastoral contínuo |
| **Escalas de voluntários e ministério** | Feature operacional de ministério; avaliar demanda na V2 |

---

## 4. Módulos da Plataforma

---

### 4.1 Módulo: Plataforma SaaS (Público + Autenticação + Billing)

#### Objetivo
Permitir que novas igrejas descubram, se cadastrem, ativem e gerenciem sua assinatura no Church Flow de forma autônoma, sem intervenção manual da equipe.

#### Usuários Envolvidos
- Visitante (não autenticado) — Landing page
- CHURCH_ADMIN — Cadastro, billing, gestão da conta
- Qualquer usuário autenticado — Login, recuperação de senha

#### Funcionalidades

**Landing Page**
- Apresentação do produto com seções: hero, módulos, diferenciais, depoimentos (placeholder), planos, CTA
- Botão de cadastro e login visíveis
- Totalmente responsiva

**Cadastro**
- Formulário de criação de conta: nome da igreja, nome do responsável, email, senha
- Validação de email único
- Aceite dos termos de uso e política de privacidade (obrigatório)
- Envio de email de confirmação de conta via Resend
- Redirecionamento para onboarding após confirmação

**Login**
- Autenticação via email e senha
- Emissão de JWT (access token, 15 min) + refresh token (7 dias, rotacionado)
- Mensagem de erro genérica em falha (não informar se email ou senha estão errados separadamente)
- Rate limiting: máximo 5 tentativas em 15 minutos por IP/email

**Recuperação de Senha**
- Formulário de solicitação com campo de email
- Envio de link com token de uso único e validade de 1 hora
- Formulário de redefinição de senha com confirmação
- Invalidação de todos os refresh tokens após reset

**Gestão de Assinatura (Billing)**
- Exibição do plano atual, status e próxima cobrança
- Histórico de faturas com status (pago, pendente, falhou)
- Download de fatura individual
- Atualização de método de pagamento (Stripe Customer Portal)
- Cancelamento de assinatura com confirmação e motivo
- Trial period configurável antes da primeira cobrança

**Gestão da Conta**
- Edição dos dados gerais da organização
- Configurações de timezone e moeda
- Upload e troca de logotipo (MinIO)
- Configurações de notificação globais

#### Dependências
- Stripe (assinaturas, billing, Customer Portal)
- Resend (emails transacionais)
- MinIO (upload de logotipo)
- PostgreSQL (dados do tenant)

#### Critérios de Aceite
- [ ] Um usuário consegue criar uma conta, confirmar o email e acessar a plataforma sem suporte
- [ ] Login com credenciais inválidas não informa qual campo está errado
- [ ] Após 5 tentativas de login com falha, o acesso é temporariamente bloqueado
- [ ] Link de recuperação de senha expira em 1 hora e é de uso único
- [ ] Admin consegue visualizar e baixar todas as faturas anteriores
- [ ] Ao cancelar assinatura, o acesso é mantido até o fim do período já pago
- [ ] Em caso de falha de pagamento, o tenant recebe alerta e tem período de graça antes do bloqueio

---

### 4.2 Módulo: Gestão da Igreja

#### Objetivo
Permitir que o administrador configure o perfil institucional da igreja e as configurações gerais que afetam toda a plataforma para aquele tenant.

#### Usuários Envolvidos
- CHURCH_ADMIN — Acesso completo
- SUPER_ADMIN (interno) — Visibilidade para suporte

#### Funcionalidades
- Cadastro e edição do perfil: nome oficial, nome fantasia, CNPJ/CPF, endereço completo, telefone, email institucional, site, redes sociais
- Upload de logotipo com pré-visualização (formatos: JPG, PNG, WebP; tamanho máximo: 2MB)
- Configuração de timezone (afeta exibição de datas e horas em toda a plataforma)
- Configuração de moeda padrão (afeta módulo financeiro)
- Configuração de idioma da plataforma (V1: apenas Português Brasil)
- Visualização de dados do plano ativo

#### Dependências
- MinIO (armazenamento de logotipo)
- Módulo de Autenticação (acesso restrito a CHURCH_ADMIN)
- Módulo de Billing (exibição de plano)

#### Critérios de Aceite
- [ ] Admin consegue atualizar qualquer campo do perfil institucional sem recarregar a página
- [ ] Upload de logotipo aceita apenas JPG, PNG e WebP com no máximo 2MB
- [ ] Logotipo é exibido no header da plataforma após upload
- [ ] Alteração de timezone reflete imediatamente nas datas de todos os módulos
- [ ] CNPJ/CPF não é campo obrigatório (igrejas informais não possuem)

---

### 4.3 Módulo: Gestão de Usuários

#### Objetivo
Controlar quem tem acesso à plataforma, com quais permissões, garantindo que cada usuário veja e faça apenas o que seu papel permite.

#### Usuários Envolvidos
- CHURCH_ADMIN — Gerencia todos os usuários do tenant
- DEPARTMENT_LEADER — Gerenciado por admin; pode ver membros do seu departamento
- Qualquer usuário autenticado — Gerencia próprio perfil

#### Papéis do Sistema (Roles)

| Role | Descrição |
|---|---|
| `SUPER_ADMIN` | Acesso interno da equipe Church Flow. Não é um role de church. |
| `CHURCH_ADMIN` | Administrador total do tenant. Acesso irrestrito a todos os módulos. |
| `TREASURER` | Acesso completo ao módulo financeiro. Leitura nos demais. |
| `SECRETARY` | Acesso a membros, eventos e departamentos. Sem acesso financeiro. |
| `DEPARTMENT_LEADER` | Acesso restrito ao seu departamento e membros vinculados. |
| `VIEWER` | Acesso somente leitura configurável por módulo. |

#### Funcionalidades

**Convites**
- CHURCH_ADMIN envia convite por email com papel pré-definido
- Email de convite contém link de ativação com validade de 7 dias
- Convite pode ser reenviado ou revogado antes da ativação
- Após aceitação, usuário define nome e senha na primeira tela
- Convites expirados não podem ser usados; requerem reenvio

**Gestão de Usuários**
- Listagem de todos os usuários do tenant com: nome, email, papel, status (ativo/inativo), último acesso
- Edição de papel de usuário existente
- Desativação de usuário (soft delete — acesso bloqueado, dados preservados)
- Reativação de usuário desativado
- Não é possível deletar usuários com registros vinculados (financeiro, auditoria)

**Perfil do Usuário**
- Edição de nome, foto de perfil (MinIO), telefone, cargo informal na igreja
- Alteração de senha (requer senha atual)
- Configuração de preferências de notificação pessoais

#### Dependências
- Resend (email de convite)
- MinIO (foto de perfil)
- Módulo de Auditoria (registra todas as alterações de usuários)
- Módulo de Departamentos (associação de DEPARTMENT_LEADER)

#### Critérios de Aceite
- [ ] Admin consegue convidar um novo usuário com papel específico em menos de 3 cliques
- [ ] Usuário convidado recebe email em até 2 minutos após o convite
- [ ] Link de convite expira após 7 dias e não pode ser reutilizado
- [ ] Admin não consegue remover o próprio papel de CHURCH_ADMIN
- [ ] Desativar um usuário bloqueia imediatamente todos os seus tokens ativos
- [ ] Usuário desativado não aparece em listas de seleção (ex: responsável por evento)
- [ ] Último CHURCH_ADMIN do tenant não pode ser desativado

---

### 4.4 Módulo: Departamentos

#### Objetivo
Organizar a estrutura operacional da igreja em departamentos e ministérios, agrupando **usuários do sistema** (colaboradores e líderes) para fins administrativos, financeiros e de controle de eventos. Não é um módulo de gestão pastoral de congregantes.

#### Usuários Envolvidos
- CHURCH_ADMIN / SECRETARY — Cadastro e gestão completa
- DEPARTMENT_LEADER — Visualização do próprio departamento e seus colaboradores
- Demais usuários — Visualização da estrutura (somente leitura)

#### Regras de Negócio
- Um departamento pode ter **múltiplos líderes**
- Todos os líderes de um departamento têm **permissões iguais** entre si dentro do departamento — não há hierarquia de líder principal vs. co-líder
- O papel `DEPARTMENT_LEADER` é atribuído no nível do sistema (role do usuário) e associado a um ou mais departamentos
- Colaboradores de um departamento são **usuários do sistema** (com conta ativa), não congregantes sem acesso

#### Funcionalidades
- Criação de departamentos com: nome, descrição, cor de identificação, status (ativo/inativo)
- Hierarquia de no máximo 2 níveis (departamento pai → sub-departamento)
- Atribuição de **múltiplos líderes** por departamento via tabela de associação (`department_leaders`)
- Vinculação de colaboradores (usuários do sistema) a departamentos — um colaborador pode estar em múltiplos departamentos
- Visualização em lista e em estrutura hierárquica (árvore)
- Histórico de líderes com data de entrada e saída
- Inativação de departamento preserva histórico (soft delete)

#### Dependências
- Módulo de Usuários (atribuição de líderes e colaboradores)
- Módulo de Auditoria

#### Critérios de Aceite
- [ ] Admin consegue criar um departamento e atribuir múltiplos líderes em menos de 2 minutos
- [ ] Sistema não permite mais de 2 níveis de hierarquia de departamentos
- [ ] Todos os líderes de um departamento têm as mesmas permissões — não existe distinção de hierarquia entre eles
- [ ] Inativar um departamento pai não inativa automaticamente os sub-departamentos — requer confirmação separada
- [ ] Um departamento pode ter zero líderes (criado sem líder atribuído ainda)
- [ ] Líder de departamento vê apenas os colaboradores do seu departamento, não de outros
- [ ] Estrutura de departamentos é exibida corretamente em dispositivos móveis

---

### 4.5 Módulo: Financeiro

#### Objetivo
Ser o módulo de maior valor percebido na V1. Substituir completamente as planilhas financeiras das igrejas com lançamentos confiáveis, categorização estruturada, relatórios automáticos e rastreabilidade total.

#### Usuários Envolvidos
- TREASURER — Acesso completo: lançamentos, relatórios, configurações
- CHURCH_ADMIN — Acesso completo
- SECRETARY — Leitura de relatórios (configurável)
- VIEWER — Somente leitura (configurável)
- DEPARTMENT_LEADER — Visualização dos lançamentos do seu departamento

#### Funcionalidades

**Contas Bancárias**
- Cadastro de múltiplas contas com: nome, banco, tipo (corrente, poupança, caixa físico), saldo inicial, data de abertura
- Saldo calculado automaticamente: saldo inicial + receitas - despesas
- Transferências entre contas (registra débito em uma e crédito na outra)
- Inativação de conta (histórico preservado)

**Categorias**
- Categorias de receita e despesa customizáveis por tenant
- Categorias padrão pré-criadas no onboarding: Dízimos, Ofertas, Missões, Aluguel, Salários, Manutenção, Eventos, etc.
- Cada categoria tem: nome, tipo (receita/despesa), cor, ícone, status
- Hierarquia de categorias (categoria pai → subcategoria, máximo 2 níveis)
- Categorias não podem ser deletadas se tiverem lançamentos vinculados — apenas inativadas

**Lançamentos de Receita**
- Campos obrigatórios: valor, data de competência, data de recebimento, categoria, conta bancária, descrição
- Campos opcionais: responsável (usuário), departamento, evento, observações, comprovante (upload)
- Tipos de receita: avulso, recorrente (diário, semanal, mensal, anual)
- Para recorrentes: data de início, data de fim (opcional), número de ocorrências

**Lançamentos de Despesa**
- Campos obrigatórios: valor, data de competência, data de pagamento, categoria, conta bancária, descrição
- Campos opcionais: fornecedor/beneficiário, número do documento, departamento, evento, observações, comprovante (upload)
- Tipos: avulso, recorrente
- Status: pago, pendente, cancelado

**Dashboard Financeiro**
- Cards de resumo: saldo total consolidado, receitas do mês, despesas do mês, resultado do mês (positivo/negativo)
- Gráfico de evolução de receitas vs. despesas (últimos 12 meses)
- Gráfico de distribuição de despesas por categoria (pizza/donut)
- Tabela de últimos lançamentos
- Filtro por período e por conta bancária

**Relatórios**
- DRE (Demonstrativo de Resultado): receitas e despesas agrupadas por categoria em um período
- Fluxo de Caixa: entradas e saídas ordenadas cronologicamente
- Extrato por conta bancária
- Lançamentos por categoria
- Lançamentos por departamento
- Lançamentos por evento
- Todos os relatórios exportáveis em PDF e CSV

**Upload de Comprovantes**
- Formatos aceitos: PDF, JPG, PNG (máximo 10MB por arquivo)
- Armazenamento via MinIO
- Visualização inline no detalhe do lançamento

#### Dependências
- MinIO (comprovantes)
- Módulo de Departamentos (associação de lançamentos)
- Módulo de Eventos (associação de lançamentos)
- Módulo de Auditoria (toda criação/edição/exclusão é auditada)

#### Critérios de Aceite
- [ ] Tesoureiro consegue lançar uma receita completa em menos de 45 segundos
- [ ] Saldo de cada conta é atualizado imediatamente após lançamento
- [ ] DRE é gerada corretamente para qualquer período selecionado
- [ ] Exportação de relatório em PDF é gerada em menos de 10 segundos
- [ ] Lançamento recorrente gera as ocorrências corretamente conforme configuração
- [ ] Comprovante anexado é acessível diretamente no detalhe do lançamento
- [ ] Nenhum lançamento com valor inválido (zero, negativo, não numérico) é aceito
- [ ] Relatórios refletem o timezone configurado pela igreja
- [ ] Exclusão de lançamento registra entrada no log de auditoria com dados anteriores preservados

---

### 4.6 Módulo: Patrimônio

#### Objetivo
Criar e manter um inventário completo dos bens da igreja com histórico de movimentações, manutenções e estado de conservação, eliminando a dependência de planilhas desatualizadas.

#### Usuários Envolvidos
- CHURCH_ADMIN / SECRETARY — Cadastro e gestão completa
- TREASURER — Visualização (impacto financeiro dos bens)
- VIEWER — Somente leitura

#### Funcionalidades

**Categorias de Bens**
- Categorias customizáveis: Imóveis, Veículos, Equipamentos de Som/Vídeo, Mobiliário, Instrumentos Musicais, Equipamentos de TI, Outros
- Novas categorias podem ser criadas pelo admin

**Cadastro de Bens**
- Campos obrigatórios: nome, categoria, data de aquisição, valor de aquisição
- Campos opcionais: descrição, marca, modelo, número de série, localização física, fornecedor, documento de compra (upload), estado de conservação (ótimo, bom, regular, ruim, inativo), observações
- Upload de até 5 fotos por bem (MinIO)
- Código interno de identificação (gerado automaticamente ou manual)

**Histórico de Movimentações**
- Transferência de localização: origem → destino, data, responsável, motivo
- Baixa do bem: data, motivo (perda, furto, doação, descarte), observações
- Doação de bem: destinatário, data, documento
- Cada movimentação é registrada e imutável

**Manutenções**
- Registro de manutenção realizada: data, descrição, custo, fornecedor
- Agendamento de próxima manutenção: data prevista, tipo, observações
- Alerta de manutenções vencidas e próximas do vencimento (notificação in-app)

**Relatórios**
- Inventário completo com filtros por categoria, localização, estado
- Bens com manutenção vencida
- Bens inativos (dados históricos)
- Exportável em PDF e CSV

#### Dependências
- MinIO (fotos e documentos)
- Módulo de Notificações (alertas de manutenção)
- Módulo de Auditoria

#### Critérios de Aceite
- [ ] Admin consegue cadastrar um bem completo com fotos em menos de 3 minutos
- [ ] Histórico de movimentações de um bem nunca é editável — apenas adicionado
- [ ] Alerta de manutenção vencida é disparado no dia do vencimento
- [ ] Bem com baixa registrada continua visível no histórico mas não aparece no inventário ativo
- [ ] Relatório de inventário reflete o estado atual de todos os bens ativos

---

### 4.7 Módulo: Eventos

#### Objetivo
Centralizar o planejamento, organização e acompanhamento de eventos da igreja, eliminando conflitos de agenda e permitindo controle operacional de presença e orçamento. O controle de presença deste módulo é estritamente operacional — registra participação em eventos cadastrados, não substitui acompanhamento pastoral individual ou controle de frequência congregacional.

#### Usuários Envolvidos
- CHURCH_ADMIN / SECRETARY — Criação e gestão completa
- DEPARTMENT_LEADER — Criação de eventos do seu departamento
- TREASURER — Visualização do orçamento de eventos
- Qualquer usuário autenticado — Visualização de eventos (conforme permissão)

#### Funcionalidades

**Criação de Eventos**
- Campos obrigatórios: nome, data/hora de início, data/hora de fim, tipo (culto, conferência, reunião, treinamento, outro)
- Campos opcionais: descrição, local, capacidade máxima, responsável, departamento organizador, observações, imagem de capa (MinIO)
- Status: rascunho, publicado, realizado, cancelado
- Detecção de conflitos: alerta se já existe evento no mesmo local no mesmo horário

**Orçamento de Evento**
- Definição de receitas previstas (entradas, ofertas, inscrições)
- Definição de despesas previstas (contratações, material, alimentação, etc.)
- Vinculação de lançamentos financeiros reais ao evento
- Comparativo previsto vs. realizado ao encerrar evento

**Controle de Presença**
- Lista de participantes esperados (membros vinculados ao evento)
- Check-in manual: marcar presença por participante
- Check-in em lote (marcar todos presentes)
- Registro de presença com timestamp
- Contagem em tempo real de presentes vs. capacidade

**Acompanhamento**
- Visualização em calendário (mensal e semanal)
- Visualização em lista
- Filtros por tipo, status, departamento, período
- Relatório de presença por evento exportável

#### Dependências
- Módulo de Financeiro (orçamento e lançamentos vinculados)
- Módulo de Departamentos (organização por ministério)
- Módulo de Usuários (responsáveis e participantes)
- Módulo de Notificações (alertas de conflito)
- MinIO (imagem de capa)
- Módulo de Auditoria

#### Critérios de Aceite
- [ ] Admin consegue criar um evento completo em menos de 2 minutos
- [ ] Sistema exibe alerta visível ao detectar conflito de agenda no mesmo local e horário
- [ ] Presença pode ser marcada individualmente ou em lote
- [ ] Relatório de presença mostra percentual de comparecimento
- [ ] Evento cancelado preserva histórico de presenças já registradas
- [ ] Orçamento previsto vs. realizado é calculado automaticamente com base nos lançamentos vinculados

---

### 4.8 Módulo: Notificações

#### Objetivo
Manter usuários informados sobre eventos relevantes do sistema sem exigir que fiquem verificando ativamente cada módulo.

#### Usuários Envolvidos
- Todos os usuários autenticados

#### Funcionalidades

**Notificações In-App**
- Central de notificações acessível pelo header (ícone com badge de não lidas)
- Tipos de notificação:
  - Convite recebido para acesso à plataforma
  - Bem com manutenção vencida
  - Evento próximo (1 dia de antecedência)
  - Falha de pagamento de assinatura
  - Novo usuário ativou conta (para CHURCH_ADMIN)
  - Lançamento financeiro acima de valor configurável (para TREASURER/CHURCH_ADMIN)
- Marcar como lida (individual e em lote)
- Marcar todas como lidas
- Notificações antigas arquivadas após 90 dias

**Notificações por Email (via Resend)**
- Convite de acesso (obrigatório — não pode ser desativado)
- Confirmação de cadastro (obrigatório)
- Recuperação de senha (obrigatório)
- Alerta de falha de pagamento (obrigatório)
- Alerta de manutenção de patrimônio (configurável)
- Resumo financeiro semanal (configurável)

**Preferências**
- Usuário pode ativar/desativar notificações não obrigatórias individualmente
- Preferências salvas por usuário, não por tenant

#### Dependências
- Resend (emails)
- Módulo de Patrimônio (alertas de manutenção)
- Módulo de Eventos (alertas de eventos próximos)
- Módulo de Financeiro (alertas de lançamentos)
- Módulo de Billing (alertas de pagamento)

#### Critérios de Aceite
- [ ] Badge do ícone de notificações reflete em tempo real o número de não lidas
- [ ] Email de convite é entregue em até 2 minutos após o envio
- [ ] Notificações obrigatórias (convite, reset de senha, falha de pagamento) não podem ser desativadas
- [ ] Usuário consegue desativar qualquer notificação não obrigatória de forma independente
- [ ] Notificações antigas (90+ dias) são arquivadas automaticamente sem impactar a central

---

### 4.9 Módulo: Auditoria

#### Objetivo
Garantir rastreabilidade completa de todas as ações realizadas na plataforma, criando um histórico imutável que suporta prestação de contas, investigação de incidentes e conformidade operacional.

#### Usuários Envolvidos
- CHURCH_ADMIN — Acesso completo ao histórico do seu tenant
- SUPER_ADMIN — Acesso transversal para suporte técnico
- Demais usuários — Sem acesso ao módulo de auditoria

#### Funcionalidades

**Registro de Auditoria**
Todo evento auditável gera um registro com:
- `id` — identificador único
- `tenant_id` — isolamento por church
- `user_id` — quem executou a ação
- `user_name` / `user_email` — snapshot do usuário no momento da ação
- `action` — CREATE, UPDATE, DELETE, LOGIN, LOGOUT, INVITE, REVOKE, etc.
- `module` — qual módulo gerou o evento
- `entity` — qual entidade foi afetada (ex: `financial_transaction`, `member`, `event`)
- `entity_id` — ID da entidade afetada
- `before` — snapshot JSON dos dados antes da alteração (null para CREATE)
- `after` — snapshot JSON dos dados após a alteração (null para DELETE)
- `ip_address` — IP de origem da requisição
- `user_agent` — identificador do browser/cliente
- `created_at` — timestamp UTC imutável

**Interface de Visualização**
- Listagem paginada de registros
- Filtros: usuário, módulo, ação, período (data início/fim)
- Busca por entidade ou ID
- Detalhe de cada registro com diff visual (before/after)
- Exportação em CSV para períodos selecionados

**Regras de Imutabilidade**
- Nenhum registro de auditoria pode ser editado ou deletado via sistema
- Não há endpoint de DELETE para registros de auditoria
- SUPER_ADMIN não pode deletar registros de outros tenants

#### Dependências
- Todos os módulos (geram eventos de auditoria)
- PostgreSQL (armazenamento persistente e imutável)

#### Critérios de Aceite
- [ ] Toda criação, edição e exclusão em qualquer módulo gera automaticamente um registro de auditoria
- [ ] Login e logout são registrados com IP e user-agent
- [ ] Nenhum endpoint da API permite deletar registros de auditoria
- [ ] CHURCH_ADMIN consegue filtrar auditoria por usuário, módulo e período
- [ ] Campos `before` e `after` nunca contêm dados sensíveis em texto plano (ex: senha hasheada não aparece em auditoria)
- [ ] Exportação CSV de 6 meses de auditoria é gerada em menos de 30 segundos

---

## 5. Fluxos Principais

---

### 5.1 Cadastro da Igreja

```
1. Visitante acessa a landing page
2. Clica em "Começar agora" ou "Criar conta"
3. Preenche formulário: nome da igreja, nome do responsável, email, senha, confirmação de senha
4. Aceita Termos de Uso e Política de Privacidade
5. Submete formulário
6. Sistema valida: email único, senha com requisitos mínimos, campos obrigatórios
7. Sistema cria o tenant (registro da church) com status "pending_verification"
8. Sistema cria o usuário com papel CHURCH_ADMIN vinculado ao tenant
9. Sistema envia email de confirmação via Resend com link de ativação (expiração: 24h)
10. Usuário recebe email e clica no link
11. Sistema ativa a conta e o tenant (status "trial")
12. Usuário é redirecionado para o onboarding: completar perfil da igreja
13. Sistema inicia período de trial (duração configurável)
14. Ao final do trial, sistema solicita dados de pagamento via Stripe
```

### 5.2 Assinatura

```
1. CHURCH_ADMIN acessa área de Billing
2. Visualiza planos disponíveis com características e preço
3. Seleciona o plano desejado
4. É redirecionado para checkout Stripe (Stripe Checkout ou Elements)
5. Preenche dados de cartão
6. Stripe processa o pagamento e retorna webhook de confirmação
7. Sistema recebe webhook, atualiza status do tenant para "active"
8. Sistema envia email de confirmação de assinatura via Resend
9. CHURCH_ADMIN é redirecionado para o dashboard com acesso completo
10. Em caso de falha: sistema exibe mensagem de erro, tenant permanece em trial ou bloqueado conforme status
```

### 5.3 Login

```
1. Usuário acessa /login
2. Preenche email e senha
3. Sistema valida credenciais contra hash Argon2
4. Em caso de falha: incrementa contador de tentativas; após 5 tentativas em 15min, bloqueia temporariamente
5. Em caso de sucesso: emite access token (JWT, 15min) e refresh token (7 dias, rotacionado)
6. Access token armazenado em memória (não em localStorage)
7. Refresh token armazenado em cookie HttpOnly, Secure, SameSite=Strict
8. Usuário é redirecionado para o dashboard do seu tenant
9. Requisições subsequentes enviam access token no header Authorization: Bearer <token>
10. Ao expirar o access token, cliente usa refresh token para obter novo par de tokens
11. Refresh token antigo é invalidado após uso (rotação)
```

### 5.4 Criação de Usuários (Convite)

```
1. CHURCH_ADMIN acessa Gestão de Usuários → Convidar usuário
2. Preenche: email do convidado, papel (role) a ser atribuído
3. Sistema valida: email não pertence a usuário já ativo neste tenant
4. Sistema cria registro de convite pendente com token único (expiração: 7 dias)
5. Sistema envia email de convite via Resend com link de ativação
6. Convite aparece na listagem com status "pendente"
7. Convidado clica no link do email
8. Sistema valida token: não expirado, não usado, pertence ao tenant correto
9. Convidado preenche formulário: nome completo, senha
10. Sistema cria o usuário vinculado ao tenant com o papel definido no convite
11. Token de convite é invalidado
12. Usuário é autenticado e redirecionado para o dashboard
13. CHURCH_ADMIN recebe notificação in-app de ativação do convite
```

### 5.5 Registro Financeiro

```
1. TREASURER ou CHURCH_ADMIN acessa módulo Financeiro
2. Clica em "Nova Receita" ou "Nova Despesa"
3. Preenche formulário com campos obrigatórios e opcionais
4. Opcionalmente faz upload de comprovante (PDF/imagem)
5. Sistema valida: valor positivo, data válida, categoria e conta existentes no tenant
6. Sistema salva o lançamento
7. Sistema atualiza o saldo da conta bancária selecionada
8. Sistema registra entrada no log de auditoria
9. Lançamento aparece no extrato e no dashboard imediatamente
10. Se vinculado a evento: orçamento do evento é atualizado automaticamente
```

### 5.6 Cadastro de Patrimônio

```
1. CHURCH_ADMIN ou SECRETARY acessa módulo Patrimônio
2. Clica em "Cadastrar Bem"
3. Preenche formulário: nome, categoria, data de aquisição, valor
4. Opcionalmente adiciona: número de série, localização, estado, fotos (até 5), documento de compra
5. Sistema valida campos obrigatórios
6. Sistema salva o bem com código interno gerado
7. Sistema registra entrada no log de auditoria
8. Bem aparece no inventário imediatamente
9. Se manutenção futura foi agendada: sistema programa alerta para a data
```

### 5.7 Criação de Evento

```
1. Usuário com permissão acessa módulo Eventos
2. Clica em "Novo Evento"
3. Preenche formulário: nome, tipo, data/hora início, data/hora fim
4. Sistema verifica conflito: existe evento no mesmo local e horário?
5. Se conflito detectado: exibe alerta com detalhes do conflito; usuário decide continuar ou ajustar
6. Preenche campos opcionais: local, capacidade, responsável, departamento, imagem, orçamento previsto
7. Define status inicial: rascunho ou publicado
8. Sistema salva o evento
9. Sistema registra entrada no log de auditoria
10. Evento aparece no calendário e na listagem imediatamente
```

---

## 6. Requisitos Funcionais

### RF — Autenticação e Segurança

| ID | Requisito |
|---|---|
| RF-001 | O sistema deve permitir cadastro de nova conta com nome da igreja, nome do responsável, email e senha |
| RF-002 | O sistema deve validar que o email de cadastro é único no banco de dados |
| RF-003 | O sistema deve exigir confirmação de email antes de permitir acesso à plataforma |
| RF-004 | O sistema deve autenticar usuários via email e senha com hash Argon2id |
| RF-005 | O sistema deve emitir access token JWT com TTL de 15 minutos |
| RF-006 | O sistema deve emitir refresh token com TTL de 7 dias, rotacionado a cada uso |
| RF-007 | O sistema deve armazenar refresh tokens em cookie HttpOnly, Secure, SameSite=Strict |
| RF-008 | O sistema deve bloquear temporariamente o login após 5 tentativas falhas em 15 minutos por IP/email |
| RF-009 | O sistema deve permitir recuperação de senha via link de token único enviado por email |
| RF-010 | Link de recuperação de senha deve expirar em 1 hora e ser inválido após primeiro uso |
| RF-011 | O sistema deve invalidar todos os refresh tokens do usuário após reset de senha |
| RF-012 | Mensagem de erro de login não deve informar se o email ou a senha estão incorretos separadamente |

### RF — Multi-Tenancy

| ID | Requisito |
|---|---|
| RF-013 | Todos os dados da plataforma devem ser isolados por tenant via `church_id` |
| RF-014 | Nenhuma requisição autenticada deve acessar dados de outro tenant |
| RF-015 | Um usuário pertence a **exatamente uma igreja**. Acesso a múltiplas igrejas requer contas separadas. Não há troca de tenant na V1. |
| RF-016 | O tenant do usuário autenticado é resolvido a partir do seu próprio registro — não via seleção na sessão |
| RF-017 | Status do tenant (trial, active, suspended, cancelled) deve ser verificado em cada requisição autenticada |
| RF-017a | Tenant com status `suspended` ou `cancelled` tem **acesso totalmente bloqueado** à plataforma — o CHURCH_ADMIN deve contatar o suporte da Church Flow para regularização |
| RF-017b | Toda movimentação financeira pertence obrigatoriamente a uma igreja (`church_id` não nulo e não editável após criação) |
| RF-017c | Uma assinatura ativa (status `trial` ou `active`) é requisito obrigatório para acesso à plataforma |

### RF — RBAC e Permissões

| ID | Requisito |
|---|---|
| RF-018 | O sistema deve implementar papéis: SUPER_ADMIN, CHURCH_ADMIN, TREASURER, SECRETARY, DEPARTMENT_LEADER, VIEWER |
| RF-019 | Permissões devem ser verificadas a nível de endpoint (guard) e a nível de serviço |
| RF-020 | CHURCH_ADMIN tem acesso irrestrito a todos os módulos do seu tenant |
| RF-021 | TREASURER tem acesso completo ao módulo financeiro e leitura nos demais |
| RF-022 | SECRETARY tem acesso a membros, departamentos e eventos; sem acesso a dados financeiros completos |
| RF-023 | DEPARTMENT_LEADER tem acesso restrito ao próprio departamento e seus membros |
| RF-024 | VIEWER tem acesso somente leitura configurável por módulo pelo CHURCH_ADMIN |
| RF-025 | O último CHURCH_ADMIN de um tenant não pode ser desativado ou ter seu papel alterado |

### RF — Gestão da Igreja

| ID | Requisito |
|---|---|
| RF-026 | O sistema deve permitir cadastro e edição do perfil institucional da igreja |
| RF-027 | O sistema deve suportar upload de logotipo (JPG, PNG, WebP; máx 2MB) via MinIO |
| RF-028 | Configuração de timezone deve afetar exibição de datas e horas em toda a plataforma |
| RF-029 | CNPJ/CPF não deve ser campo obrigatório no perfil da igreja |

### RF — Gestão de Usuários

| ID | Requisito |
|---|---|
| RF-030 | CHURCH_ADMIN deve poder convidar usuários por email com papel pré-definido |
| RF-031 | Convite deve ter validade de 7 dias e ser inválido após uso |
| RF-032 | Convite não utilizado deve poder ser reenviado ou revogado pelo CHURCH_ADMIN |
| RF-033 | Usuário convidado deve definir nome e senha na primeira tela de ativação |
| RF-034 | CHURCH_ADMIN deve poder desativar usuários (acesso imediatamente bloqueado) |
| RF-035 | CHURCH_ADMIN deve poder reativar usuários desativados |
| RF-036 | Usuário não pode ser excluído se tiver registros vinculados em outros módulos |
| RF-037 | Desativação de usuário deve invalidar todos os seus tokens ativos |
| RF-038 | O sistema deve registrar data e hora do último acesso de cada usuário |
| RF-039 | Usuário deve poder editar próprio perfil (nome, foto, telefone) |
| RF-040 | Alteração de senha deve exigir a senha atual |

### RF — Departamentos

| ID | Requisito |
|---|---|
| RF-041 | O sistema deve permitir criação de departamentos com nome, descrição e status |
| RF-042 | Hierarquia de departamentos deve ser limitada a 2 níveis (pai → filho) |
| RF-043 | Um departamento pode ter **múltiplos líderes**; todos com permissões iguais entre si |
| RF-044 | Um usuário (colaborador) pode estar vinculado a múltiplos departamentos simultaneamente |
| RF-044a | DEPARTMENT_LEADER tem acesso restrito aos dados do seu departamento; não vê outros departamentos |
| RF-045 | Inativação de departamento deve preservar histórico (soft delete) |
| RF-046 | O sistema deve registrar histórico de líderes por departamento com data de entrada e saída |
| RF-046a | Um departamento pode existir sem líder atribuído |

### RF — Financeiro

| ID | Requisito |
|---|---|
| RF-047 | O sistema deve permitir lançamento de receitas com valor, data, categoria, conta bancária e descrição |
| RF-048 | O sistema deve permitir lançamento de despesas com valor, data, categoria, conta bancária e descrição |
| RF-049 | O sistema deve suportar categorias de receita e despesa customizáveis por tenant |
| RF-050 | O sistema deve calcular e exibir saldo atualizado de cada conta bancária em tempo real |
| RF-051 | O sistema deve suportar múltiplas contas bancárias por tenant |
| RF-052 | O sistema deve suportar transferências entre contas internas do tenant |
| RF-053 | O sistema deve suportar lançamentos recorrentes (diário, semanal, mensal, anual) |
| RF-054 | Lançamentos podem ser vinculados a um evento ou departamento específico |
| RF-055 | O sistema deve gerar DRE por período selecionado |
| RF-056 | O sistema deve gerar extrato de fluxo de caixa por período e conta |
| RF-057 | Relatórios financeiros devem ser exportáveis em PDF e CSV |
| RF-058 | O sistema deve suportar upload de comprovantes (PDF, JPG, PNG; máx 10MB) via MinIO |
| RF-059 | Nenhum lançamento com valor zero, negativo ou não numérico deve ser aceito |
| RF-060 | Exclusão de lançamento deve ser registrada no log de auditoria com snapshot dos dados |

### RF — Patrimônio

| ID | Requisito |
|---|---|
| RF-061 | O sistema deve permitir cadastro de bens com nome, categoria, data e valor de aquisição |
| RF-062 | O sistema deve suportar upload de até 5 fotos por bem via MinIO |
| RF-063 | O sistema deve registrar histórico imutável de movimentações de cada bem |
| RF-064 | O sistema deve suportar registro de manutenções realizadas e agendamento de futuras |
| RF-065 | O sistema deve gerar alerta de manutenção vencida na data de vencimento |
| RF-066 | Bem com baixa registrada deve permanecer visível no histórico mas fora do inventário ativo |
| RF-067 | Relatório de inventário deve ser exportável em PDF e CSV |

### RF — Eventos

| ID | Requisito |
|---|---|
| RF-068 | O sistema deve permitir criação de eventos com nome, tipo, data/hora de início e fim |
| RF-069 | O sistema deve detectar e alertar sobre conflitos de agenda no mesmo local e horário |
| RF-070 | Eventos devem ter status: rascunho, publicado, realizado, cancelado |
| RF-071 | O sistema deve suportar definição de orçamento previsto por evento |
| RF-072 | Lançamentos financeiros vinculados ao evento devem compor o orçamento realizado automaticamente |
| RF-073 | O sistema deve suportar controle de presença com check-in manual por participante |
| RF-074 | Eventos devem ser visualizáveis em formato calendário e lista |

### RF — Notificações

| ID | Requisito |
|---|---|
| RF-075 | O sistema deve exibir notificações in-app com badge de contagem de não lidas |
| RF-076 | Usuário deve poder marcar notificações como lidas individualmente ou em lote |
| RF-077 | Emails obrigatórios (convite, reset de senha, falha de pagamento) não podem ser desativados |
| RF-078 | Usuário deve poder ativar/desativar individualmente cada tipo de notificação não obrigatória |
| RF-079 | Notificações com mais de 90 dias devem ser arquivadas automaticamente |

### RF — Auditoria

| ID | Requisito |
|---|---|
| RF-080 | Toda criação, edição ou exclusão em qualquer módulo deve gerar registro de auditoria |
| RF-081 | Login e logout de usuários devem ser registrados com IP e user-agent |
| RF-082 | Registro de auditoria deve conter: usuário, ação, módulo, entidade, before, after, IP, timestamp |
| RF-083 | Nenhum registro de auditoria deve ser editável ou deletável por qualquer papel de usuário |
| RF-084 | CHURCH_ADMIN deve poder filtrar auditoria por usuário, módulo, ação e período |
| RF-085 | Exportação de auditoria deve estar disponível em CSV |
| RF-086 | Dados sensíveis (hashes de senha, tokens) não devem aparecer nos registros de auditoria |

### RF — Assinaturas e Billing

| ID | Requisito |
|---|---|
| RF-087 | O sistema deve integrar com Stripe para criação e gestão de assinaturas recorrentes |
| RF-088 | Plano de assinatura deve ser vinculado ao tenant (`church_id`) |
| RF-089 | O sistema deve suportar período de trial configurável antes da primeira cobrança |
| RF-090 | Uma assinatura ativa (status `trial` ou `active`) é **obrigatória** para acesso à plataforma — sem assinatura ativa, nenhuma rota autenticada é acessível |
| RF-091 | Tenant com assinatura `suspended` ou `cancelled` tem **acesso totalmente bloqueado** — o CHURCH_ADMIN deve entrar em contato com o suporte da Church Flow para regularização |
| RF-092 | CHURCH_ADMIN deve poder atualizar dados de pagamento via Stripe Customer Portal |
| RF-093 | O sistema deve processar webhooks Stripe para atualizar status de assinatura em tempo real |
| RF-094 | O sistema deve registrar histórico de faturas acessível ao CHURCH_ADMIN |
| RF-095 | Em caso de falha de pagamento, sistema deve enviar notificação por email ao CHURCH_ADMIN antes da suspensão |
| RF-096 | Período de graça após falha de pagamento deve ser configurável antes do bloqueio definitivo |

---

## 7. Requisitos Não Funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-001 | Segurança | Toda comunicação deve usar HTTPS; não há fallback para HTTP em produção |
| RNF-002 | Segurança | Senhas devem ser armazenadas com hash Argon2id; nunca em texto plano ou MD5/SHA1 |
| RNF-003 | Segurança | Access tokens JWT devem ter TTL máximo de 15 minutos |
| RNF-004 | Segurança | Refresh tokens devem ser rotacionados a cada uso e invalidados imediatamente após uso |
| RNF-005 | Segurança | Cookies de autenticação devem ter flags HttpOnly, Secure e SameSite=Strict |
| RNF-006 | Segurança | Rate limiting deve ser aplicado em todas as rotas de autenticação |
| RNF-007 | Segurança | Headers de segurança HTTP devem estar configurados: HSTS, X-Content-Type-Options, X-Frame-Options, CSP |
| RNF-008 | Segurança | Uploads de arquivo devem ter validação de tipo MIME e tamanho máximo aplicados no servidor |
| RNF-009 | Segurança | RBAC deve ser verificado a nível de endpoint e a nível de serviço (defense in depth) |
| RNF-010 | Segurança | Dados sensíveis não devem ser logados em texto plano em nenhum nível |
| RNF-011 | Segurança | CORS deve ser configurado explicitamente para permitir apenas origens autorizadas |
| RNF-012 | Performance | API deve responder em menos de 500ms para operações CRUD comuns (p95) |
| RNF-013 | Performance | Dashboard financeiro deve carregar dados completos em menos de 2 segundos |
| RNF-014 | Performance | Geração de relatório PDF deve ser concluída em menos de 10 segundos para volumes típicos |
| RNF-015 | Performance | Queries ao banco de dados devem ter explain plan analisado para rotas de alto volume |
| RNF-016 | Disponibilidade | Uptime mínimo de 99,5% medido mensalmente em produção |
| RNF-017 | Disponibilidade | Janelas de manutenção devem ser realizadas fora do horário de pico (domingo não é janela válida) |
| RNF-018 | Escalabilidade | A arquitetura deve suportar escalabilidade horizontal via containerização (Docker) |
| RNF-019 | Escalabilidade | O isolamento row-level por tenant não deve exigir mudanças de schema para adicionar novos tenants |
| RNF-020 | Dados | Backup automático do banco de dados a cada 24 horas com retenção mínima de 30 dias |
| RNF-021 | Dados | Restore de backup deve ser testado ao menos mensalmente |
| RNF-022 | Dados | Soft delete deve ser o padrão para todas as entidades com dados históricos relevantes |
| RNF-023 | Dados | Logs de auditoria devem ser imutáveis e não passíveis de exclusão via sistema |
| RNF-024 | Frontend | Interface deve ser responsiva para viewports de 320px a 2560px |
| RNF-025 | Frontend | Score mínimo de 90 no Lighthouse para Performance e Accessibility |
| RNF-026 | Frontend | Suporte a Chrome, Firefox, Safari e Edge nas duas últimas versões estáveis |
| RNF-027 | Frontend | Todas as ações destrutivas (exclusão, desativação) devem exigir confirmação explícita do usuário |
| RNF-028 | Observabilidade | Logs de aplicação estruturados (JSON) com níveis: DEBUG, INFO, WARN, ERROR |
| RNF-029 | Observabilidade | Métricas de performance e disponibilidade coletadas via Prometheus e visualizadas no Grafana |
| RNF-030 | Observabilidade | Alertas automáticos configurados para: downtime, taxa de erro acima de 1%, latência acima de 2s (p99) |

---

## 8. Critérios de Aceite da V1

A V1 pode ser considerada pronta para produção quando **todos** os critérios abaixo forem satisfeitos:

### Funcionalidade
- [ ] Todos os módulos listados no Escopo da V1 (seção 2) estão implementados e funcionais
- [ ] Todos os fluxos principais (seção 5) funcionam ponta a ponta sem erros
- [ ] Todos os requisitos funcionais (seção 6) foram implementados e verificados
- [ ] Não há bugs críticos ou bloqueantes abertos
- [ ] Não há bugs de isolamento de tenant (dados de um tenant visíveis para outro)

### Segurança
- [ ] Autenticação JWT com refresh token rotacionado está funcionando corretamente
- [ ] RBAC está aplicado em todos os endpoints sem exceção
- [ ] Rate limiting está ativo nas rotas de autenticação
- [ ] Todos os headers de segurança HTTP estão configurados
- [ ] Nenhuma rota pública expõe dados de tenant
- [ ] Revisão de segurança manual realizada antes do deploy

### Performance
- [ ] Tempo de resposta da API está dentro dos limites definidos em RNF-012 a RNF-014
- [ ] Score Lighthouse ≥ 90 em Performance e Accessibility na versão de produção

### Infraestrutura
- [ ] Ambiente de produção configurado com Docker Compose ou equivalente
- [ ] HTTPS configurado com certificado válido (Let's Encrypt ou similar)
- [ ] Backup automático configurado e testado (restore validado)
- [ ] Monitoramento Prometheus + Grafana operacional com alertas configurados
- [ ] Logs estruturados sendo coletados e retidos

### Integrações
- [ ] Stripe: criação de assinatura, webhooks de pagamento e Customer Portal funcionando em produção
- [ ] Resend: todos os emails transacionais funcionando com templates validados
- [ ] MinIO: upload e servição de arquivos funcionando corretamente

### Qualidade
- [ ] Testes automatizados com cobertura mínima de 70% na camada de serviço
- [ ] Testes de integração para os fluxos críticos (auth, billing, financeiro)
- [ ] Documentação de deploy atualizada e validada por alguém que não desenvolveu

### Produto
- [ ] Onboarding de nova conta funciona de forma autônoma (sem intervenção manual da equipe)
- [ ] CHURCH_ADMIN consegue completar o onboarding em menos de 10 minutos
- [ ] Pelo menos 2 usuários reais (beta testers) validaram os fluxos principais

---

## 9. Dependências Técnicas

| Serviço | Finalidade | Criticidade |
|---|---|---|
| **PostgreSQL** | Banco de dados principal | Crítica — sem alternativa |
| **Stripe** | Assinaturas, billing, Customer Portal, webhooks de pagamento | Crítica — bloqueia monetização |
| **Resend** | Emails transacionais (convites, reset, alertas, onboarding) | Crítica — bloqueia convites e auth |
| **MinIO** | Armazenamento de arquivos: logos, fotos, comprovantes, documentos | Alta — funcionalidades degradadas sem MinIO |
| **Prometheus** | Coleta de métricas de aplicação e infraestrutura | Média — observabilidade pode ser simplificada no início |
| **Grafana** | Visualização de métricas e dashboards operacionais | Média — pode ser adicionado pós-lançamento em caso de atraso |
| **Nginx** | Reverse proxy, terminação SSL, roteamento | Crítica em produção |
| **Docker / Docker Compose** | Containerização e orquestração do ambiente | Crítica — padrão de deploy |

### Decisões de Integração

**Stripe**
- Utilizar Stripe Checkout para o fluxo de assinatura (menor esforço de implementação, PCI-compliant)
- Utilizar Stripe Customer Portal para gestão de pagamento (sem reescrever UI de billing)
- Implementar endpoint de webhook para eventos: `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
- Stripe identifica o tenant via `metadata.church_id` no Customer

**Resend**
- Todos os templates de email devem ser versionados no repositório
- Utilizar domínio próprio para envio (não `resend.dev`) para credibilidade e deliverability

**MinIO**
- Bucket separado por tipo de asset (logos, comprovantes, fotos-patrimônio, fotos-perfil)
- URLs de arquivos devem ser pré-assinadas com TTL para evitar exposição pública permanente
- Limite de tamanho aplicado tanto no frontend quanto no backend

---

## 10. Dúvidas e Decisões Pendentes

Os itens abaixo precisam ser definidos antes da modelagem do banco de dados e início da implementação. Cada item em aberto pode gerar retrabalho de schema se não for decidido a priori.

| # | Questão | Impacto | Urgência |
|---|---|---|---|
### Decisões Resolvidas

| # | Decisão | Resolução |
|---|---|---|
| DEC-R01 | **Usuário pertence a quantas igrejas?** | Exatamente **uma**. Acesso multi-igreja requer contas separadas. |
| DEC-R02 | **Hierarquia entre líderes de departamento?** | Não existe. Todos os líderes de um departamento têm **permissões iguais**. |
| DEC-R03 | **Acesso durante suspensão de assinatura?** | **Bloqueio total**. Regularização via contato com suporte da Church Flow. |
| DEC-R04 | **Gestão de membros da congregação na V1?** | **Fora do escopo**. V1 gerencia apenas usuários do sistema organizados em departamentos. |

### Decisões Pendentes

| # | Questão | Impacto | Urgência |
|---|---|---|---|
| DEC-001 | **Duração do trial period** — 7, 14 ou 30 dias? | Lógica de status do tenant, webhooks Stripe | Alta |
| DEC-002 | **Período de graça após inadimplência** — quantos dias antes do bloqueio? | Lógica de acesso do tenant, notificações | Alta |
| DEC-003 | **Identificação do tenant na requisição** — subdomain (`tenant.churchflow.app`), path (`/t/tenant-id`) ou header (`X-Tenant-ID`)? | Arquitetura de roteamento, URL pattern, SEO | Alta |
| DEC-004 | **Política de senha** — requisitos mínimos (comprimento, complexidade)? | Validação em frontend e backend | Média |
| DEC-005 | **Retenção de logs de auditoria** — indefinida ou com política de arquivamento após X anos? | Schema e estratégia de particionamento | Média |
| DEC-006 | **Soft delete para usuários (LGPD)** — usuário desativado mantém dados indefinidamente ou anonimiza após X meses? | LGPD, schema de usuários | Alta |
| DEC-007 | **Multi-idioma (i18n)** — V1 apenas PT-BR ou estrutura i18n desde o início? | Arquitetura de strings no frontend | Média |
| DEC-008 | **Limite de usuários por plano** — cada plano terá teto de usuários do sistema? | Schema de planos, lógica de convite | Alta |
| DEC-009 | **Cota de armazenamento MinIO por tenant** — existe limite por plano? | Schema de planos, lógica de upload | Média |
| DEC-010 | **Domínio de produção** — `churchflow.com.br`? Afeta email, Stripe e certificados | Infraestrutura, DNS, Resend sender | Alta |
| DEC-011 | **Exportação de dados (LGPD)** — admin pode solicitar exportação completa do tenant? | Requisito legal, feature de compliance | Média |
| DEC-012 | **Categorias financeiras padrão** — quais categorias são pré-criadas no onboarding? | Seed de dados, onboarding experience | Baixa |
| DEC-013 | **Nomenclatura de planos no Stripe** — nomes dos produtos no Stripe (afeta metadata e webhooks) | Integração Stripe | Alta |
| DEC-014 | **Fluxo de suporte para suspensão** — qual o canal e SLA para CHURCH_ADMIN regularizar assinatura suspensa? | Experiência do cliente, churn risk | Alta |

---

## Revisão Final: Inconsistências, Riscos e Recomendações

### Inconsistências Identificadas
Nenhuma inconsistência crítica foi encontrada neste documento. Os módulos são coesos e as dependências entre eles são explícitas.

### Riscos de Produto

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Módulo financeiro subestimado em complexidade | Alta | Alto | Iniciar implementação do financeiro antes dos demais módulos; é o coração do produto |
| Integração Stripe com webhooks instável em desenvolvimento | Média | Alto | Usar Stripe CLI para testar webhooks localmente desde o dia 1 |
| Scope creep durante desenvolvimento | Alta | Alto | Congelar escopo V1 formalmente após aprovação deste PRD |
| Auditoria mal implementada e com gaps | Média | Alto | Implementar auditoria como cross-cutting concern (interceptor), não módulo manual por módulo |
| LGPD não considerada suficientemente | Média | Alto | Resolver DEC-006 e DEC-011 antes de colocar dados reais de membros em produção |

### Gargalos Futuros Antecipados

1. **Relatórios financeiros com grandes volumes** — DRE de 5 anos com milhares de lançamentos pode ser lenta. Antecipar uso de views materializadas ou agregações pré-calculadas.
2. **Logs de auditoria** — Tabela crescerá indefinidamente. Planejar particionamento por `created_at` desde o design do schema.
3. **Upload de arquivos sem cota** — MinIO sem limites por tenant pode gerar custo operacional desproporcional. Resolver DEC-009 antes do lançamento.
4. **Notificações in-app sem WebSocket** — Polling frequente para atualizar badge degrada performance. Avaliar Server-Sent Events (SSE) desde a V1.

### Recomendações de Arquitetura para as Próximas Fases

1. **Auditoria como Interceptor NestJS** — Implementar `AuditInterceptor` que captura automaticamente CREATE/UPDATE/DELETE em todas as rotas, eliminando a necessidade de código de auditoria em cada service.
2. **Tenant Context como middleware** — Resolver e injetar `TenantContext` (church_id, plan, status) em toda a cadeia de request via NestJS middleware. Todas as queries automaticamente filtradas por church_id via camada de repositório.
3. **Event-driven para notificações** — Usar NestJS EventEmitter (e futuramente BullMQ) para desacoplar geração de eventos de negócio do envio de notificações. Evita acoplamento e facilita escala.
4. **Stripe Checkout sobre Stripe Elements** — Menor responsabilidade de PCI compliance e menos código para V1. Pode ser substituído por Elements em V2 se necessário.
5. **Schema versionado desde o início** — Toda migration Prisma deve ser nomeada e revisada antes de aplicar em produção. Nunca fazer edits em migrations já aplicadas.

---

## Aprovação

| Papel | Responsável | Status |
|---|---|---|
| Product Manager | — | Aguardando revisão |
| Software Architect | — | Aguardando revisão |
| Backend Lead | — | Aguardando revisão |
| Frontend Lead | — | Aguardando revisão |
| DevOps & Security | — | Aguardando revisão |
| Stakeholder / Founder | — | Aguardando revisão |

---

*Próximo documento: `02-business-rules.md`*  
*Dependência: Aprovação deste documento.*
