# Guia do App — Tabela Periódica Moderna (Português)

## Visão Geral

Aplicativo educacional em português para ensino de tabela periódica. Arquivo único: `index.html`. Roda em navegador (mobile-first). Todas as telas são slides em sequência horizontal — o usuário navega pela barra superior (topnav) ou pela conclusão de cada etapa.

### Tecnologias
- HTML/CSS/JS puro, sem frameworks
- Audio via `new Audio()` e `<audio>`
- Animações via CSS transitions e `requestAnimationFrame`
- Vibração via `navigator.vibrate()`
- Layout responsivo com `clamp()` e funções `cLay()`/`cLay4()`

---

## Dados dos Elementos

```
MAIN[i] = [Z, símbolo, nome, grupo, período, bloco]
```
- **MAIN**: 103 elementos principais (H–Cn, exceto lantanídeos/actinídeos)
- **LANTH**: 15 lantanídeos (La–Lu)
- **ACT**: 15 actinídeos (Ac–Lr)
- **ALL**: 118 elementos ordenados por Z

### Grupos e Famílias
- `FAM_GROUPS = [1..18]` — todos os grupos
- `NAMED_GROUPS = [1, 2, 16, 17, 18]` — as 5 famílias nomeadas
- `FAM_INFO[g]` — `{name, grad, bg, shadow}` para cada família nomeada

### Famílias Nomeadas
| Grupo | Nome | Cor |
|-------|------|-----|
| 1 | Metais Alcalinos | Vermelho |
| 2 | Alcalino-Terrosos | Laranja |
| 16 | Calcogênios | Verde |
| 17 | Halogênios | Roxo |
| 18 | Gases Nobres | Azul |

---

## Layout e Navegação

### Barra Superior (topnav)
- 10 cartões clicáveis (`tcard`, `data-i="0"` a `data-i="9"`)
- Cartão ativo: fundo escuro + escala maior
- Função `goTo(i)`: para áudio atual → limpa animações → translada o `strack` → atualiza cartões

### Sistema de Layout
Cada slide tem seu objeto de layout (`L1`, `L2`, `L3`, `L4`, `L5`, `L7n`, `L8`, `L9`) com:
- `cW`, `cH` — largura e altura de cada célula
- `pX`, `pY` — posição inicial da grade
- `aW`, `aH` — dimensões da área

Funções de posição: `tPos(grupo, período, L)` e `tPos4(grupo, período, L4)`

---

## Slide 0 — Os Critérios de Organização (a1)

**Tema**: Como a tabela é organizada — por número atômico crescente e similaridade química nas colunas.

### Fases
1. **Apresentação**: Narração explica os dois critérios; elementos aparecem na tela.
2. **Spread de períodos**: Toque abre as 7 linhas horizontais com rótulos de período (1º–7º).
3. **Spread de grupos**: Toque abre as 18 colunas verticais com rótulos de grupo.
4. **Quiz de ordenação**: Usuário toca elementos em ordem crescente de Z.
   - Elemento correto: voa animado para posição, muda de cinza para colorido.
   - Elemento errado: erro sonoro + shake.
   - Dica automática: pisca o próximo elemento se o usuário demorar.
   - Lantanídeos e actinídeos: aparecem como blocos marcadores.
5. **Conclusão**: Confetes + aplausos quando todos os 118 são posicionados.

### Variáveis-chave
```js
s1QuizPhase   // fase atual do quiz (-1 = inativo)
s1QuizClickHandler  // handler de clique ativo
```

### Interações
- Toque em elemento → posiciona na tabela
- Botão voltar → desfaz último posicionamento

---

## Slide 1 — As Coordenadas Periódicas (a2)

**Tema**: Localizar elementos por período (linha) e grupo (coluna).

### Dinâmica
- Usuário toca qualquer elemento → popup aparece com símbolo e Z.
- Linha do período fica destacada (hl-row) em azul.
- Coluna do grupo fica destacada (hl-col) em laranja.
- Quiz pergunta "Qual o período e o grupo deste elemento?"

### Variáveis-chave
```js
s2Audio       // áudio de narração atual
```

---

## Slide 2 — Os Tipos de Elementos (a3)

**Tema**: Classificação em Metais, Ametais e Gases Nobres.

### Minijogo (15 segundos)
- **Baralho de fichas**: Cartas com nome e descrição de cada tipo.
  - Metais → `grp-ab-1` (rosa/magenta)
  - Ametais → `grp-ab-2` (vermelho)
  - Gases Nobres → `grp-ab-3` (azul)
- **Arrastar e soltar**: Usuário arrasta carta até o bloco correspondente na tabela.
  - Acerto: elemento posicionado + som específico + vibração.
  - Erro: shake na tela + som de erro + vibração.
  - Hover sobre bloco: escala 1,08× + vibração.
- **Timer**: 15s (S3_GAME_SECS). Aparece barra de progresso.
- **Card de resultado**: aparece ao final com pontuação.
- **Legenda**: itens clicáveis filtram e destacam elementos por tipo.

### Cartas (flip cards)
- Frente: nome do tipo (ex.: "Metais")
- Verso: descrição curta
- Animação de flip ao trocar de lado

### Variáveis-chave
```js
S3_GAME_SECS = 15
s3Score           // pontuação atual
s3GameActive      // jogo ativo?
s3DragItem        // carta sendo arrastada
```

---

## Slide 3 — As Principais Famílias (a4)

**Tema**: As 5 famílias principais e suas propriedades.

### Interação principal: Arrastar tira para cima
- Cada família nomeada (grupos 1, 2, 16, 17, 18) tem uma faixa arrastável.
- Arrastar para cima sobe os elementos (`snapUp`) + revela rótulo da família.
- Toque no rótulo desce os elementos (`snapDown`).
- Famílias não-nomeadas (3–15): fundo cinza, opacidade reduzida.

### Variáveis e funções de animação
```js
p4Els[]           // {el, d, g} — todos os elementos do slide 4
p4FamEls[g][]     // elementos por grupo
p4Labels[g]       // rótulo DOM por grupo
p4Raised          // grupo atualmente erguido (null se nenhum)
P4_MAX            // altura máxima de elevação (~1,3× cH)

snapUp(g)         // eleva família g + mostra rótulo
snapDown(g, goNext)  // abaixa família g
setS4Interactive(on) // ativa/desativa interação + labels
s4StopSubtleLoop()   // para animação de pulso (fam-pulse)
```

### Sequência do diálogo 4.6
1. Todas as 5 famílias são levantadas → dispara `dialogo4.6`.
2. No início do áudio: tabela congela (`setS4Interactive(false)`), pulso para.
3. t=2s: família 2 sobe + rótulo aparece + mãozinha animada (👆) aparece sobre o rótulo (sequencial: sobe → 370ms → rótulo → 520ms → mão).
4. t=8s: botão Quiz aparece (na posição do botão Play).
5. Fim do áudio: mão some + interação volta (`setS4Interactive(true)`).

### Demo Hand (mãozinha)
```js
s4ShowDemoHand(g)   // mostra mão sobre o rótulo da família g
s4HideDemoHand()    // remove mão + abaixa família 2
s4DemoHand          // elemento DOM atual da mão
```

### Quiz do Slide 3 (S4_QUIZ) — 6 perguntas

| # | Pergunta | Modo | Critério |
|---|----------|------|---------|
| 1 | Qual o último elemento alcalino? | element | grupo=1, período=7 |
| 2 | Toque no 3º elemento dos gases nobres | element | grupo=18, período=3 |
| 3 | Toque na família dos alcalino-terrosos | family | grupo=2 |
| 4 | Toque na família dos halogênios | family | grupo=17 |
| 5 | Toque em qualquer elemento que antecede um calcogênio | element | grupo=15 |
| 6 | Toque em qualquer elemento posterior aos halogênios | element | grupo=18 |

**Modo `element`**: usuário toca diretamente num elemento da tabela.  
**Modo `family`**: usuário toca qualquer elemento da família (a família inteira sobe e brilha — sem mostrar rótulo).

#### Cada pergunta toca seu próprio áudio:
- Pergunta 1 → `dialogo4.13.mp3`
- Pergunta 2 → `dialogo4.14.mp3`
- Pergunta 3 → `dialogo4.15.mp3`
- Pergunta 4 → `dialogo4.16.mp3`
- Pergunta 5 → `dialogo4.17.mp3`
- Pergunta 6 → `dialogo4.18.mp3`

#### Feedback de acerto
- Elemento: escala 1,6× + brilho verde + z-index 80 (acima de tudo exceto card)
- Família: sobe toda + brilho verde + z-index 75
- Som: `right.mp3` + vibração 40ms
- Texto "Parabéns!" (estilo igual ao slide 2) por 1,6s → avança pergunta

#### Feedback de erro
- Elemento/família: brilho vermelho
- Som: `error.mp3` + vibração dupla
- Shake na tela (`.s3-area-shake`)
- Dica aparece em caixa amarela (não some automaticamente)
- 1º erro na pergunta: −1 ponto; 2º+ erro consecutivo na mesma pergunta: −2 pontos

#### Sistema de pontuação
- Nota máxima: **10**
- Começa em 10 e desconta por erros
- `s4QuizErrors`: total de erros cometidos
- `s4QuizConsecErrors`: erros consecutivos na pergunta atual (reseta ao mudar de pergunta)
- Nota mínima: 0 (não vai negativo)

#### Card de resultado (s4QuizEnd)
- Nota: `X/10` (verde se ≥5, laranja se <5)
- Erros: `N erros`
- Mensagem aleatória (encorajadora ou celebratória)
- Alta nota (≥5): `right.mp3` + aplausos + confetes
- Baixa nota (<5): `lowscore.mp3`
- Não permite repetir o quiz

### Variáveis do quiz
```js
s4QuizActive       // quiz em andamento?
s4QuizStep         // pergunta atual (0–5)
s4QuizScore        // nota atual (começa em 10)
s4QuizErrors       // total de erros
s4QuizConsecErrors // erros consecutivos na pergunta atual
s4QuizShaking      // tela sacudindo? (evita duplo erro)
s4QuizBtn          // botão Quiz DOM
s4QuizQuestionEl   // pergunta DOM atual
s4QuizFeedbackEl   // feedback (dica ou "Parabéns") DOM atual
s4QuizScoreCard    // card de resultado DOM
```

### Timers e limpeza
```js
s4DialogTimers[]   // timers ligados ao fluxo de diálogo
s4DemoTimers[]     // timers da mãozinha demo
s4ClearDialogTimers()  // limpa s4DialogTimers
s4Dialog46Played   // dialogo4.6 já foi tocado? (evita repetir)
```

---

## Slide 4 — Os Grupos A e B (a5)

**Tema**: Distinção entre Grupo A (representativos) e Grupo B (transição).

### Sequência de áudios (S5_AUDIOS)
```
S5_AUDIOS = [
  'audio/dialogo5.mp3',   // índice 0 — intro
  'audio/dialogo5.1.mp3', // índice 1
  'audio/dialogo5.2.mp3', // índice 2
  'audio/dialogo5.3.mp3', // índice 3
  'audio/dialogo5.4.mp3'  // índice 4 — último
]
```

### Botões
- **Start (s5StartBtn)**: inicia sequência no índice 0; some ao clicar.
- **Next (s5NextBtn)**: avança para próximo áudio; aparece enquanto `s5Step < 4` ou `atLast && !s5FreeMode`.
  - **Após áudio 5.4**: botão Next é **removido** (escondido) ao fim do áudio → não aparece mais durante a interação.
- **Treinar (s5TrainBtn)**: aparece quando `atLast && s5FreeMode && !s5QuizActive`.

### Faixas arrastáveis (strips)
- Cada grupo (1–18) tem uma faixa vertical arrastável.
- Arrastar para cima ergue os elementos + mostra rótulo do grupo (1A, 2A, ..., 1B, 2B, ...).
- Sons específicos por grupo (`audio/1A.mp3`, `audio/2A.mp3`, etc.).
- H (Z=1) no grupo 1: desloca para a esquerda em vez de subir.
- Modo sequencial: deve erguer grupos em ordem.
- Modo livre (`s5FreeMode=true`): qualquer grupo pode ser erguido sem ordem.

### Conclusão da sequência (s5CompleteTable)
Acionada quando usuário ergue o grupo 18 na ordem correta, ou clica Next no último passo:
- Para o áudio
- Limpa timers
- Mostra todos os rótulos de grupo
- Define `s5FreeMode=true`
- Atualiza botões

### Exercícios (S5_EXERCISES) — 3 exercícios
Ativados pelo botão "Treinar":

| # | Tipo | Enunciado | Alvo |
|---|------|-----------|------|
| 1 | Toque no elemento | "3º período, família 2A" | Mg (Z=12) |
| 2 | Toque no elemento | "5º período, família 1B" | Ag (Z=47) |
| 3 | Rodas giratórias | Identificar Cl (Z=17) com picker de período/família | Cl |

**Exercício 3 — Wheel Picker**:
- Duas rodas giratórias: períodos (1–7) e famílias (1–18).
- Usuário posiciona as rodas no período e família corretos.
- Acerto: confetes + "Parabéns!" + avança.
- Erro: shake + som de erro; após 3 tentativas, mostra retângulo de ajuda.

### Variáveis-chave
```js
s5Audio            // áudio atual
s5Step             // índice do áudio atual (-1 = não iniciado)
s5FreeMode         // modo livre ativo?
s5QuizActive       // exercício ativo?
s5LabelShown[g]    // rótulo do grupo g visível?
s5GroupStrips[g]   // DOM da faixa do grupo g
s5Raised           // grupo atualmente erguido
s5UpdateBtns()     // atualiza visibilidade dos botões
```

---

## Slide 5 — Os Lantanídeos e Actinídeos (a6)

**Tema**: Elementos de terras raras — lantanídeos (La–Lu) e actinídeos (Ac–Lr).

### Dinâmica
- Sequência de narração em áudio (`s6Audio`).
- Botão play/pause com anel SVG de progresso.
- Animações sincronizadas com áudio (timeline de eventos).
- Lantanídeos no período 9; actinídeos no período 10.

---

## Slide 6 — A Natureza dos Elementos (a7)

**Tema**: Classificação por natureza química — metais, metaloides, ametais e gases nobres.

### Dinâmica
- 13 áudios de narração (`S7N_DIALOGS`).
- Destaques aleatórios de elementos por categoria.
- Quizzes de múltipla escolha por categoria.
- Alternância entre layout compacto e expandido.
- Rótulos de período ordinal (1º–7º).

---

## Slide 7 — A Tabela e os Elétrons de Valência (a8)

**Tema**: Relação entre a tabela e a configuração de elétrons de valência.

### Regra de valência
- Grupos 1A–8A: elétrons de valência = número do grupo (ou 8 para gases nobres).
- Metais de transição (3B–12B): mais complexo.

### Diagrama de Pauling (S8_PAULING_ORDER)
19 etapas de preenchimento orbital: `1s² → 2s² → 2p⁶ → 3s² → 3p⁶ → 4s² → 3d¹⁰ → ...`

### Interações
- Arrastar faixas das famílias 1A, 2A, 13A–18A → mostra "N elétron(s)".
- Mão animada (👏) na celebração de conclusão do quiz.

### Quiz (S8_QUIZ) — 4 perguntas
| # | Tipo | Pergunta |
|---|------|---------|
| 1 | Múltipla escolha | Qual família tem 6 elétrons de valência? |
| 2 | Toque elemento | Elemento com 2 elétrons de valência |
| 3 | Toque elemento | Elemento com 8 elétrons de valência |
| 4 | Digitação | Total de elétrons de valência de Mg + C + Cl |

---

## Slide 8 — A Tabela e o Diagrama de Pauling (a9)

**Tema**: Diagrama de Pauling interativo — visualização da configuração eletrônica de cada elemento.

### Função principal
```js
s8PaulingDist(Z)  // retorna array {n, l, e, last} para cada orbital do elemento Z
```

### Interação
- Toque num elemento → exibe a distribuição eletrônica com superscripts.
- Destaca o nível de valência (última camada ocupada).
- Retângulo interativo mostrando slots preenchidos/vazios por nível.

---

## Slide 9 — Quiz Interativo Final (a10)

**Tema**: Avaliação geral dos conteúdos.

### Estrutura
- **20 perguntas** de múltipla escolha (A, B, C, D).
- Antes de iniciar: usuário digita o nome.
- Pontuação em tempo real (0–10).
- **Botão "💡 dica"**: ajuda limitada por pergunta.

### Feedback
- Acerto: destaque verde + som positivo.
- Erro: destaque vermelho + shake + som de erro.

### Resultado final
- "Parabéns, [Nome]!" com nota, acertos e porcentagem.
- Botão "Tentar novamente".

### Variáveis-chave
```js
qzState            // estado geral do quiz
qzCurQuestion      // pergunta atual
```

---

## Padrões Comuns do App

### Botão Play (applyBtnSystem)
- **Toque rápido (<1000ms)**: play/pause do áudio atual.
- **Pressão longa (≥1000ms)**: ativa ação do botão.
- Anel SVG de progresso preenche durante o segurar.

### Sistema de diálogo (slides 1–4)
```js
playS4Dialog(src, onEnd)  // toca áudio de diálogo, chama onEnd ao terminar
s4DialogAudio             // áudio de diálogo atual
```

### Vibração
```js
vib(padrão)  // wrapper para navigator.vibrate(padrão)
```
Usada em: toque de elemento, soltar cards, resultado do minijogo, feedback de quiz.

### Confetes (spawnA4Confetti / spawnConfetti)
- Partículas individuais com cor, drift e rotação.
- Acionadas em celebrações de conclusão/acerto.

### Shake de tela
- Classe `.s3-area-shake` na área do slide (530ms de duração).
- Usada em erros de quiz e minijogo.

### Brilho de destaque (element highlight)
- **Acerto verde**: `box-shadow: 0 0 0 2px #22c55e, 0 0 16px 6px rgba(34,197,94,.8)...`
- **Erro vermelho**: `box-shadow: 0 0 0 2px #ef4444, 0 0 16px 6px rgba(239,68,68,.8)...`
- Elementos destacados: `zIndex: 80` (slide 4) / `zIndex: 50` (demais)
- Famílias destacadas: `zIndex: 75`

### Animação de mãozinha
```css
@keyframes s4HandClick {
  0%,100% { transform: scale(1) translateY(0) }
  40%      { transform: scale(.72) translateY(4px) }
}
.s4-demo-hand { animation: s4HandClick .65s ease infinite; }
```

### Sons do app
| Arquivo | Uso |
|---------|-----|
| `right.mp3` | Acerto |
| `error.mp3` | Erro |
| `applause.mp3` | Celebração geral |
| `funfare.mp3` | Fanfarra de conclusão |
| `lowscore.mp3` | Pontuação baixa |
| `dialogo4.N.mp3` | Narração do slide 3 |
| `dialogo5.N.mp3` | Narração do slide 4 |
| `audio/1A.mp3`... | Rótulos de grupo (slide 4) |

---

## Estrutura de Arquivos

```
app_tabela_periodica/
├── index.html          ← arquivo único do app (todo HTML/CSS/JS)
├── audio/
│   ├── dialogo4.N.mp3  ← narração slide 3 (4.1–4.18)
│   ├── dialogo5.N.mp3  ← narração slide 4 (5, 5.1–5.4)
│   ├── right.mp3
│   ├── error.mp3
│   ├── applause.mp3
│   ├── funfare.mp3
│   ├── lowscore.mp3
│   └── ...
└── guia_do_app.md      ← este arquivo
```

---

## Notas de Desenvolvimento

- O app é **single-file**: todo CSS e JS estão dentro de `index.html`.
- Cada slide tem sua função `buildPageN()` que reconstrói o DOM ao entrar no slide.
- `stopSNAudio()` (ex.: `stopS4Audio()`) para e limpa tudo do slide N ao sair.
- Ao navegar para outro slide, `goTo(i)` chama o stop do slide anterior antes de construir o novo.
- Elementos do slide 3 têm classe `fam-pulse` para o pulso sutil das famílias — parado em `s4StopSubtleLoop()`.
- `s4Dialog46Played` é flag booleana que impede re-execução da sequência do diálogo 4.6.
- O quiz do slide 3 não pode ser repetido (não há botão de reinício).
