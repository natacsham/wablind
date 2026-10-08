# Verificação do catálogo demonstrativo

Escopo: ELIA, versão 3.1.0-demo.1, reconstrução da WABlind. Fluxo público: busca por texto ou voz, leitura, gestão, edição e prévia. Conteúdo exclusivamente fictício e próprio.

## Verificações executadas

Resultado da revisão da identidade, páginas e busca por voz: compilação concluída; nove testes específicos das regras do catálogo e 38 testes de navegador aprovados. Os testes de módulos anteriores são executados separadamente e não são contados como cobertura desta interface. O axe não detectou violações nas cinco rotas examinadas, no painel de inspeção aberto, nos três sites fictícios nem no estado de escuta simulado. A inspeção visual conferiu a busca, a seleção da página pelo professor e o editor sem seleção e com o painel contextual aberto. Nenhum desses testes cobre compartilhamento remoto ou leitura manual com leitor de tela.

- Compilação TypeScript e Vite em modo de produção.
- Testes de regras do catálogo: busca sem dependência de acentos, endereços conhecidos, separação entre rascunho e leitura, validação de estrutura, compatibilidade da classificação e integridade da fonte.
- Testes da geração interna das páginas fictícias: estrutura de títulos e tabelas, descrição de imagens e escape do texto. Essa rotina não oferece download ao usuário.
- Testes de navegador Chromium: sugestões por teclado, gestão de foco, edição, retirada e reinclusão, confirmação, persistência após recarregar e ausência de controles de download ou exportação.
- Inspetor: destaque ao passar o mouse, seleção direta, opções contextuais, fechamento com Escape e devolução de foco, menu, propaganda, múltiplas marcações e atalho ao conteúdo principal.
- Compatibilidade: cópias locais anteriores são carregadas sem perder textos quando ainda não têm os novos campos de marcação.
- Falha de salvamento: não anuncia sucesso nem substitui a leitura confirmada quando o navegador rejeita a gravação.
- Título da página: seleção na própria página, alteração, salvamento, busca pelo título atualizado e persistência após recarregar.
- Sites fictícios: cabeçalho, menus, banner, cinco ilustrações por página, anúncios, coluna lateral e rodapé inspecionáveis, com reflow a 320 CSS px.
- Casos negativos: busca sem resultados, descrição de imagem ausente, armazenamento corrompido e falha de gravação local.
- axe em busca, gestão, editor, leitura e página sobre; contraste ajustado após detecção automática.
- Reflow a 320 CSS px nos mesmos percursos, com verificação de ausência de rolagem horizontal da página.
- Presença dos conteúdos com cores forçadas e movimento reduzido.
- Nenhuma chamada a autenticação, API ou domínio externo no percurso principal por texto observado. A busca por voz é opcional e pode usar o serviço de reconhecimento do navegador, conforme o aviso apresentado antes da ativação.
- Entrada compacta: busca e gestão cabem em 1280 × 720 CSS px sem rolagem vertical. A ampliação e as telas menores podem exigir rolagem vertical, preservando os controles e o conteúdo.
- Seleção nativa da página por teclado, confirmação explícita antes da navegação, título atualizado nas opções e validação de escolha vazia.
- Campos e botões da busca e da gestão com texto de pelo menos 16 px no ambiente padrão, alvos de pelo menos 44 px e reflow com ampliação textual a 200%.
- Voz: ativação explícita, idioma português brasileiro, confirmação textual antes da navegação, interrupção, cancelamento, preservação do texto digitado, ausência de reinício automático, rejeição de eventos atrasados e limite de duração.
- Eventos simulados: permissão negada, falha de rede, ausência de fala, indisponibilidade de microfone, navegador sem suporte, falha de inicialização e ausência de evento de encerramento.
- Navegação sem JavaScript: os três exemplos HTML de origem permanecem disponíveis. Não substituem a busca nem contêm as edições locais.
- Identidade: ELIA nas telas e nos metadados, WABlind nas referências históricas; links e armazenamento local preservados.

Os resultados são reproduzíveis por `pnpm test` e `pnpm test:e2e`. O workflow publica seu relatório como artefato de CI. A suíte unitária inclui testes preservados dos módulos anteriores, portanto seu total não equivale à quantidade de testes da interface nova.

## Correções decorrentes da verificação

O contraste dos números de identificação da gestão estava abaixo de 4,5:1 e foi ajustado. A geração interna de HTML foi corrigida para produzir títulos válidos. Os controles de download foram retirados: preparar e disponibilizar a página é responsabilidade do sistema, não uma transferência manual de arquivos pelo professor.

O editor por cartões foi substituído por inspeção sobre o conteúdo renderizado. Os controles aparecem somente após a seleção. O conteúdo principal tem destino real de navegação; menus preservam links e propagandas recebem identificação própria. Exclusões são reversíveis. Falhas de gravação mantêm o rascunho e não alteram a leitura confirmada. A versão anterior foi preservada em backup antes da alteração.

## Limites

O reconhecimento de voz foi exercitado com eventos simulados, não com fala humana e serviço real. A verificação com microfone físico, permissões reais e diferentes navegadores ainda é necessária. Não há alegação de funcionamento offline ou em todos os navegadores. ELIA não armazena áudio; as práticas do provedor de reconhecimento dependem do navegador.

A triagem estática do HTML-fonte não resolve os marcadores `%BASE_URL%` do Vite e não enxerga o link de salto renderizado pelo React. Os destinos dos exemplos foram verificados na compilação com JavaScript desativado; o link de salto e o foco fazem parte da inspeção do DOM renderizado. A triagem de CSS não registrou problemas. Essas verificações não substituem avaliação humana.

Não foram realizados testes manuais com NVDA, VoiceOver ou TalkBack, nem avaliação com participantes nesta reconstrução. A presença de estrutura semântica e a ausência de violações automáticas no recorte não constituem declaração de conformidade integral com WCAG 2.2 AA.

O protótipo não mede aprendizagem, utilidade percebida ou adequação das descrições para pessoas reais. A confirmação de uma leitura indica uma ação de edição, não uma certificação de acessibilidade.

Sem servidor de dados conectado, não há colaboração remota. A persistência desta prévia depende das permissões e do espaço disponível no navegador. A edição aberta das páginas fictícias foi confirmada como requisito; a conexão compartilhada está planejada em `ARMAZENAMENTO-COMPARTILHADO.md`, mas ainda não implementada. O teste entre dois visitantes independentes permanece pendente. Mesmo após essa conexão, edição sem login não permitirá comprovar autoria individual.

## Referências técnicas

- [WAI-ARIA APG: combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) para as sugestões e seus comandos.
- [WAI: avaliação de acessibilidade](https://www.w3.org/WAI/test-evaluate/) para a distinção entre verificações técnicas e avaliação completa.
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) para o limite da hospedagem estática.
- [MDN — SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) para suporte, eventos e possível processamento remoto do áudio.
