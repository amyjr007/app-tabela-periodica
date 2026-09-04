#!/usr/bin/env node
/**
 * Gera aula.html a partir de index.html.
 *
 * VERSAO DE AULA (modo professor):
 *   - sem audio: o construtor Audio e trocado por um "audio fantasma" que nao
 *     emite som, mas conta o tempo com a duracao REAL do mp3 original. Assim os
 *     76 handlers de 'ended' e os 401 setTimeout continuam funcionando e as
 *     animacoes mantem o ritmo exato do app.
 *   - controles do professor: pausar, avancar/voltar etapa, velocidade.
 *   - entra direto no menu (sem capa) e pula o tutorial guiado do topico 1.
 *
 * index.html NUNCA e modificado. Rode de novo sempre que o app mudar:
 *     node build_aula.js            (usa o cache de duracoes, se existir)
 *     node build_aula.js --duracoes (re-le os mp3 com ffprobe)
 *     node build_aula.js --repo     (escreve tambem no repo do professor,
 *                                    como index.html, pronto pra commitar)
 *
 * O repo do professor (amyjr007/tabela_periodica_professor) e GERADO por
 * aqui: nao edite o index.html de la a mao, o trabalho se perde na proxima
 * geracao.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ   = __dirname;
const SRC    = path.join(RAIZ, 'index.html');
const DST    = path.join(RAIZ, 'aula.html');
const AUDIO  = path.join(RAIZ, 'audio');
const CACHE  = path.join(RAIZ, 'aula-duracoes.json');
const VERSAO = 'aula v1';
/* repo separado do professor: pasta irma, publicada em
   https://amyjr007.github.io/tabela_periodica_professor/ */
const REPO   = path.join(RAIZ, '..', 'tabela_periodica_professor');

/* ── duracao real de cada mp3 ─────────────────────────────────────────────── */
function durations(forcar) {
  if (!forcar && fs.existsSync(CACHE)) {
    try {
      const c = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
      console.log(`Duracoes: ${Object.keys(c).length} mp3 (cache)`);
      return c;
    } catch (_) { /* cache corrompido: re-le */ }
  }
  if (!fs.existsSync(AUDIO)) return {};
  const out = {};
  const mp3 = fs.readdirSync(AUDIO).filter(n => n.toLowerCase().endsWith('.mp3')).sort();
  for (const nome of mp3) {
    try {
      const d = execFileSync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'csv=p=0', path.join(AUDIO, nome)
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const s = parseFloat(d);
      if (isFinite(s)) out[nome] = Math.round(s * 100) / 100;
    } catch (_) { /* segue sem esse arquivo: cai no padrao */ }
  }
  fs.writeFileSync(CACHE, JSON.stringify(out, null, 0), 'utf8');
  console.log(`Duracoes: ${Object.keys(out).length} mp3 (ffprobe)`);
  return out;
}

/* ── substitui 1x e falha alto se a ancora sumiu do index.html ───────────── */
function troca(html, alvo, novo, oquee) {
  if (!html.includes(alvo)) {
    console.error(`ERRO: ancora nao encontrada (${oquee}).`);
    console.error(`  Procurei por: ${alvo.slice(0, 90)}`);
    process.exit(1);
  }
  return html.replace(alvo, () => novo);
}

/* Mesma coisa, por regex — o index.html usa CRLF, entao ancoras que cruzam
   linhas nao podem depender de "\n" literal. */
function trocaRe(html, re, novo, oquee) {
  let achou = 0;
  const out = html.replace(re, (m) => { achou++; return typeof novo === 'function' ? novo(m) : novo; });
  if (!achou) {
    console.error(`ERRO: ancora nao encontrada (${oquee}).`);
    console.error(`  Procurei por: ${String(re).slice(0, 90)}`);
    process.exit(1);
  }
  return out;
}

/* =========================================================================
   1) AUDIO FANTASMA + RELOGIO VIRTUAL
   -------------------------------------------------------------------------
   Tudo (audio virtual, setTimeout, setInterval) roda do MESMO relogio.
   Congelar esse relogio congela o app inteiro em sincronia; multiplicar a
   taxa acelera tudo junto. E por isso que pausar/acelerar nao desmonta as
   animacoes: elas nunca deixam de estar em fase com a fala que as dispara.
   ========================================================================= */
const SHIM = `
<script>
/* == MODO AULA - audio fantasma + relogio virtual (gerado por build_aula.js) == */
(function(){
  'use strict';

  var DUR = __DURACOES__;          /* duracao real de cada mp3, em segundos */
  var DUR_PADRAO = 3.0;            /* fallback se algum mp3 nao estiver na tabela */

  /* refs reais, guardadas ANTES de sobrescrever */
  var realST  = window.setTimeout.bind(window);
  var realCT  = window.clearTimeout.bind(window);
  var realSI  = window.setInterval.bind(window);
  var realRAF = window.requestAnimationFrame.bind(window);
  var agora   = (window.performance && performance.now)
                  ? performance.now.bind(performance) : Date.now;

  var relogio   = 0;      /* ms virtuais decorridos */
  var veloc     = 1;      /* 1x / 1.5x / 2x */
  var congelado = false;
  var ultimo    = null;

  var timers = {};              /* id -> {fn, args, due, intervalo} */
  var proxId = 1000000000;      /* offset alto: nao colide com ids reais */
  var vozes  = [];              /* audios virtuais vivos */

  /* -- relogio ------------------------------------------------------------ */
  function passo(){
    var t  = agora();
    var dt = (ultimo === null) ? 0 : (t - ultimo);
    ultimo = t;
    if (congelado) return;
    if (dt > 250) dt = 250;           /* guarda p/ aba em segundo plano */
    relogio += dt * veloc;

    /* dispara timers vencidos, em ordem de vencimento */
    var venc = [];
    for (var id in timers) if (timers[id].due <= relogio) venc.push(timers[id]);
    venc.sort(function(a, b){ return a.due - b.due; });
    for (var i = 0; i < venc.length; i++){
      var tm = venc[i];
      if (!timers[tm.id]) continue;            /* cancelado no meio do laco */
      if (tm.intervalo > 0) tm.due = relogio + tm.intervalo;
      else delete timers[tm.id];
      try { tm.fn.apply(null, tm.args); } catch(e){ console.error('[aula]', e); }
    }
    for (var j = 0; j < vozes.length; j++) vozes[j]._passo();
  }
  realSI(passo, 16);

  /* -- setTimeout / setInterval virtuais ---------------------------------- */
  function agenda(fn, atraso, args, intervalo){
    var id = proxId++;
    atraso = (+atraso) || 0;
    timers[id] = { id: id, fn: fn, args: args, due: relogio + atraso,
                   intervalo: intervalo ? atraso : 0 };
    return id;
  }
  window.setTimeout = function(fn, atraso){
    if (typeof fn !== 'function') return realST.apply(null, arguments);
    return agenda(fn, atraso, [].slice.call(arguments, 2), false);
  };
  window.setInterval = function(fn, atraso){
    if (typeof fn !== 'function') return realSI.apply(null, arguments);
    return agenda(fn, atraso, [].slice.call(arguments, 2), true);
  };
  window.clearTimeout = window.clearInterval = function(id){
    if (timers[id]) delete timers[id]; else realCT(id);
  };

  /* -- requestAnimationFrame: congela junto ------------------------------- */
  var filaRAF = [];
  window.requestAnimationFrame = function(cb){
    if (congelado){ var id = proxId++; filaRAF.push({ id: id, cb: cb }); return id; }
    return realRAF(cb);
  };

  /* -- o audio fantasma --------------------------------------------------- */
  function duracaoDe(src){
    var nome = String(src || '').split('/').pop().split('?')[0];
    return DUR[nome] || DUR_PADRAO;
  }

  function VAudio(src){
    this._ouvintes = {};
    this._pos      = 0;
    this._marcaTU  = 0;
    this._relAnt   = relogio;
    this.duration  = DUR_PADRAO;
    this.paused    = true;
    this.ended     = false;
    this.loop      = false;
    this.volume    = 1;
    this.muted     = true;
    this.playbackRate = 1;
    this._src      = '';
    if (src != null) this.src = src;
    vozes.push(this);
    var eu = this;
    realST(function(){
      eu._emite('loadedmetadata'); eu._emite('canplay'); eu._emite('canplaythrough');
    }, 0);
  }

  Object.defineProperty(VAudio.prototype, 'src', {
    get: function(){ return this._src; },
    set: function(v){
      this._src     = String(v || '');
      this.duration = duracaoDe(this._src);
      this._pos = 0; this._marcaTU = 0; this.ended = false;
    }
  });

  Object.defineProperty(VAudio.prototype, 'currentTime', {
    get: function(){ return this._pos; },
    set: function(v){
      this._pos     = Math.max(0, Math.min((+v) || 0, this.duration));
      this._marcaTU = this._pos;
      this._relAnt  = relogio;
      this.ended    = false;
      this._emite('seeked'); this._emite('timeupdate');
    }
  });

  VAudio.prototype._passo = function(){
    if (this.paused || this.ended) return;
    var dt = (relogio - this._relAnt) / 1000 * (this.playbackRate || 1);
    this._relAnt = relogio;
    this._pos += dt;
    if (this._pos - this._marcaTU >= 0.2){
      this._marcaTU = this._pos;
      this._emite('timeupdate');
    }
    if (this._pos >= this.duration){
      if (this.loop){ this._pos = 0; this._marcaTU = 0; this._emite('timeupdate'); return; }
      this._pos   = this.duration;
      this.paused = true;
      this.ended  = true;
      this._emite('timeupdate');
      this._emite('ended');
      if (typeof this.onended === 'function'){
        try { this.onended({ type: 'ended', target: this }); }
        catch(e){ console.error('[aula]', e); }
      }
    }
  };

  VAudio.prototype.play = function(){
    if (this.ended){ this._pos = 0; this._marcaTU = 0; this.ended = false; }
    this.paused  = false;
    this._relAnt = relogio;
    var eu = this;
    realST(function(){ eu._emite('play'); eu._emite('playing'); }, 0);
    return Promise.resolve();
  };
  VAudio.prototype.pause = function(){
    if (this.paused) return;
    this.paused = true;
    this._emite('pause');
  };
  VAudio.prototype.load      = function(){};
  VAudio.prototype.cloneNode = function(){ return new VAudio(this._src); };

  VAudio.prototype.addEventListener = function(tipo, fn){
    (this._ouvintes[tipo] = this._ouvintes[tipo] || []).push(fn);
  };
  VAudio.prototype.removeEventListener = function(tipo, fn){
    var L = this._ouvintes[tipo]; if (!L) return;
    var i = L.indexOf(fn); if (i >= 0) L.splice(i, 1);
  };
  VAudio.prototype._emite = function(tipo){
    var ev = { type: tipo, target: this, currentTarget: this };
    var L  = this._ouvintes[tipo];
    if (L){
      var C = L.slice();                 /* copia: handler pode remover a si mesmo */
      for (var k = 0; k < C.length; k++){
        try { C[k].call(this, ev); } catch(e){ console.error('[aula]', e); }
      }
    }
    /* 'ended' via propriedade e disparado em _passo, pra nao duplicar */
    if (tipo !== 'ended'){
      var direto = this['on' + tipo];
      if (typeof direto === 'function'){
        try { direto.call(this, ev); } catch(e){ console.error('[aula]', e); }
      }
    }
  };

  window.Audio = VAudio;

  /* -- painel exposto pra barra do professor ------------------------------ */
  window.AULA = {
    congelar: function(v){
      congelado = !!v;
      document.documentElement.classList.toggle('aula-congelado', congelado);
      if (!congelado){
        ultimo = agora();
        var f = filaRAF; filaRAF = [];
        f.forEach(function(o){ realRAF(o.cb); });
      }
    },
    congelado:  function(){ return congelado; },
    velocidade: function(v){ if (v) veloc = v; return veloc; },
    /* progresso do audio virtual que estiver tocando agora */
    tocando: function(){
      for (var i = vozes.length - 1; i >= 0; i--){
        var a = vozes[i];
        if (!a.paused && !a.ended) return { pos: a._pos, dur: a.duration };
      }
      return null;
    }
  };
  /* faxina: audios ja terminados nao precisam ficar na lista pra sempre */
  realSI(function(){
    if (vozes.length > 400) vozes = vozes.filter(function(a){ return !a.ended; });
  }, 5000);
})();
</script>
`;

/* =========================================================================
   2) BARRA DE CONTROLE DO PROFESSOR
   -------------------------------------------------------------------------
   Reaproveita os checkpoints que o app ja tem (QNAV_S1..S9) em vez de
   inventar outra navegacao: e o mesmo caminho de codigo ja testado do menu
   "Navegue nos topicos".
   ========================================================================= */
const BARRA = `
<style>
/* == MODO AULA - barra do professor == */
.aula-congelado *, .aula-congelado *::before, .aula-congelado *::after{
  animation-play-state: paused !important;
}
/* canto inferior ESQUERDO: o centro e do "Navegue nos topicos" e o canto
   direito e do #postnextbtn (o "proximo" que o app mostra nas pausas) */
#aula-bar{
  position:fixed; left:12px; bottom:10px;
  z-index:10000; display:flex; align-items:center; gap:.5em;
  padding:.45em .7em; border-radius:999px;
  background:linear-gradient(145deg,rgba(60,38,14,.93),rgba(38,24,8,.95));
  box-shadow:0 6px 22px rgba(40,20,0,.4), inset 0 1px 0 rgba(255,255,255,.14);
  font-family:'Fredoka',sans-serif; color:#f6e8cc;
  transition:opacity .25s;
}
#aula-bar.aula-min{ opacity:.25; }
#aula-bar.aula-min:hover{ opacity:1; }
#aula-bar button{
  border:0; cursor:pointer; color:#f6e8cc; background:rgba(255,255,255,.09);
  border-radius:999px; font-family:inherit; font-size:14px; line-height:1;
  padding:.5em .75em; transition:background .15s, transform .1s;
}
#aula-bar button:hover{ background:rgba(255,255,255,.2); }
#aula-bar button:active{ transform:scale(.93); }
#aula-play{ font-size:16px; padding:.5em .85em; background:rgba(214,164,74,.85); color:#2a1a06; }
#aula-play:hover{ background:rgba(230,182,96,.95); }
#aula-cp{
  min-width:11.5em; max-width:17em; text-align:center;
  font-size:12.5px; opacity:.9; padding:0 .3em;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
#aula-cp b{ font-weight:600; color:#e8c07a; }
#aula-vel{ font-size:12.5px; padding:.5em .6em; min-width:3.1em; }
#aula-prog{
  position:absolute; left:.9em; right:.9em; bottom:2px; height:2px;
  background:rgba(255,255,255,.13); border-radius:2px; overflow:hidden;
}
#aula-prog i{ display:block; height:100%; width:0; background:#d6a44a; border-radius:2px; }
#aula-hide{ font-size:11px; opacity:.55; padding:.5em .45em; }
/* a etiqueta de versao mora no mesmo canto: sobe pra cima da barra */
#app-version{ bottom:auto !important; top:6px !important; left:8px !important; }
@media (max-width:620px){
  #aula-cp{ display:none; }
  #aula-bar{ bottom:6px; left:6px; gap:.35em; }
}
</style>
<div id="aula-bar">
  <button id="aula-prev" title="Etapa anterior (seta esquerda)">&#9664;&#9664;</button>
  <button id="aula-play" title="Pausar / continuar (barra de espaco)">&#10074;&#10074;</button>
  <button id="aula-next" title="Proxima etapa (seta direita)">&#9654;&#9654;</button>
  <span   id="aula-cp"></span>
  <button id="aula-vel"  title="Velocidade">1x</button>
  <button id="aula-hide" title="Recolher a barra">&#10005;</button>
  <div id="aula-prog"><i></i></div>
</div>
<script>
/* == MODO AULA - controles do professor (gerado por build_aula.js) == */
(function(){
  'use strict';
  var VELS = [1, 1.5, 2], iVel = 0, iCp = 0, modoAnt = null;

  function $(id){ return document.getElementById(id); }

  /* -- corta a abertura/tutorial -----------------------------------------
     goTo(0) reagenda s0Init 200ms depois, e o s0Init recria um overlay
     'position:fixed;inset:0' que cobre a tela e captura os cliques. Como o
     modo aula nao tem abertura, desarma na raiz: marca como ja vista, anula
     o s0Init e desmonta o overlay se ele ja tiver subido. */
  function semAbertura(){
    window.s0AberturaDone = true;
    if (typeof window.s0Teardown === 'function') { try { window.s0Teardown(); } catch(_){} }
    window.s0Init = function(){};
  }
  semAbertura();

  /* o professor nao passa pelo tutorial, entao ele sai da navegacao tambem */
  var CORTA_S1 = { 'Início': 1, 'Tutorial do app': 1 };
  function lista(){
    var M = { s1:window.QNAV_S1, s2:window.QNAV_S2, s3:window.QNAV_S3,
              s4:window.QNAV_S4, s5:window.QNAV_S5, s6:window.QNAV_S6,
              s7:window.QNAV_S7, s8:window.QNAV_S8, s9:window.QNAV_S9 };
    var L = M[window.qnavCurMode] || [];
    if (window.qnavCurMode === 's1') L = L.filter(function(it){ return !CORTA_S1[it.label]; });
    return L;
  }

  function vaiPara(i){
    var L = lista(); if (!L.length) return;
    iCp = Math.max(0, Math.min(L.length - 1, i));
    var item = L[iCp];
    if (window.AULA.congelado()) togglePlay();        /* navegar sai da pausa */
    if (item.fn && typeof window[item.fn] === 'function') window[item.fn]();
    else if (item.idx !== undefined && typeof window.s9JumpTo === 'function') window.s9JumpTo(item.idx);
    pinta();
  }

  function togglePlay(){
    var novo = !window.AULA.congelado();
    window.AULA.congelar(novo);
    $('aula-play').innerHTML = novo ? '&#9654;' : '&#10074;&#10074;';
    $('aula-play').title = novo ? 'Continuar (barra de espaco)' : 'Pausar (barra de espaco)';
  }

  function pinta(){
    var L = lista(), el = $('aula-cp');
    if (!el) return;
    el.innerHTML = L.length
      ? '<b>' + (iCp + 1) + '/' + L.length + '</b> &middot; ' + L[iCp].label
      : '';
  }

  /* o app troca qnavCurMode ao mudar de topico; zera a etapa quando isso acontece */
  setInterval(function(){
    if (window.qnavCurMode !== modoAnt){ modoAnt = window.qnavCurMode; iCp = 0; pinta(); }
    var t = window.AULA.tocando();
    var barra = document.querySelector('#aula-prog i');
    if (barra) barra.style.width = (t && t.dur ? (t.pos / t.dur * 100) : 0).toFixed(1) + '%';
  }, 200);

  $('aula-prev').addEventListener('click', function(){ vaiPara(iCp - 1); });
  $('aula-next').addEventListener('click', function(){ vaiPara(iCp + 1); });
  $('aula-play').addEventListener('click', togglePlay);
  $('aula-vel').addEventListener('click', function(){
    iVel = (iVel + 1) % VELS.length;
    window.AULA.velocidade(VELS[iVel]);
    this.textContent = VELS[iVel] + 'x';
  });
  $('aula-hide').addEventListener('click', function(){
    $('aula-bar').classList.toggle('aula-min');
  });

  document.addEventListener('keydown', function(e){
    var alvo = e.target && e.target.tagName;
    if (alvo === 'INPUT' || alvo === 'TEXTAREA') return;
    if (e.code === 'Space'){ e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight'){ e.preventDefault(); vaiPara(iCp + 1); }
    else if (e.key === 'ArrowLeft'){  e.preventDefault(); vaiPara(iCp - 1); }
  });

  /* -- entrada: sem capa, direto no menu ---------------------------------- */
  function abreMenu(){
    if (typeof window.showScreen !== 'function'){ setTimeout(abreMenu, 120); return; }
    var capa = document.getElementById('scover');
    if (capa) capa.classList.add('hidden');
    window.showScreen('smenu');
  }
  abreMenu();

  /* -- no topico 1, entra direto na apresentacao da tabela ---------------- */
  var cardS1 = document.querySelector('.mn-card[data-section="1"]');
  if (cardS1) cardS1.addEventListener('click', function(){
    setTimeout(function(){
      semAbertura();
      if (typeof window.s1JumpToApresentacao === 'function'){
        window.s1JumpToApresentacao();
        iCp = 0; pinta();          /* ja e o 1o item da lista filtrada */
      }
    }, 700);
  });

  pinta();
})();
</script>
`;

/* =========================================================================
   3) MONTAGEM
   ========================================================================= */
function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`ERRO: index.html nao encontrado em ${RAIZ}`);
    process.exit(1);
  }

  let html = fs.readFileSync(SRC, 'utf8');
  const durs = durations(process.argv.includes('--duracoes'));
  if (!Object.keys(durs).length) {
    console.warn('AVISO: sem duracoes. As animacoes vao usar 3.0s por fala.');
  }

  // -- titulo
  html = troca(html, '<title>Tabela Periódica</title>',
                     '<title>Tabela Periódica — Modo Aula</title>', 'titulo');

  // -- sem manifest: a versao de aula nao e um PWA separado.
  //    No lugar dele vai o icone de aba, que o app nao declara (o PWA usava o
  //    manifest pra isso) e que sem isso vira um 404 de favicon.ico.
  html = troca(html, '<link rel="manifest" href="manifest.json">',
                     '<!-- modo aula: sem manifest -->\n'
                     + '<link rel="icon" type="image/png" href="icons/icon-192.png">',
                     'manifest');

  // -- etiqueta de versao (o numero muda a cada release; por isso regex)
  html = trocaRe(html, /<div id="app-version">[^<]*<\/div>/,
                 `<div id="app-version">${VERSAO}</div>`, 'etiqueta de versao');

  // -- fora o service worker: o cache do app principal nao pode servir esta pagina
  html = trocaRe(html, /<script>\s*if\('serviceWorker' in navigator\)\{[\s\S]*?\r?\n<\/script>/,
                 '<!-- modo aula: sem service worker -->', 'service worker');

  // -- shim ANTES de qualquer script do app (nada usa Audio antes daqui)
  const shim = SHIM.replace('__DURACOES__', JSON.stringify(durs));
  html = trocaRe(html, /<script>\r?\n\(function\(\)\{\r?\n  function checkOrientation\(\)\{/,
                 (m) => shim + m, 'primeiro <script>');

  // -- barra do professor por ultimo, com o app todo ja definido
  html = troca(html, '</body>', BARRA + '\n</body>', 'fim do body');

  fs.writeFileSync(DST, html, 'utf8');
  console.log(`OK: aula.html gerado (${Math.round(Buffer.byteLength(html, 'utf8') / 1024)} KB)`);
  console.log('    index.html: intacto');

  // -- copia pro repo do professor, onde ele se chama index.html
  if (process.argv.includes('--repo')) {
    if (!fs.existsSync(REPO)) {
      console.error(`ERRO: repo do professor nao encontrado em ${REPO}`);
      process.exit(1);
    }
    fs.writeFileSync(path.join(REPO, 'index.html'), html, 'utf8');
    console.log(`OK: ${path.join(REPO, 'index.html')}`);
    console.log('    falta so: git add -A && git commit && git push');
  }
}

main();
