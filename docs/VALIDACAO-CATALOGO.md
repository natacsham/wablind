# Verificação do catálogo demonstrativo

Escopo: versão 3.0.0-demo.1. Fluxo público: busca, leitura, gestão, edição e prévia. Conteúdo exclusivamente fictício e próprio.

## Verificações executadas

Resultado da revisão das páginas e do acesso compacto: compilação concluída; nove testes específicos das regras do catálogo e 24 testes de navegador aprovados. Os testes de módulos anteriores são executados separadamente e não são contados como cobertura desta interface. O axe não detectou violações nas cinco rotas examinadas, no painel de inspeção aberto nem nos três sites fictícios. A inspeção visual conferiu a busca, a seleção da página pelo professor e o editor sem seleção e com o painel contextual aberto. Nenhum desses testes cobre compartilhamento remoto ou leitura manual com leitor de tela.

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
- Nenhuma chamada a autenticação, API ou domínio externo no percurso principal observado.
- Entrada compacta: busca e gestão cabem em 1280 × 720 CSS px sem rolagem vertical. A ampliação e as telas menores podem exigir rolagem vertical, preservando os controles e o conteúdo.
- Seleção nativa da página por teclado, confirmação explícita antes da navegação, título atualizado nas opções e validação de escolha vazia.
- Campos e botões da busca e da gestão com texto de pelo menos 16 px no ambiente padrão, alvos de pelo menos 44 px e reflow com ampliação textual a 200%.

Os resultados são reproduzíveis por `pnpm test` e `pnpm test:e2e`. O workflow publica seu relatório como artefato de CI. A suíte unitária inclui testes preservados dos módulos anteriores, portanto seu total não equivale à quantidade de testes da interface nova.

## Correções decorrentes da verificação

O contraste dos números de identificação da gestão estava abaixo de 4,5:1 e foi ajustado. A geração interna de HTML foi corrigida para produzir títulos válidos. Os controles de download foram retirados: preparar e disponibilizar a página é responsabilidade do sistema, não uma transferência manual de arquivos pelo professor.

O editor por cartões foi substituído por inspeção sobre o conteúdo renderizado. Os controles aparecem somente após a seleção. O conteúdo principal tem destino real de navegação; menus preservam links e propagandas recebem identificação própria. Exclusões são reversíveis. Falhas de gravação mantêm o rascunho e não alteram a leitura confirmada. A versão anterior foi preservada em backup antes da alteração.

## Limites

Não foram realizados testes manuais com NVDA, VoiceOver ou TalkBack, nem avaliação com participantes nesta reconstrução. A presença de estrutura semântica e a ausência de violações automáticas no recorte não constituem declaração de conformidade integral com WCAG 2.2 AA.

O protótipo não mede aprendizagem, utilidade percebida ou adequação das descrições para pessoas reais. A confirmação de uma leitura indica uma ação de edição, não uma certificação de acessibilidade.

Sem servidor de dados conectado, não há colaboração remota. A persistência desta prévia depende das permissões e do espaço disponível no navegador. A edição aberta das páginas fictícias foi confirmada como requisito; a conexão compartilhada está planejada em `ARMAZENAMENTO-COMPARTILHADO.md`, mas ainda não implementada. O teste entre dois visitantes independentes permanece pendente. Mesmo após essa conexão, edição sem login não permitirá comprovar autoria individual.

## Referências técnicas

- [WAI-ARIA APG: combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) para as sugestões e seus comandos.
- [WAI: avaliação de acessibilidade](https://www.w3.org/WAI/test-evaluate/) para a distinção entre verificações técnicas e avaliação completa.
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) para o limite da hospedagem estática.
