# Requisitos, procedência e limites

## Decisões aprovadas

Atualizar e reativar a WABlind para o portfólio. Interface no Pages e serviço externo. Sem alteração da tese, integração MADO, IA generativa, edição simultânea ou novo estudo obrigatório.

Escopo consolidado em 7 de setembro de 2026: a edição/classificação de elementos permanece central. O formato 2 acrescenta função na atividade, tratamentos combináveis, justificativa, fonte/direitos, representações relacionadas e síntese autoral opcional. A página pública explica a evolução; síntese para a tese e teste técnico sintético do Instrumento MADO ficam em `outputs/tese`, fora deste repositório. O teste isolado não é integração operacional nem avaliação com participante.

Consulte [MATRIZ-HISTORICA.md](MATRIZ-HISTORICA.md) para distinguir exemplos comprovados de marcadores históricos, sugestões dos participantes e categorias introduzidas nesta reconstrução. O catálogo atual não é anunciado como reprodução literal das tags do artigo.

| Origem | Requisito | Implementação |
|---|---|---|
| Proposta do artigo de 2018 | Apoio técnico mais mediação humana | Captura automática por URL + editor de marcadores |
| Seleção confundida com conclusão | Distinguir selecionar, aplicar e salvar | Estado selecionado, rascunho e revisão |
| Dificuldade de escolher marcadores | Linguagem e exemplos | Ajuda por categoria e prévia |
| Dificuldade de acompanhar contribuições | Revisar e corrigir | Lista, edição, exclusão, desfazer e histórico |
| Contextualização pedagógica | Descrição situada | Descrição e finalidade opcional |
| Atualização técnica | Interface e autoria acessíveis | HTML nativo, teclado, foco e testes axe |
| Publicação no portfólio | Experiência independente | Exemplos originais e serviços opcionais |

## Inventário histórico examinado no planejamento

- `WABlind-master.zip`: protótipo Node/Express/EJS; importação por URL e edição com partes incompletas, dependências e autenticação antigas.
- `wablind.zip`: árvores PHP/CodeIgniter e WABlind original; regras heurísticas, painéis experimentais e metadados SVN.
- `wablind.txt` e `wablind2.txt`: notas de funcionalidades, não prova de implementação.
- Artigo SBIE 2018: comunicabilidade com professores; não equivale a avaliação de aprendizagem de estudantes cegos.
- Relatório RT-GSI-2018-005: evidência histórica de verificação automática, não ensaio reproduzido nesta versão. Há divergências documentais que impedem converter seus totais em indicadores atuais.

Os originais continuam em seus locais de origem, sem extração para a árvore pública, modificação, migração de senhas ou reaproveitamento de segredos. Não se afirma que um dos arquivos recuperados corresponda integralmente à versão usada no estudo.

## Relevância e alegações

A atualização ilustra a continuidade de uma aplicação da trajetória de Natacsha. Preserva organização, mediação e comunicabilidade. Não atribui resultados de 2018 ao software de 2026, nem constitui nova validação da tese. Descrições contextualizadas também são estudadas por trabalhos contemporâneos, como https://arxiv.org/abs/2409.03054; não se reivindica exclusividade ou novidade científica automática.

## Limites

Uma página HTML pública por captura; domínio exato previamente habilitado; HTTPS; sem JavaScript, login remoto, rastreamento de links ou reprodução de transações. Até 1.500 elementos, HTML de 2 MB, seis imagens raster de 350 KB e 20 segundos totais. Arquivos JSON até 5 MB. Listas aninhadas têm texto preservado em sequência e aviso de revisão da hierarquia. Conteúdo ativo e mídia não suportada recebem avisos; a fonte permanece acessível por link.
