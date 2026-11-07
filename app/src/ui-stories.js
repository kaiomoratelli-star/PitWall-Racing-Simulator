/* ============================================================
   PIT WALL — notícias e eventos na interface (Fase 6)
   - Linha do tempo estilo X: criadores de conteúdo (marcados como
     simulação), respostas, curtir e repostar.
   - NewsVisualEnricher: notícia sem foto ganha arte gerada (transferência,
     regulamento, investigação, técnica, números do piloto).
   - "Em números" na matéria: dados da carreira de quem é citado.
   - Memória (homenagens) na aba Histórias.
   - Opções: incluir pessoas reais no ciclo da vida (desligado por padrão).
   - Diagnóstico: forçar eventos e ver eventos acobertados.
   ============================================================ */
'use strict';

/* ---------- linha do tempo ---------- */
const _socialAvatar = socialAvatar;
socialAvatar = function (by) {
  if (by.kind === 'creator') return `<span class="sav creator">${esc(by.name.replace(/[^A-Za-zÀ-ú0-9 ]/g, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</span>`;
  return _socialAvatar(by);
};
socialFeedHtml = function (list, max, compact) {
  if (!list.length) return `<div class="empty">${byLang('Nada nas redes ainda. As postagens aparecem depois das corridas e das notícias do mercado.', 'Nothing on social media yet. Posts appear after races and market news.')}</div>`;
  const liked = UI.liked || (UI.liked = new Set());
  return `<div class="sfeed ${compact ? 'compact' : ''}">${list.slice(0, max).map(p => {
    const me = liked.has(p.id);
    const handle = p.by.handle ? `@${esc(p.by.handle)}` : p.by.kind === 'creator' ? `<span class="chip sim" title="${byLang('Perfil real usado em reação simulada pelo jogo; o texto não foi escrito pela pessoa.', 'Real profile used in a reaction simulated by the game; the text was not written by the person.')}">${byLang('simulação', 'simulation')}</span>` : '';
    const thread = !compact && p.replies && p.replies.length ? `<div class="sthread">${p.replies.map(r => `<div class="srep"><b>${esc(r.by.replace(/_/g, ' '))}</b> <span class="muted small">@${esc(r.by)}</span><div>${esc(r.text)}</div></div>`).join('')}</div>` : '';
    return `<div class="spost"><div class="sav-wrap">${socialAvatar(p.by)}</div><div class="sbody"><div class="shead"><b>${esc(p.by.name)}</b>${['driver', 'team', 'media'].includes(p.by.kind) ? `<span class="sverif" title="${byLang('Conta oficial', 'Official account')}">✓</span>` : ''}<span class="muted small">${handle} · ${p.y}${p.r != null ? ' · ' + byLang('etapa', 'round') + ' ' + (p.r + 1) : ''}</span></div><div class="stext">${esc(p.text)}</div>
      <div class="sstats small muted"><span>💬 ${fmtCount(p.nreplies || (p.replies || []).length || Math.round(p.likes * 0.02))}</span><span>⟲ ${fmtCount(p.reposts)}</span><button class="slike ${me ? 'on' : ''}" data-act="sLike" data-id="${p.id}" aria-label="${byLang('Curtir', 'Like')}">${me ? '♥' : '♡'} ${fmtCount(p.likes + (me ? 1 : 0))}</button></div>${thread}</div></div>`;
  }).join('')}</div>`;
};
ACT.sLike = (el) => { const id = +el.dataset.id; const L = UI.liked || (UI.liked = new Set()); if (L.has(id)) L.delete(id); else L.add(id); render(); };

/* ---------- arte gerada para notícias sem foto (NewsVisualEnricher) ---------- */
function newsArt(n) {
  const t = n.tm && Career.team(G, n.tm[0]);
  const t2 = n.tm && n.tm[1] && Career.team(G, n.tm[1]);
  const d = n.dr && Career.driver(G, n.dr[0]);
  const col = t ? t.color : '#3a3a44';
  const icon = { escandalo: '⚖', regulamento: '§', tecnica: '⚙', 'técnica': '⚙', paddock: '◆', historia: '★', rumor: '?', mercado: '⇄', campeonato: '🏆' }[n.tag] || '●';
  const lbl = esc(T(Media.TAGS[n.tag] || n.tag));
  if (n.tag === 'mercado' || n.tag === 'rumor') {
    const from = d && d.team && t && d.team !== t.id ? Career.team(G, d.team) : t2;
    return `<div class="nimg art" style="--tc:${col}"><svg viewBox="0 0 320 180" aria-hidden="true"><rect width="320" height="180" fill="${from ? from.color : '#2a2a34'}" opacity=".35"/><rect x="160" width="160" height="180" fill="${col}" opacity=".45"/><path d="M120 90h80m-16-14 16 14-16 14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="80" y="100" text-anchor="middle" fill="#fff" font-size="26" font-weight="700">${esc(from ? from.short || '' : '?')}</text><text x="240" y="100" text-anchor="middle" fill="#fff" font-size="26" font-weight="700">${esc(t ? t.short || '' : '')}</text></svg><span class="art-lbl">${lbl}</span></div>`;
  }
  if (n.tag === 'tecnica' || n.tag === 'técnica') return `<div class="nimg art blueprint" style="--tc:${col}">${typeof devCarSvg === 'function' ? devCarSvg('', []) : ''}<span class="art-lbl">${lbl}</span></div>`;
  if (d && d.career) {
    const c = d.career;
    return `<div class="nimg art" style="--tc:${col}"><div class="art-stats"><b>${esc(d.name)}</b><span>${c.starts || 0} GPs · ${c.wins || 0} ${byLang('vitórias', 'wins')} · ${c.podiums || 0} ${byLang('pódios', 'podiums')}${c.titles ? ` · ${c.titles} ${byLang('títulos', 'titles')}` : ''}</span></div><span class="art-lbl">${lbl}</span></div>`;
  }
  return `<div class="nimg art" style="--tc:${col}"><span class="art-ico">${icon}</span><span class="art-lbl">${lbl}</span></div>`;
}
const _newsImg = newsImg;
newsImg = function (n, big) {
  const h = _newsImg(n, big);
  return h.includes('nimg plain') ? newsArt(n) : h;
};

/* "Em números" e repercussão dos criadores na matéria */
(function () {
  const open = ACT.newsOpen;
  ACT.newsOpen = (el) => {
    open(el);
    const n = G.news.find(x => String(x.id) === el.dataset.id);
    const d = n && n.dr && Career.driver(G, n.dr[0]);
    const box = document.querySelector('.narticle');
    if (!d || !box || !d.career) return;
    const c = d.career, st = G.season.stats[d.id] || {};
    box.insertAdjacentHTML('beforeend', `<div class="panel" style="margin-top:12px;background:var(--bg2)"><div class="panel-h"><h3>${byLang('Em números', 'By the numbers')}: ${esc(d.name)}</h3></div><div class="panel-b grid g4">
      <div><span class="label">GPs</span><div class="stat-big">${c.starts || 0}</div></div><div><span class="label">${byLang('Vitórias', 'Wins')}</span><div class="stat-big">${c.wins || 0}</div></div>
      <div><span class="label">${byLang('Pódios', 'Podiums')}</span><div class="stat-big">${c.podiums || 0}</div></div><div><span class="label">${G.season.year}</span><div class="stat-big">${G.season.standD[d.id] || 0}</div><span class="small muted">${byLang('pontos', 'points')}${st.best ? ` · ${byLang('melhor', 'best')} ${ordinal(st.best)}` : ''}</span></div></div></div>`);
  };
})();

/* memória na aba Histórias */
(function () {
  const sh = storiesHtml;
  storiesHtml = function () {
    const M = G.memorial || [];
    return sh() + (M.length ? `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Memória', 'In memoriam')}</h3></div><div class="panel-b stack">${M.slice().reverse().map(m => `<div class="row between"><span><b>${esc(m.name)}</b> <span class="small muted">${esc(m.role || '')}${m.team ? ' · ' + esc(m.team) : ''}${m.real ? '' : ' · ' + byLang('personagem fictício', 'fictional character')}</span></span><span class="small muted">${m.y} · ${m.age} ${byLang('anos', 'years')}</span></div>`).join('')}</div></div>` : '');
  };
})();

/* opções: pessoas reais no ciclo da vida */
(function () {
  const sv = SCREENS.saves.html;
  SCREENS.saves.html = function () {
    const html = sv.call(this);
    if (!G || !G.options) return html;
    const o = G.options;
    const extra = `<label class="check"><input type="checkbox" ${o.realMortality ? 'checked' : ''} data-chg="opt" data-k="realMortality"> ${byLang('Ciclo da vida também para pessoas reais', 'Life cycle also for real people')}</label>
      <p class="small muted" style="margin-top:-6px">${byLang('Desligado por padrão. Com frequência baixíssima, o jogo pode registrar o falecimento por causas naturais de personagens idosos. Ligado, inclui ex-pilotos e funcionários reais (sempre como ficção do jogo, sem relação com a realidade).', 'Off by default. Very rarely, the game may record the death by natural causes of elderly characters. When on, it includes real former drivers and staff (always as game fiction, unrelated to reality).')}</p>`;
    return html.replace('<label class="field"><span>Treinos livres por fim de semana</span>', extra + '<label class="field"><span>Treinos livres por fim de semana</span>');
  };
})();

/* diagnóstico: eventos e modo de depuração */
(function () {
  const dg = SCREENS.diag.html;
  SCREENS.diag.html = function () {
    const S = Stories.state(G);
    return dg.call(this) + `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Eventos (depuração)', 'Events (debug)')}</h3><span class="small muted">${byLang('forçar eventos para testar; o resultado entra na carreira', 'force events for testing; the result goes into the career')}</span></div><div class="panel-b stack">
      <div class="row" style="flex-wrap:wrap;gap:6px"><button class="btn sm" data-act="forceEv" data-k="raro">${byLang('Incidente raro', 'Rare incident')}</button><button class="btn sm" data-act="forceEv" data-k="escandalo">${byLang('Escândalo (fictício)', 'Scandal (fictional)')}</button><button class="btn sm" data-act="forceEv" data-k="falecimento">${byLang('Falecimento (personagem fictício)', 'Death (fictional character)')}</button><button class="btn sm" data-act="forceEv" data-k="anuncios">${byLang('Liberar anúncios oficiais', 'Release official announcements')}</button></div>
      <div class="small">${byLang('Anúncios aguardando', 'Pending announcements')}: <b>${S.queue.length}</b> · ${byLang('Escândalos ocultos', 'Hidden scandals')}: <b>${S.hidden.filter(h => !h.out).length}</b> (${byLang('acobertados', 'covered up')}: ${S.hidden.filter(h => h.covered).length})</div>
      <div class="tbl-wrap"><table class="tbl"><tbody>${S.log.slice(0, 12).map(x => `<tr><td class="num small">${x.y} · ${x.r}</td><td class="small">${esc(x.tier)}</td><td class="small">${esc(x.kind)}</td><td class="small">${x.tid ? esc((Career.team(G, x.tid) || {}).name || '') : ''}</td></tr>`).join('') || `<tr><td class="muted small">${byLang('Nenhum evento ainda.', 'No events yet.')}</td></tr>`}</tbody></table></div>
    </div></div>`;
  };
})();
ACT.forceEv = (el) => { Stories.force(G, el.dataset.k); autosave(); toast(byLang('Evento forçado. Veja notícias e caixa de entrada.', 'Event forced. Check news and inbox.'), 'good'); render(); };
