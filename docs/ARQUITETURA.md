# Arquitetura e contratos — 2.1.0-beta.1

Uma interface React/TypeScript/Vite no GitHub Pages, uma API Express/TypeScript em Node.js 24 no Render e Supabase para autenticação, PostgreSQL e armazenamento privado. São dois componentes implantáveis, com módulos internos; não há micro-frontends, microserviços de negócio ou integração operacional com a MADO.

Essa separação existe porque o Pages hospeda arquivos estáticos, enquanto capturar páginas, verificar permissões e persistir revisões requer servidor. TypeScript compartilha o contrato entre interface e API; SQL permanece responsável por transações e autorização no banco.

## Organização do código

| Módulo | Responsabilidade |
|---|---|
| `src/App.tsx` | Rotas por fragmento, biblioteca local e composição das páginas. |
| `src/Home.tsx`, `src/History.tsx` | Busca pública, história e ajuda. |
| `src/Account.tsx`, `src/api.ts` | Entrada da conta, atividade por URL e contratos HTTP. |
| `src/Editor.tsx`, `src/editor/forms.tsx` | Decisões por elemento, dados da atividade, representações, revisão e publicação. |
| `src/editor/SourcePreview.tsx` | Prévia isolada e seleção sincronizada com a lista. |
| `src/Content.tsx`, `src/ReadingControls.tsx` | Leitura semântica e preferências de apresentação. |
| `shared/model.ts` | Formatos 1/2, validação, conversão, projeção de leitura e pendências. |
| `shared/export.ts` | Composição compartilhada, HTML exportado e texto para leitura em voz. |
| `server/capture.ts`, `server/preview.ts` | Captura limitada, extração estruturada e prévia sanitizada. |
| `server/app.ts` | Rotas, autorização, limites, erros e acesso aos serviços. |
| `supabase/migrations/` | Estrutura, RLS, funções transacionais e evolução do contrato persistido. |

Editor e conta são carregados sob demanda. Não há biblioteca adicional de estado global nem framework de negócio intermediário. Extrair as rotas de `server/app.ts` futuramente pode reduzir o tamanho do arquivo sem criar novos serviços.

## Documento e composição de leitura

O formato 1 continua legível. O formato 2 adiciona `mediation`: tarefa, objetivo, contexto, responsável, fonte e condições de uso; síntese autoral ligada a elementos; decisões por elemento; referências e representações relacionadas. Cada decisão registra classificação, função, tratamentos, descrição, explicação, justificativa, motivo de omissão, autoria e data. As representações atualmente editáveis são texto e tabela, com função, relação complementar/alternativa/sequencial, condição e alternativa.

`toV2` prepara a edição de documentos antigos sem modificar a captura ou inventar funções e justificativas. O banco rejeita retorno de formato 2 para 1. Fonte, identificador e blocos permanecem imutáveis entre revisões do mesmo projeto; outra captura exige novo projeto. “Incluir na síntese” não gera um resumo: o professor escreve e relaciona a síntese aos elementos utilizados.

`readingProjection` aplica omissões e reclassificações estruturais suportadas. Leitor, índice, exportação e texto de fala utilizam essa projeção e funções compartilhadas. Reclassificar não converte automaticamente texto em tabela nem demonstra equivalência entre representações. A publicação verifica preenchimento, proveniência e alternativas em situações delimitadas; revisão humana continua necessária para relações, números, tabelas e pertinência das descrições.

A captura e a revisão completas permanecem privadas. A RPC pública retorna `publicView: {elementOrder, omissions}` com a ordem dos IDs e os motivos de omissão; `blocks` contém somente os elementos visíveis. Anotações e decisões de elementos omitidos são removidas, assim como representações ligadas apenas a eles. Representações ligadas também a elementos visíveis e a síntese mantida para publicação podem mencionar o elemento omitido: o mediador deve revisá-las também. Omitir não apaga o original privado nem recolhe cópias publicadas anteriormente.

O manifesto público é validado pelo contrato e preserva numeração/proveniência sem reenviar o corpo original omitido. Essa projeção não é uma cópia de segurança editável: `parseDocument`, `toV2` e o banco rejeitam sua utilização como captura privada. Para continuar a autoria, usar o projeto autenticado ou seu JSON privado exportado.

## Prévia privada da fonte

A captura produz dois artefatos: documento estruturado e prévia HTML sanitizada. Ambos ficam no bucket privado. A prévia é recuperada por rota autenticada somente após verificar acesso ao projeto; não integra o HTML público ou a exportação do documento.

A prévia utiliza `iframe` com `sandbox="allow-scripts"`, sem `allow-same-origin`. A única execução prevista é o seletor produzido pela aplicação, autorizado por nonce na CSP. Scripts da fonte, formulários ativos, estilos externos, fontes externas e conteúdo incorporado não são executados. Rede e envio de formulários são restritos. Mensagens entre frame e aplicação conferem janela de origem, token da instância, tipo e ID de elemento conhecido.

Estilos inline e blocos `<style>` passam por análise de CSS e lista de propriedades permitidas. URLs, regras `@`, pseudo-seletores, seletores por atributo e funções não admitidas são descartados. Não há promessa de reprodução visual fiel de páginas com JavaScript ou folhas externas. Imagens suportadas são incorporadas como dados; outros recursos geram avisos. A lista equivalente de elementos permite continuar quando a prévia não existe ou é inadequada.

O restante da interface renderiza componentes controlados e texto escapado, sem inserir HTML arbitrário da fonte. O contrato rejeita propriedades desconhecidas, referências executáveis e SVG enviado como imagem; links HTTP/HTTPS não incluem credenciais. A validação se repete na entrada, no retorno do serviço e na reimportação JSON.

## Conta inicial e autorização

O formulário aceita `professor` e uma senha definida pela administradora no Supabase Auth. `POST /v1/auth/login` mapeia esse nome a `PROFESSOR_EMAIL`, configurado somente no servidor, e usa `signInWithPassword`. Não existe senha fixa no código, login `123`, autenticação simulada no cliente, OTP ou SSO implementado.

O servidor devolve tokens de sessão; o cliente Supabase os mantém em `sessionStorage`, com renovação. Somente a chave pública é compilada no frontend. Rotas privadas validam JWT com `getUser` e realizam consultas/RPCs com o token do usuário. A chave administrativa fica no serviço para armazenamento e operações de captura após verificações de acesso.

O banco suporta membros e isolamento. Entretanto, a interface só oferece entrada de uma conta inicial; login individual de colaboradores ainda precisa evoluir antes do uso multiusuário amplo. Compartilhar essa conta não produz autoria individual de vários professores.

## API `/v1`

| Método e rota | Contrato resumido |
|---|---|
| POST `/auth/login` | `{username,password}` → tokens; cinco tentativas/IP em quinze minutos. |
| POST `/captures` | `{url,rightsConfirmed:true,rightsBasis?,rightsReference?}` → `{id,document,preview}`. A UI solicita condição e referência de uso. |
| GET `/captures/:id` | Documento da captura acessível à conta. |
| GET `/projects` | Projetos acessíveis ao usuário. |
| POST `/projects` | `{document}` ou `{captureId,title?}` → projeto e revisão inicial. |
| GET `/projects/resolve?url=…` | Resolve um projeto acessível pela URL; compatibilidade. |
| GET `/projects/:id` | Projeto, documento atual, até 30 revisões e membros. |
| GET `/projects/:id/preview` | Prévia privada da captura vinculada; sem prévia, a lista permanece utilizável. |
| POST `/projects/:id/revisions` | `{document,expectedVersion}` → nova revisão; 409 em conflito. |
| POST `/projects/:id/members` | `{email}` de conta existente; somente proprietária. |
| DELETE `/projects/:id/members/:userId` | Retira acesso; somente proprietária. |
| POST `/projects/:id/publication` | `{expectedVersion,rightsConfirmed:true}`; verifica revisão/pendências; somente proprietária. |
| DELETE `/projects/:id/publication` | Retira publicação sem apagar revisões. |
| GET `/projects/:id/export?format=html` | HTML da leitura; sem parâmetro, documento JSON privado. |
| GET `/publications/search?q=…&limit=…` | Busca pública por título/URL; 1 a 20 resultados. |
| GET `/publications/by-url?url=…` | Até 50 atividades publicadas para a URL, com objetivo. |
| GET `/publications/resolve?url=…` | Resolve uma publicação pela URL; compatibilidade. |
| GET `/publications/:id` | Projeção pública da revisão publicada; sem autenticação. |

Busca e leitura públicas não capturam sites novos. A área do professor cria uma nova atividade a cada abertura por URL; trabalhos anteriores são retomados pela lista. A mesma fonte pode sustentar diferentes atividades/publicações.

Erros usam `{error:{code,message}}`: 400 sintaxe/URL; 401 sessão/entrada; 403 autorização/destino/origem; 404 registro/prévia; 409 conflito; 413 tamanho; 415 tipo/codificação; 422 contrato/revisão necessária; 429 frequência; 500 falha inesperada; 503 configuração/armazenamento; 504 tempo/captura. `/health` informa `not-configured` ou `ready-to-check`; este último confirma presença de configuração básica, não conectividade, migrações ou funcionamento do login.

## Persistência, limites e operação

Aplicar, em ordem, `202609060001_wablind.sql` e `202609070002_mediation.sql`. A segunda migração acrescenta vínculo de captura, prévia, condições de uso e suporte ao formato 2, preservando revisões anteriores. Projetos mantêm revisão atual e publicada separadas; revisões são imutáveis para clientes. RLS restringe acesso e funções transacionais conferem autorização/versão sob bloqueio da linha. Autoria e data de decisões/representações alteradas são registradas no banco; a leitura pública substitui IDs pessoais por atribuição de mediação.

Rascunhos locais usam `localStorage`; formulários ainda não aplicados e sessão usam `sessionStorage`. Há até 30 revisões locais e 20 alterações de desfazer. Quota, fechamento da sessão ou limpeza do navegador podem afetar recuperação; exportação externa continua importante. Conflito ou falha de rede não é anunciado como salvamento concluído.

Captura: HTTPS, porta padrão, host exato autorizado e sem IP literal. Todos os resultados DNS devem ser públicos; o endereço verificado é fixado na conexão TLS. Até três redirecionamentos e recursos de imagem são revalidados. Limites: 20 segundos totais, HTML até 2 MiB, até 1.500 blocos, seis tentativas de imagens até 350.000 bytes cada e prévia/documento limitados. Não há crawler de site inteiro, cookies, autenticação na fonte, execução de JavaScript, compressão arbitrária ou acesso a redes internas.

A API aplica 120 solicitações/minuto/IP e cinco capturas/minuto/usuário. A quota diária de 20 tentativas é transacional; limites por processo exigem revisão ao escalar. Há limites de 50 projetos por proprietária e 500 revisões por projeto. Retenção, remoção e restauração de backup precisam ser operacionalizadas antes do uso externo amplo.

Originais históricos, PDFs, tese, cópia do Instrumento MADO e evidências acadêmicas ficam fora deste repositório público e de `dist`. Somente exemplos próprios e documentação pública apropriada integram o site. Implantação e validação hospedada permanecem descritas em [DEPLOY.md](DEPLOY.md) e [VALIDACAO.md](VALIDACAO.md), sem presumir que já ocorreram.
