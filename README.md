# WABlind em evolução

Edição mediada de conteúdo web: o professor examina elementos, define sua função na atividade, prepara descrições, síntese autoral e representações relacionadas; quem lê encontra fonte e contribuições identificadas.

**Versão 2.1.0-beta.1.** A demonstração funciona sem conta ou serviço. Captura de URLs, conta e publicação na internet exigem configuração e aceitação hospedada. O nome definitivo da evolução permanece em decisão. Não há declaração de conformidade WCAG nem nova avaliação com participantes nesta entrega.

- Destino previsto: [GitHub Pages da WABlind](https://natacsham.github.io/wablind/). O endereço não confirma que esta versão já foi implantada.
- Artigo: [Avaliação da Comunicabilidade da WABlind em Enciclopédias On-line](https://doi.org/10.5753/cbie.sbie.2018.1153), SBIE 2018.
- [Matriz histórica](docs/MATRIZ-HISTORICA.md), [requisitos](docs/REQUISITOS.md), [arquitetura/API](docs/ARQUITETURA.md), [revisão crítica](docs/REVIEW-ARQUITETURA.md), [deploy](docs/DEPLOY.md) e [validação](docs/VALIDACAO.md).

## Experiência implementada

A entrada pública é uma busca simples, com foco no campo, sugestões de recursos existentes e voz como alternativa quando suportada. A busca não baixa sites novos. Na área conectada, o professor informa uma URL e o serviço prepara a captura automaticamente. JSON é cópia de segurança opcional, não requisito para começar.

O editor reúne lista de elementos, prévia isolada da fonte e marcação explícita. Selecionar não significa marcar ou salvar. O formato 2 registra tarefa, objetivo, fonte, condição de uso, decisões justificadas, síntese ligada a elementos e representações textuais/tabulares complementares, alternativas ou sequenciais. Desconsiderar preserva a captura privada e registra o motivo. Leitor, índice, exportação e fala compartilham a projeção da mediação.

Há três exemplos próprios editáveis localmente, revisões, desfazer, recuperação de formulários e exportação HTML/JSON. Preparar leitura local não a publica na internet. A versão conectada mantém rascunho e publicação separados, com revisão pública fixa, retirada e conflito de gravação explícito. Uma URL pode possuir várias atividades.

A prévia preserva apenas HTML e estilos suportados; scripts, formulários ativos, CSS externo e conteúdo incorporado não são reproduzidos. Não é cópia visual fiel de qualquer site. A lista equivalente permanece disponível. A síntese é escrita pelo mediador; não há IA generativa ou resumo automático.

## O que são Supabase e Render?

**Supabase** guarda projetos/revisões no PostgreSQL, capturas/prévias em Storage privado e verifica a conta com Auth. **Render** executa a API Node que recebe a URL, faz captura limitada e coordena operações. **GitHub Pages** serve somente a interface estática.

O login inicial é `professor`, associado no servidor a uma conta Supabase existente por `PROFESSOR_EMAIL`. A senha é definida pela administradora, não vem no código. O formulário não usa OTP, senha fixa `123`, login simulado ou SSO. Acesso individual de vários professores é evolução pendente, embora o banco já tenha membros e políticas de isolamento.

## Executar localmente

Requer Node.js 24 e pnpm 11.19.0. Dentro deste repositório:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Abrir o endereço informado pelo Vite, com `/wablind/`. Sem variáveis de serviço, os exemplos continuam editáveis e a interface informa que a área conectada não está configurada. Não é preciso instalar Supabase ou Render no computador para usar essa demonstração.

Para API local, configurar `.env` a partir de `.env.example` e executar em outro terminal:

```sh
pnpm dev:api
```

Credenciais reais e `PROFESSOR_EMAIL` ficam no servidor. `VITE_API_URL`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` são configuração pública. Alterações exigem reiniciar o desenvolvimento ou recompilar. Ajustar `ALLOWED_ORIGINS` à origem real; nunca usar chave administrativa com prefixo `VITE_`.

## Build e verificação

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm preview --port 4173
```

O preview usa o build acabado de gerar em `http://127.0.0.1:4173/wablind/`; não reutilizar `dist` antigo. Para API compilada, executar `pnpm start` com o ambiente configurado. Não é necessário servidor Python para servir a aplicação Vite.

Os testes de navegador usam build de produção na porta 4174. Os testes de banco usam PGlite em memória, com papéis/identidade simulados: não demonstram conexão ou políticas aplicadas no Supabase real. [VALIDACAO.md](docs/VALIDACAO.md) registra cobertura, evidências e pendências; esta documentação não antecipa sua contagem final.

## Dados, segurança e limites

Formato 1 permanece legível; a edição prepara formato 2 sem modificar fonte/blocos ou inventar funções históricas. Aplicar `202609060001_wablind.sql` e `202609070002_mediation.sql`, nessa ordem, conforme o estado do banco. Novas revisões não substituem imediatamente a publicação.

Rascunhos usam `localStorage`; sessão e textos ainda não aplicados usam `sessionStorage`. Limites ou limpeza do navegador podem remover trabalho local. Exporte cópias externas. JSON preserva o documento, não todo o histórico ou credenciais.

Captura externa aceita uma página HTTPS por vez, de host habilitado, com limites de tamanho, tempo e recursos. A API não é proxy aberto, não captura páginas autenticadas e não executa scripts da fonte. O material próprio [comparacao.html](public/examples/comparacao.html) foi preparado para captura autorizada; habilitar seu host exige conferir publicação e alcance da permissão. Não estender essa autorização a páginas de terceiros.

Desconsiderar não apaga o original privado. A resposta de publicação contém a projeção pública, sem o corpo original omitido, mantendo ordem, motivos e contribuições explicitamente publicadas. Revise também a síntese e as representações, que podem mencionar elementos omitidos. Essa projeção pública não pode ser reimportada como captura completa; use a cópia privada para continuar editando. Não incluir dados pessoais de estudantes ou material sem condições de disponibilização. Regras automáticas não substituem revisão humana.

## Publicação

O procedimento está em [DEPLOY.md](docs/DEPLOY.md): Supabase dedicado, duas migrações, conta inicial, Web Service Node 24 no Render e artefato estático no Pages. Não foram contratados planos ou criadas contas por esta documentação. URLs/chaves, `/health`, login, captura, salvamento, leitura pública, backup e testes remotos dependem de configuração e verificação explícitas.

## Contribuir e preservar procedência

Usar branch e pull request com comportamento esperado, mudanças, testes e limites. Para barreiras de acesso, indicar fluxo, navegador e tecnologia assistiva. Não incluir credenciais, conteúdo privado ou dados de terceiros em issues; combinar canal privado com a mantenedora para problemas sensíveis.

O projeto original está associado a Natacsha Raposo, Thais Castro e Alberto Castro, conforme o artigo. A reconstrução não redistribui árvores históricas, PDFs, tese, cópia do Instrumento MADO ou evidências acadêmicas. Esses materiais ficam fora do repositório público e do build.

A licença de redistribuição do código permanece a definir pela titularidade; não se presume autorização de relicenciamento do legado. Dependências mantêm suas licenças. Os exemplos são demonstrativos e não constituem dados de pesquisa ou resultados de avaliação.
