import type { ReadingDocument, Block } from './model';
const t = (text: string) => [{ text }];
const paragraph = (id: string, text: string): Block => ({ id, kind: 'paragraph', content: t(text) });
function example(id: string, title: string, blocks: Block[]): ReadingDocument {
  return { schemaVersion: 1, id, title, language: 'pt-BR', source: { capturedAt: '2026-09-06T12:00:00.000Z', hash: `demo-${id}-1`, processorVersion: 'demo-1', attribution: 'Conteúdo demonstrativo original preparado para a WABlind (2026). Não constitui material de avaliação da pesquisa.', rights: 'demo-original' }, blocks, annotations: [], warnings: [] };
}
export const examples = [
  { tag: 'CIÊNCIAS', duration: '5 elementos', summary: 'Acompanhe o percurso da água e experimente descrever uma ilustração.', document: example('ciclo-da-agua', 'Uma viagem com a água', [
    paragraph('water-intro', 'A água circula entre a superfície da Terra e a atmosfera. A energia do Sol participa desse movimento contínuo.'),
    { id: 'water-image', kind: 'image', illustration: 'water', alt: null, caption: 'O percurso da água' },
    { id: 'water-heading', kind: 'heading', level: 2, content: t('Um ciclo, diferentes caminhos') },
    { id: 'water-list', kind: 'list', ordered: true, items: [t('Evaporação: parte da água líquida passa para o estado de vapor.'), t('Condensação: o vapor pode formar gotículas que compõem as nuvens.'), t('Precipitação: a água retorna à superfície, por exemplo, como chuva.')] },
    paragraph('water-end', 'Depois da chuva, parte da água infiltra no solo e parte escoa para rios e lagos. Como você explicaria esse percurso a alguém?'),
  ]) },
  { tag: 'COTIDIANO', duration: '5 elementos', summary: 'Explore uma tabela e acrescente uma orientação para a leitura dos dados.', document: example('horta', 'Pequenas descobertas na horta', [
    paragraph('garden-intro', 'Uma turma acompanha duas mudas ao longo de uma semana. Os valores abaixo são fictícios e servem apenas para explorar a ferramenta.'),
    { id: 'garden-heading', kind: 'heading', level: 2, content: t('Registro de observação') },
    { id: 'garden-table', kind: 'table', caption: 'Altura das mudas, em centímetros — dados fictícios', rows: [
      ['Dia', 'Muda A', 'Muda B'].map(text => ({ content: t(text), header: true, scope: 'col' as const })),
      ['Segunda-feira', '8', '7'].map((text, i) => ({ content: t(text), header: i === 0, ...(i === 0 ? { scope: 'row' as const } : {}) })),
      ['Sexta-feira', '10', '9'].map((text, i) => ({ content: t(text), header: i === 0, ...(i === 0 ? { scope: 'row' as const } : {}) })),
    ] },
    paragraph('garden-question', 'Compare a variação de altura de cada muda. O que os registros permitem observar? O que eles não permitem concluir?'),
    { id: 'garden-list', kind: 'list', ordered: false, items: [t('Identifique as unidades de medida.'), t('Leia os cabeçalhos antes de comparar os valores.'), t('Separe observação e explicação.')] },
  ]) },
  { tag: 'LEITURA CRÍTICA', duration: '5 elementos', summary: 'Organize ideias, identifique a autoria e proponha uma atividade complementar.', document: example('ceu', 'Ler o céu, fazer perguntas', [
    paragraph('sky-intro', 'Observar o céu pode despertar perguntas sobre o tempo, a luz e os movimentos que percebemos. Um registro de observação descreve o que foi visto, quando e em quais condições.'),
    { id: 'sky-heading', kind: 'heading', level: 2, content: t('Observar não é adivinhar') },
    { id: 'sky-quote', kind: 'quote', content: t('Hoje vi nuvens cobrindo parte do céu. Registrei o horário e o local para comparar com outra observação. — relato fictício') },
    paragraph('sky-question', 'Quais informações ajudariam outra pessoa a compreender esse registro sem ter visto o céu naquele momento?'),
    paragraph('sky-author', 'Autoria: equipe do projeto WABlind. Texto demonstrativo criado para esta aplicação, sem dados de participantes.'),
  ]) },
];
