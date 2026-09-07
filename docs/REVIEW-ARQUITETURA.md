# Revisão crítica da arquitetura — 2.1.0-beta.1

Revisão do código e dos contratos em 7 de setembro de 2026. Resultado: manter a stack e os dois componentes implantáveis, com limites explícitos e melhorias localizadas. Não há justificativa atual para micro-frontends, microserviços de negócio ou troca de linguagem. Isso não aprova publicação ou acessibilidade sem os testes correspondentes.

## Decisões e fundamento

| Decisão | Razão situada |
|---|---|
| React e TypeScript | O editor possui seleção, formulários pendentes, revisões, prévia, composição e erros. Componentes e tipos ajudam a manter esse estado; HTML estático puro não cobre o fluxo sozinho. |
| Vite | Compila a interface para Pages, com caminho-base explícito e carregamento separado de editor/conta. |
| Express e TypeScript, Node 24 | API limitada, compartilhando contrato com a UI e mantendo captura/segredos no servidor. Não exige novo framework de domínio. |
| PostgreSQL/RLS/RPC no Supabase | Persistência e controle transacional de versão/autorização. Evita reimplementar banco e autenticação, sem eliminar testes das políticas. |
| Render e GitHub Pages | Serviço dinâmico para captura/API e artefato estático para interface. A separação decorre da hospedagem, não de fragmentação artificial do produto. |

Supabase e Render introduzem dependências operacionais, planos e configuração. Não comprovam menor custo, segurança automática ou disponibilidade garantida. Sua necessidade concreta é executar e armazenar a parte que o Pages não fornece.

## Mudanças desde a revisão anterior

- `App.tsx` compõe módulos de busca, conta, editor, leitura e história; editor e conta têm carregamento sob demanda. A antiga recomendação de separar toda a UI deixou de ser bloqueio genérico.
- O contrato aceita formatos 1 e 2. Mediação registra tarefa, função, justificativa, fonte, síntese e relações entre representações. A migração 002 preserva o formato anterior e acrescenta validação/persistência.
- O editor oferece prévia isolada da captura e lista equivalente de elementos. A prévia preserva apenas CSS suportado, sem pretender replicar aplicações externas.
- O login é `professor` mapeado no servidor a `PROFESSOR_EMAIL`, com senha verificada pelo Supabase Auth. Foram retiradas a documentação de OTP e a ideia de credencial fixa no cliente.
- O build atual foi concluído após execução autorizada fora da restrição local. A falha ambiental anterior não justifica uma versão pré-compilada antiga como evidência ou distribuição.

## Riscos reais e tratamento

### 1. Validações TypeScript e SQL podem divergir

O contrato da API usa Zod, e o banco repete invariantes de fonte, IDs, cardinalidade, proveniência e publicação. Essa duplicação é deliberada na fronteira de confiança: clientes não devem contornar regras por RPC. Exige testes de compatibilidade a cada mudança de formato. Não retirar validação do banco apenas para reduzir linhas.

### 2. Concentração de rotas em `server/app.ts`

O arquivo reúne entrada, autorização e operações de vários recursos. Separá-lo em autenticação, captura, projetos e publicações é melhoria de manutenção, sem novos processos ou camada genérica de repositórios. Preservar códigos de erro, JWT do usuário e testes ao extrair funções. Não bloquear uma demonstração local para criar abstrações especulativas.

### 3. Prévia: fronteira adicional de segurança e acessibilidade

O HTML sanitizado fica privado, em iframe de origem opaca, com CSP e seletor próprio. CSS externo, script da fonte e mídia incorporada não são executados. Mudanças em `sandbox`, CSP, CSS permitido ou mensagens entre janelas exigem revisão e testes adversariais. Não adicionar `allow-same-origin` por conveniência.

Sanitização reduz o conteúdo suportado; layout, ordem e rótulos podem diferir da fonte. A lista estruturada é o caminho equivalente de edição e deve continuar utilizável sem prévia. Não anunciar fidelidade visual universal nem conformidade da página capturada.

### 4. Conta inicial não resolve colaboração individual

RLS e membros existem, mas o formulário aceita só o alias de uma conta configurada. Atribuições no banco refletem essa conta, não várias pessoas que compartilhem a senha. Uso colaborativo amplo depende de autenticação individual, recuperação de conta e testes com identidades distintas. SSO é evolução possível, não funcionalidade entregue.

### 5. Publicação precisa preservar a fronteira entre fonte privada e leitura pública

A omissão mantém a captura/revisão privadas. A RPC de publicação foi alterada para retirar o corpo original omitido e suas contribuições exclusivas; `publicView` preserva ordem e motivos. O modelo e o banco rejeitam essa projeção como fonte para nova edição. Essa fronteira deve permanecer coberta por testes de regressão. Razões, síntese e representações explicitamente mantidas podem mencionar elementos omitidos e também exigem revisão humana. Exportações anteriores não são recolhidas ao retirar uma publicação.

A síntese é autoral, ligada aos elementos, e não é gerada automaticamente por marcação. As verificações de preenchimento não certificam direitos de uso, correção pedagógica ou equivalência semântica.

### 6. Regras limitadas não cobrem toda a qualidade da mediação

O código exige tarefa, objetivo, responsável, fonte, justificativas e alternativas em situações definidas. Isso não verifica se números, unidades, relações, tabelas e descrições preservam adequadamente a tarefa. Revisão humana continua necessária. Multimodalidade não se reduz ao controle de voz disponível no navegador.

### 7. Operação externa requer evidência própria

URLs, chaves, migrações, e-mail configurado, login, CORS, Storage, isolamento real e restauração não são comprovados pelo build ou por testes em memória. Limites por processo precisam de revisão ao escalar; a quota diária já é transacional. A lista de captura é por host, não por caminho: habilitá-la exige avaliar o alcance. Retenção e remoção ainda precisam de política operacional.

## Critério de conclusão

A estrutura pode ser mantida para a beta: módulos internos, contratos versionados, captura limitada e publicação por revisão. Os próximos passos são corrigir falhas observadas e executar a aceitação hospedada de [DEPLOY.md](DEPLOY.md), não trocar a stack. Testes e contagem final serão consolidados em [VALIDACAO.md](VALIDACAO.md). Esta revisão não altera esse relatório nem declara deploy ou conformidade realizados.

PDFs e códigos legados, documentos da tese, cópia MADO e evidências acadêmicas ficam fora do repositório público. A história pública comunica procedência e mudança de proposta; não distribui os materiais de pesquisa.
