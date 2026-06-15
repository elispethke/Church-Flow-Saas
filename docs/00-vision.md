# Church Flow — Vision Document

**Versão:** 1.1  
**Status:** Aprovado  
**Data:** 2026-06-15  
**Responsável:** Product Manager + Software Architect  

---

## 1. Declaração de Visão

> **Ser a plataforma operacional de referência para igrejas que levam gestão a sério — unificando financeiro, membros, eventos, patrimônio e comunicação em um único sistema seguro, intuitivo e confiável.**

---

## 2. O Problema

### 2.1 Contexto de Mercado

O Brasil abriga mais de **180.000 igrejas registradas** segundo dados do IBGE, com crescimento consistente do segmento evangélico nas últimas duas décadas. A grande maioria dessas organizações opera com:

- Planilhas Excel para controle financeiro
- WhatsApp como ferramenta de comunicação oficial
- Papel físico para cadastro de membros
- Sistemas isolados e desconectados (um app para dízimos, outro para agenda, nenhum para patrimônio)
- Ausência total de auditoria e rastreabilidade

### 2.2 Dores Específicas

| Dor | Impacto |
|---|---|
| Sem controle financeiro centralizado | Igrejas não sabem sua posição financeira real em tempo real |
| Membros desatualizados | Dificuldade de comunicação, perda de engajamento, dados imprecisos |
| Eventos gerenciados manualmente | Conflitos de agenda, falhas operacionais, sem métricas de presença |
| Patrimônio sem rastreamento | Perda de bens, falta de controle de manutenção, sem depreciação |
| Falta de transparência financeira | Desconfiança dos membros, risco reputacional para liderança |
| Múltiplos sistemas desconectados | Retrabalho, inconsistências, custo operacional alto |
| Ausência de histórico e auditoria | Vulnerabilidade a fraudes internas, impossibilidade de prestação de contas |

### 2.3 Por Que o Problema Persiste

As soluções existentes no mercado brasileiro falham em pelo menos um dos seguintes aspectos:

- **Muito genéricas:** ERPs corporativos como Omie ou ContaAzul não entendem a linguagem nem os fluxos de uma igreja
- **Muito simples:** Apps de dízimo ou controle de presença resolvem um problema e ignoram os demais
- **UX ruim:** Sistemas legados com interfaces dos anos 2000, sem mobile, sem dark mode, sem performance
- **Sem multi-tenancy real:** Soluções instaladas localmente por congregação, sem unificação para redes/denominações
- **Sem segurança adequada:** Dados sensíveis de membros (saúde, família, finanças pessoais) sem proteção adequada

---

## 3. A Solução

**Church Flow** é um SaaS multi-tenant para gestão administrativa de igrejas que unifica em uma única plataforma:

- **Gestão Financeira** — Receitas, despesas, DRE, fluxo de caixa, dízimos e ofertas
- **Gestão de Membros** — Cadastro completo, histórico pastoral, grupos e departamentos
- **Eventos** — Agenda, inscrições, controle de presença, capacidade
- **Patrimônio** — Inventário, localização, manutenção, depreciação
- **Usuários e Permissões** — RBAC granular por papel e módulo
- **Comunicação** — Notificações, avisos por email e push
- **Relatórios e Auditoria** — Transparência total, rastreabilidade de ações

A plataforma é construída sobre princípios de **segurança desde o design**, **isolamento completo entre tenants**, e **experiência premium** — referenciando produtos como Linear, Stripe e Vercel em qualidade de interface.

---

## 4. Público-Alvo

### 4.1 Segmento Primário (V1)

**Igrejas independentes e congregações de médio porte**

- 200 a 2.000 membros ativos
- Estrutura administrativa com pastor, secretaria e tesouraria
- Já tentaram usar planilhas ou sistemas genéricos e falharam
- Dispostos a pagar por uma solução que funcione

### 4.2 Segmento Secundário (V2+)

**Redes e denominações com múltiplas congregações**

- Visão consolidada de todas as filiais
- Controle hierárquico de permissões por congregação
- Relatórios consolidados de rede

### 4.3 Personas

**Tesoureiro** _(usuário primário — maior impacto direto do produto)_
- Nome representativo: Marcos, 38 anos
- Papel na igreja: responsável por toda a gestão financeira — receitas, despesas, prestação de contas ao conselho e à congregação
- Frequência de uso: diária a semanal
- Contexto atual: opera com planilhas Excel desorganizadas, sem histórico confiável, sem fluxo de caixa em tempo real
- Maiores dores:
  - Fecha o mês com dias de retrabalho manual reconciliando entradas e saídas
  - Não consegue gerar relatórios financeiros claros para apresentar ao pastor e ao conselho sem horas de formatação
  - Não tem rastreabilidade de quem lançou o quê — vulnerável a questionamentos internos
  - Dificuldade para distinguir receitas por categoria (dízimos, ofertas especiais, eventos)
- O que precisa do Church Flow:
  - Lançamento rápido de receitas e despesas com categorização clara
  - DRE e fluxo de caixa gerados automaticamente
  - Histórico completo e auditável de todas as movimentações
  - Exportação de relatórios para apresentações ao conselho
  - Controle de contas bancárias e conciliação simplificada
- Critério de sucesso desta persona: fechar o mês financeiro em menos de 2 horas com dados confiáveis

---

**Pastor / Líder Principal**
- Nome representativo: Pr. Ricardo, 52 anos
- Papel na igreja: liderança pastoral e estratégica, representa a organização perante a congregação
- Frequência de uso: semanal (consultas e relatórios)
- Contexto atual: depende de reuniões e conversas informais para entender a situação administrativa
- Maiores dores:
  - Não tem visibilidade do financeiro sem perguntar ao tesoureiro
  - Não consegue apresentar dados concretos à congregação de forma confiável
  - Toma decisões estratégicas sem informação estruturada
- O que precisa do Church Flow:
  - Dashboard executivo com visão consolidada dos módulos
  - Alertas automáticos para situações anômalas (gastos fora do padrão, queda de arrecadação)
  - Relatórios prontos para reuniões de conselho e assembleias
- Critério de sucesso desta persona: ter visão completa da saúde administrativa da igreja em menos de 5 minutos por semana

---

**Secretária Administrativa**
- Nome representativo: Ana, 29 anos
- Papel na igreja: operação diária — cadastro de membros, agendamento de eventos, comunicações
- Frequência de uso: diária
- Contexto atual: usa WhatsApp, Google Sheets e papel físico em paralelo
- Maiores dores:
  - Retrabalho constante por falta de sistema único
  - Dificuldade para encontrar informações de membros rapidamente
  - Agendamento de eventos manual, sem controle de capacidade ou conflitos
- O que precisa do Church Flow:
  - Cadastro e busca rápida de membros
  - Gestão de eventos com controle de presença
  - Fluxos de trabalho simples, sem cliques desnecessários
- Critério de sucesso desta persona: executar tarefas diárias sem precisar consultar papel ou planilha

---

**Líder de Departamento**
- Nome representativo: Carla, 34 anos
- Papel na igreja: responsável por um ministério (jovens, louvor, missões, etc.)
- Frequência de uso: semanal
- Contexto atual: depende da secretaria para qualquer informação sobre seu grupo
- Maiores dores:
  - Sem autonomia para acessar dados do seu departamento
  - Não consegue planejar eventos ou atividades sem intermediários
- O que precisa do Church Flow:
  - Acesso restrito e seguro às informações do seu departamento
  - Gestão de membros do seu grupo
  - Comunicação direta com os membros do ministério
- Critério de sucesso desta persona: autonomia para operar seu ministério sem depender da secretaria para tarefas básicas

---

## 5. Proposta de Valor

| Para | Que | Church Flow é | Diferente de |
|---|---|---|---|
| Igrejas de médio porte | Precisam de gestão administrativa real | Uma plataforma integrada, segura e intuitiva | Planilhas, apps isolados e ERPs genéricos |

**Três pilares da proposta de valor:**

1. **Tudo em um lugar** — Financeiro, membros, eventos e patrimônio integrados, sem importação manual entre sistemas
2. **Transparência e Confiança** — Auditoria completa, histórico imutável, prestação de contas facilitada
3. **Experiência que respeita o usuário** — Interface premium, rápida, sem curva de aprendizado absurda

---

## 6. Modelo de Negócio

### 6.1 Estratégia de Monetização

O modelo comercial do Church Flow será baseado em **assinatura recorrente (mensal/anual)**, com estrutura de planos segmentada por porte e complexidade operacional da igreja.

O detalhamento de planos, faixas de preço e política de desconto será definido após:

- Análise competitiva dos players existentes no mercado brasileiro e internacional
- Pesquisa de willingness-to-pay com igrejas do segmento-alvo
- Levantamento dos custos operacionais reais (infraestrutura, suporte, aquisição)
- Validação do posicionamento do produto junto aos primeiros clientes

> **Princípio:** nenhum preço será arbitrado antes dessa validação. Pricing é uma decisão de produto, não um chute.

### 6.2 Aquisição

- **Canal primário V1:** Indicação direta e comunidades de pastores e administradores eclesiásticos
- **Canal secundário:** Conteúdo educativo (como profissionalizar a gestão da sua igreja)
- **Parcerias:** Seminários, escolas teológicas, distribuidoras de materiais cristãos

### 6.3 Retenção

- Dados históricos tornam o churn naturalmente caro (lock-in saudável)
- Funcionalidades de relatório e auditoria criam hábito de uso semanal
- Onboarding assistido nos primeiros 30 dias

---

## 7. Diferenciais Competitivos

| Diferencial | Descrição |
|---|---|
| **Multi-tenant real** | Isolamento completo de dados por tenant, suporte a redes de igrejas |
| **RBAC granular** | Permissões por papel e por módulo, não apenas admin/usuário |
| **Auditoria completa** | Toda ação é rastreada com usuário, timestamp e diff de dados |
| **UX premium** | Dark mode, interface rápida, sem design genérico de template |
| **Segurança desde o design** | Argon2, JWT com rotação, HTTPS obrigatório, sem dados sensíveis expostos |
| **API-first** | Possibilidade futura de integrações com outros sistemas da igreja |

---

## 8. O Que Não É o Church Flow (V1)

Para manter foco e evitar escopo creep:

- ❌ Não é um app de streaming de cultos
- ❌ Não é uma plataforma de doação pública (tipo crowdfunding)
- ❌ Não é um CRM de evangelismo
- ❌ Não é um sistema de contabilidade fiscal (não emite NF, não integra com SPED)
- ❌ Não substitui um contador — complementa com dados organizados
- ❌ Não tem app mobile nativo na V1 — a plataforma será totalmente responsiva e otimizada para uso em dispositivos móveis via browser, garantindo experiência de qualidade sem necessidade de instalação

---

## 9. Direção Estratégica

### Visão de Longo Prazo

O Church Flow está sendo concebido para atender milhares de igrejas em múltiplos mercados, com arquitetura escalável, segura e preparada para crescimento contínuo.

### V1 — Lançamento e Validação de PMF

- Entregar produto funcional em produção com os módulos core do escopo da V1
- Conquistar os primeiros clientes pagantes (early adopters) comprometidos com feedback contínuo
- Validar Product-Market Fit: clientes percebem valor real, usam o sistema de forma recorrente e indicariam a outros
- Estabelecer infraestrutura estável, segura e observável desde o primeiro dia em produção
- Coletar evidências reais para embasar pricing, canais de aquisição e prioridades do roadmap

### V2 — Crescimento Estruturado

- Expandir módulos e profundidade funcional com base nas dores identificadas na V1
- Lançar suporte a redes e denominações com múltiplas congregações
- Automatizar cobrança recorrente e gestão de assinaturas
- Evoluir a experiência em dispositivos móveis com base nos padrões de uso reais

### V3+ — Escala e Ecossistema

- Construir ecossistema de integrações com parceiros estratégicos
- Avaliar abertura de API pública para desenvolvedores e ISVs
- Expandir para mercados de língua espanhola na América Latina

---

## 10. Premissas e Riscos de Visão

| Premissa | Risco se Falsa |
|---|---|
| Igrejas de médio porte têm disposição e verba para pagar por um SaaS de gestão | Produto inviável no segmento — seria necessário pivotar para freemium ou mudar de segmento |
| A tomada de decisão de compra está com o pastor ou tesoureiro | Canal de aquisição errado — impacta CAC severamente |
| Igrejas têm alguém com maturidade digital para operar o sistema | Necessidade de onboarding muito mais intensivo, aumentando custo de suporte |
| Dados de membros podem ser armazenados em nuvem | Resistência cultural ou legal — exige estratégia de comunicação de privacidade |

---

## 11. Princípios de Produto

1. **Simples primeiro, poderoso depois** — Uma funcionalidade bem feita vale mais que dez pela metade
2. **Dados do cliente são sagrados** — Segurança e privacidade nunca são negociáveis
3. **A interface é o produto** — UX ruim invalida qualquer funcionalidade técnica excelente
4. **Métricas guiam decisões** — Nenhuma funcionalidade nova sem critério de sucesso definido
5. **Escalar o certo, não tudo** — Multi-tenancy e isolamento desde o dia 1; complexidade só quando necessário

---

## 12. Success Metrics

Os indicadores abaixo não são metas numéricas — são sinais que serão monitorados para avaliar se o produto está gerando valor real. Thresholds específicos serão calibrados com dados reais após os primeiros meses em produção.

### Adoção

| Indicador | O que revela |
|---|---|
| Taxa de ativação pós-onboarding | O cliente consegue operar o sistema sem suporte nos primeiros dias? |
| Módulos ativos por tenant | O produto está sendo usado de forma integrada ou só em um ponto? |
| Tempo até o primeiro lançamento financeiro | O fluxo de onboarding do tesoureiro está funcionando? |
| Taxa de conclusão do onboarding | Clientes chegam ao "momento aha" ou abandonam antes? |

### Retenção e Engajamento

| Indicador | O que revela |
|---|---|
| Frequência de acesso por usuário/semana | O produto faz parte da rotina ou é usado esporadicamente? |
| Taxa de churn por coorte | Clientes estão saindo em massa depois de X meses? Há padrão? |
| Retenção de usuários ativos por tenant | O uso se expande dentro da organização ou fica restrito a um admin? |
| Tempo médio de sessão | Usuários completam tarefas com eficiência ou ficam perdidos? |

### Uso da Plataforma

| Indicador | O que revela |
|---|---|
| Volume de lançamentos financeiros por tenant/mês | O módulo financeiro está sendo adotado de verdade? |
| Membros cadastrados vs. membros ativos da igreja | O cadastro de membros está sendo mantido atualizado? |
| Eventos criados e com controle de presença | O módulo de eventos está integrado à operação real? |
| Relatórios gerados por período | O produto está gerando valor informacional para a liderança? |

### Satisfação e Produto-Market Fit

| Indicador | O que revela |
|---|---|
| NPS (Net Promoter Score) coletado ativamente | Clientes recomendariam o produto? |
| Resposta à pergunta de Sean Ellis ("como se sentiria se não pudesse mais usar?") | Evidência direta de PMF |
| Volume e natureza dos tickets de suporte | Problemas de UX, bugs ou falta de funcionalidades críticas? |
| Taxa de resposta a pesquisas de feedback | Clientes engajados com a evolução do produto? |

---

## Aprovação

| Papel | Responsável | Status |
|---|---|---|
| Product Manager | — | Aprovado |
| Software Architect | — | Aprovado |
| Stakeholder / Founder | — | Aprovado |

---

*Próximo documento: `01-product-requirements-document.md`*  
*Dependência: Aprovação deste documento.*
