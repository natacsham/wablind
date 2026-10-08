# WABlind

Preparação de páginas web com mediação humana, no contexto da pesquisa de doutorado sobre o **Arcabouço Multimodal para Acessibilidade Digital**.

## Propósito

A WABlind parte de uma tarefa concreta: tornar o conteúdo de uma página mais compreensível e navegável para quem irá utilizá-lo. O professor examina seus elementos, identifica funções, descreve informações visuais e ajusta o que será apresentado ao leitor.

Essa participação importa porque a existência de texto, imagem ou tabela não assegura, por si só, acesso ao conteúdo. É preciso verificar o que cada representação comunica, quais relações precisam ser preservadas e como a pessoa poderá localizar, comparar e retomar as informações.

Na trajetória do doutorado, a WABlind contribui para o estudo da preparação mediada de recursos digitais. O **arcabouço** organiza o raciocínio sobre acessibilidade multimodal; a **MADO** representa semanticamente conhecimentos e relações; o **AgMADO** é seu instrumento computacional. A WABlind mantém seu propósito próprio: editar e disponibilizar conteúdo preparado. Esta reconstrução não implementa integração automática com a MADO ou com o AgMADO e não modifica os resultados já documentados na tese.

## Funcionamento pretendido

### Para quem acessa

A página inicial apresenta um campo simples de busca por nome ou endereço. As sugestões vêm das páginas cadastradas na base. Ao selecionar um resultado, a pessoa abre a versão preparada pelo professor.

### Para quem prepara

Na área de gestão, sem login nesta demonstração, o professor abre a própria página. O editor funciona como um inspetor visual: passar o mouse destaca o elemento; clicar abre suas opções. Não há uma ficha permanente nem uma sequência de formulários para percorrer. O fluxo é **abrir → selecionar e marcar → salvar**. Pode:

- classificar um trecho como texto, título de seção, aviso ou propaganda e identificar menus;
- identificar e descrever imagens;
- marcar informação importante, instrução, conteúdo complementar e itens a revisar;
- indicar um único elemento como conteúdo principal, criando um acesso direto na leitura;
- ajustar textos e legendas;
- excluir elementos da leitura, desfazer a última alteração e restaurar os excluídos;
- conferir a prévia e salvar a versão que será consultada pelos visitantes.

O sistema conserva o conteúdo de origem e as alterações separadamente. **Não há opção de baixar HTML ou JSON para o professor ou para o leitor.** A preparação, o armazenamento e a apresentação pertencem ao funcionamento interno da ferramenta.

A seleção também funciona por Tab e Enter ou pelo seletor de elementos. Escape fecha as opções e devolve o foco ao elemento. A marcação de conteúdo principal não substitui o restante da página: oferece um destino direto sem eliminar o contexto. Tipos de conteúdo preservam sua estrutura; por exemplo, uma imagem não se transforma em uma tabela apenas porque seu rótulo mudou.

## Estado desta implementação

A interface e os testes do fluxo estão implementados em uma **prévia local**. Ela inclui três páginas fictícias próprias:

- O caminho da água;
- Água em números;
- Biblioteca do bairro.

As três páginas usam layouts de portais fictícios, com identidade própria, cabeçalho, menu, título editável, banners publicitários, ilustrações, coluna lateral e rodapé. Esses elementos participam da mesma inspeção: anúncios não são apenas decoração da ferramenta. Alterar e salvar o título atualiza também sua identificação na busca e na aba de leitura.

Os endereços `.example` identificam essas páginas dentro do catálogo. A aplicação não captura sites de terceiros nem depende de permissões de redistribuição de conteúdo externo.

A confirmação atualmente grava a leitura neste navegador. **Ainda falta conectar o armazenamento online para que outro visitante veja as alterações.** Essa prévia não é apresentada como o catálogo compartilhado concluído.

O [plano de conexão online](docs/ARMAZENAMENTO-COMPARTILHADO.md) propõe GitHub Pages para a interface e um projeto gratuito Supabase para os dados. A edição será aberta somente para as páginas fictícias, conforme o recorte da demonstração. Nenhum serviço foi contratado ou provisionado.

## Executar a prévia

Requisitos: Node.js 24 e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm fixtures
pnpm dev
```

Abra o endereço mostrado pelo Vite com o caminho `/wablind/`. Para testar a compilação de produção:

```sh
pnpm build
pnpm preview
```

A prévia não requer `.env`, login ou senha. O armazenamento local é provisório, não substitui o serviço compartilhado.

## Organização

```text
src/main.tsx               entrada da interface atual
src/catalog/
  data.ts                  páginas e elementos fictícios
  fixtures.ts              composição dos três sites demonstrativos
  EditorialArtwork.tsx     ilustrações vetoriais próprias, sem serviços externos
  model.ts                 tipos, validação, pesquisa e estado
  App.tsx                  navegação e coordenação da interface
  Search.tsx               sugestões do catálogo
  Editor.tsx               inspetor visual, marcações, exclusão e salvamento
  inspector.css            destaque e controles contextuais da inspeção
  PageContent.tsx          apresentação semântica dos elementos
  export.tsx               geração interna das páginas de origem
scripts/build-demo-pages.tsx
public/demos/              HTML de origem gerado dos mesmos dados
tests/catalog.test.ts      regras e preservação do conteúdo
tests/e2e/catalog.spec.ts  testes do fluxo no navegador
```

Textos editados são tratados como texto, não como HTML executável. Os tipos de elemento delimitam transformações compatíveis. Imagens, listas e tabelas preservam sua estrutura: o rótulo não converte uma imagem em dados de tabela nem inventa conteúdo.

Os módulos anteriores em `server/`, `supabase/`, `shared/` e no restante de `src/` permanecem preservados. Não são importados pelo ponto de entrada da prévia. A API anterior depende de autenticação e não atende, sem adaptação, ao novo recorte de edição aberta.

## Verificação

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm check:privacy
node scripts/check-release.mjs
```

A suíte atual de navegador é `tests/e2e/catalog.spec.ts`. Os testes de interfaces anteriores permanecem preservados, mas não compõem esse gate.

Há testes de busca por teclado, foco, edição, classificação semântica, retirada reversível, separação entre rascunho e leitura e falhas de armazenamento. Os testes de segurança verificam estrutura de dados e escape de texto. As verificações com axe e reflow cobrem os percursos principais.

A leitura manual com NVDA e a avaliação com pessoas com deficiência permanecem pendentes. Não há declaração de conformidade integral com WCAG, eficácia educacional ou validação humana desta reconstrução. Veja [o registro de verificação](docs/VALIDACAO-CATALOGO.md).

## Relação com o sistema histórico

Este código reconstrói o fluxo descrito pela autora, preservando o propósito de classificação e preparação de páginas. Não é uma execução do código histórico.

A [matriz histórica](docs/MATRIZ-HISTORICA.md) separa requisitos documentados de extensões posteriores. A [publicação sobre comunicabilidade da WABlind](https://doi.org/10.5753/cbie.sbie.2018.1153) documenta o estudo anterior. Seus resultados não são transferidos automaticamente para esta interface.

Autoria: **Natacsha Melo**. Projeto de pesquisa. O nome WABlind permanece por continuidade histórica. Não foi adicionada licença permissiva ao código legado; dependências mantêm suas próprias licenças.
