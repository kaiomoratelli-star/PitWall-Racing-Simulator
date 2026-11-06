/* ============================================================
   PIT WALL — portal de notícias, redes sociais e histórias
   ============================================================ */
'use strict';

function fmtCount(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' mi' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.', ',') + ' mil' : String(n); }
function newsWhen(n) { const tr = G.season.year === n.year ? Career.track(G, G.season.calendar[Math.min(n.round, G.season.calendar.length - 1)]) : null; return `${n.year}${tr ? ' · ' + esc(tr.gp.replace(/^GP (d[aoe]s? )?/, '')) : ''}`; }
function newsImg(n, big) {
  const tr = n.tr && Career.track(G, n.tr);
  if (tr && imgUrl(tr.heroImg)) return `<div class="nimg" style="background-image:url('${imgUrl(tr.heroImg)}')"></div>`;
  const d = n.dr && Career.driver(G, n.dr[0]);
  const t = (n.tm && Career.team(G, n.tm[0])) || (d && d.team && Career.team(G, d.team));
  const col = t ? t.color : '#3a3a44';
  if (d && imgUrl(d.img)) return `<div class="nimg person" style="--tc:${col}"><img src="${imgUrl(d.img)}" alt="" loading="lazy" onerror="this.remove()">${big && t && imgUrl(t.carImg) ? `<img class="ncar" src="${imgUrl(t.carImg)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
  if (t && imgUrl(t.carImg)) return `<div class="nimg car" style="--tc:${col}"><img src="${imgUrl(t.carImg)}" alt="" loading="lazy" onerror="this.remove()"></div>`;
  return `<div class="nimg plain" style="--tc:${col}"><span>${esc(d ? initials(d.name) : t ? t.short : (Media.TAGS[n.tag] || 'F1'))}</span></div>`;
}
function outletName(n) { return n.outlet && Media.OUTLETS[n.outlet] ? Media.OUTLETS[n.outlet].name : 'Paddock'; }

SCREENS.news = {
  html() {
    const tab = UI.params.tab || 'top';
    const tabs = [['top', 'Manchetes'], ['social', 'Redes sociais'], ['stories', 'Histórias e rivalidades']];
    let body = '';
    if (tab === 'top') body = newsTopHtml();
    if (tab === 'social') body = socialFeedHtml(G.social || [], 80);
    if (tab === 'stories') body = storiesHtml();
    return `<div class="page-head"><div><div class="eyebrow">Paddock</div><h1>Notícias</h1></div><div class="seg">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="news" data-p='${JSON.stringify({ tab: k })}'>${l}</button>`).join('')}</div></div>${body}`;
  },
};
function newsTopHtml() {
  const f = UI.params.tag || 'all';
  const tags = ['all', ...new Set(G.news.map(n => n.tag))];
  const list = G.news.filter(n => f === 'all' || n.tag === f);
  if (!list.length) return '<div class="panel"><div class="empty">Sem notícias por enquanto.</div></div>';
  const lead = list.find(n => n.main) || list[0];
  const rest = list.filter(n => n !== lead);
  return `<div class="row" style="margin-bottom:12px;flex-wrap:wrap">${tags.map(t => `<button class="chip ${t === f ? 'acc' : ''}" data-act="go" data-v="news" data-p='${JSON.stringify({ tab: 'top', tag: t })}'>${t === 'all' ? 'Tudo' : esc(Media.TAGS[t] || t)}</button>`).join('')}</div>
  <div class="news-layout"><div>
    <article class="nlead" data-act="newsOpen" data-id="${lead.id}" tabindex="0">${newsImg(lead, true)}<div class="nlead-txt"><div class="ntag">${esc(Media.TAGS[lead.tag] || lead.tag)} · ${esc(outletName(lead))}</div><h2>${esc(lead.title)}</h2>${lead.body ? `<p>${esc(lead.body.slice(0, 220))}${lead.body.length > 220 ? '…' : ''}</p>` : ''}<span class="small muted">${newsWhen(lead)}</span></div></article>
    <div class="ngrid">${rest.slice(0, 30).map(n => `<article class="ncard" data-act="newsOpen" data-id="${n.id}" tabindex="0">${newsImg(n)}<div class="ncard-txt"><div class="ntag">${esc(Media.TAGS[n.tag] || n.tag)} · ${esc(outletName(n))}</div><h3>${esc(n.title)}</h3><span class="small muted">${newsWhen(n)}</span></div></article>`).join('')}</div>
  </div><aside><div class="panel"><div class="panel-h"><h3>Nas redes</h3><button class="btn sm ghost" data-act="go" data-v="news" data-p='{"tab":"social"}'>Ver tudo</button></div>${socialFeedHtml((G.social || []).slice(0, 8), 8, true)}</div></aside></div>`;
}
ACT.newsOpen = (el) => {
  const n = G.news.find(x => String(x.id) === el.dataset.id); if (!n) return;
  const related = (G.social || []).filter(p => (n.dr || []).includes(p.about) || (n.tm || []).includes(p.about)).slice(0, 3);
  modal(n.title, `<div class="narticle">${newsImg(n, true)}<div class="ntag">${esc(Media.TAGS[n.tag] || n.tag)} · ${esc(outletName(n))} · ${newsWhen(n)}</div>${(n.body || 'Sem mais detalhes por enquanto.').split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕ])/).reduce((acc, s, i) => { const k = Math.floor(i / 2); (acc[k] = acc[k] || []).push(s); return acc; }, []).map(p => `<p>${esc(p.join(' '))}</p>`).join('')}
  ${(n.dr || []).length ? `<div class="row" style="flex-wrap:wrap">${n.dr.map(id => Career.driver(G, id)).filter(Boolean).map(d => `<button class="chip" data-act="driverPage" data-id="${d.id}">${esc(d.name)}</button>`).join('')}</div>` : ''}
  ${related.length ? `<h4 style="margin-top:12px">Repercussão</h4>${socialFeedHtml(related, 3, true)}` : ''}</div>`);
};

/* ---------- rede social ---------- */
function socialAvatar(by) {
  if (by.kind === 'driver') { const d = Career.driver(G, by.ref); if (d) return headshot(d, 'sm'); }
  if (by.kind === 'team') { const t = Career.team(G, by.ref); if (t) return teamLogo(t, 'sm'); }
  if (by.kind === 'media') return `<span class="sav media">${esc(by.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase())}</span>`;
  return `<span class="sav fan">${esc(by.handle[0].toUpperCase())}</span>`;
}
function socialFeedHtml(list, max, compact) {
  if (!list.length) return '<div class="empty">Nada nas redes ainda. As postagens aparecem depois das corridas e das notícias do mercado.</div>';
  return `<div class="sfeed ${compact ? 'compact' : ''}">${list.slice(0, max).map(p => `<div class="spost"><div class="sav-wrap">${socialAvatar(p.by)}</div><div class="sbody"><div class="shead"><b>${esc(p.by.name)}</b>${p.by.kind !== 'fan' ? '<span class="sverif" title="Conta oficial">✓</span>' : ''}<span class="muted small">@${esc(p.by.handle)} · ${p.y}${p.r != null ? ' · etapa ' + (p.r + 1) : ''}</span></div><div class="stext">${esc(p.text)}</div><div class="sstats small muted"><span>♥ ${fmtCount(p.likes)}</span><span>⟲ ${fmtCount(p.reposts)}</span></div></div></div>`).join('')}</div>`;
}

/* ---------- histórias e rivalidades ---------- */
function storiesHtml() {
  const m = G.memory || { rivals: {} };
  const rivals = Object.values(m.rivals).filter(r => Career.driver(G, r.a) && Career.driver(G, r.b)).sort((a, b) => b.score - a.score);
  const hist = G.news.filter(n => ['historia', 'rivalidade', 'escandalo', 'campeonato'].includes(n.tag)).slice(0, 25);
  const stage = (s) => s >= 14 ? ['Explosiva', 'bad'] : s >= 8 ? ['Quente', 'acc'] : s >= 4.5 ? ['Nascendo', 'good'] : ['Morna', ''];
  return `<div class="grid g2">
    <div class="panel"><div class="panel-h"><h3>Rivalidades</h3><span class="small muted">Nascem de batidas, disputas por posição e brigas pelo título; esfriam entre temporadas</span></div><div class="panel-b stack">
      ${rivals.length ? rivals.slice(0, 12).map(r => { const A = Career.driver(G, r.a), B = Career.driver(G, r.b); const [lbl, cls] = stage(r.score); return `<div class="rival"><div class="rival-h">${headshot(A, 'sm')}<b>${esc(A.name)}</b><span class="muted">x</span><b>${esc(B.name)}</b>${headshot(B, 'sm')}<span class="spacer"></span><span class="chip ${cls}">${lbl}</span></div>${bar(Math.min(r.score, 20), 20, r.score >= 8 ? '' : 'g')}<div class="small muted">Desde ${r.since}${r.crashes ? ` · ${r.crashes} batida(s)` : ''}${A.team && A.team === B.team ? ' · companheiros de equipe' : ''}</div>${r.log.length ? `<ul class="rlog">${r.log.slice(0, 4).map(x => `<li><span class="num muted">${x.y}</span> ${esc(x.t)}</li>`).join('')}</ul>` : ''}</div>`; }).join('') : '<p class="muted">Nenhuma rivalidade ainda. Elas surgem com o tempo.</p>'}
    </div></div>
    <div class="panel"><div class="panel-h"><h3>Linha do tempo</h3></div><div class="panel-b tight"><div class="mail-list">${hist.map(n => `<button class="mail" data-act="newsOpen" data-id="${n.id}"><span class="dot" style="background:${n.tag === 'escandalo' ? 'var(--red)' : n.tag === 'historia' ? 'var(--purple)' : 'var(--accent)'}"></span><span style="min-width:0"><span class="t"><b>${esc(n.title)}</b></span><br><span class="small muted">${esc(Media.TAGS[n.tag] || n.tag)} · ${esc(outletName(n))}</span></span><span class="small muted num">${n.year}</span></button>`).join('') || '<div class="empty">Marcos, recordes e polêmicas aparecem aqui.</div>'}</div></div></div>
  </div>`;
}

/* ---------- opções de som ---------- */
const _savesHtml = SCREENS.saves.html;
SCREENS.saves.html = function () {
  return _savesHtml.call(this) + `<div class="panel" style="margin-top:16px"><div class="panel-h"><h3>Som</h3></div><div class="panel-b stack">
    <label class="check"><input type="checkbox" ${Sound.on ? 'checked' : ''} data-chg="soundOn"> Sons do jogo (motor, luzes de largada, pit stop, Safety Car)</label>
    <label class="field"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${Sound.vol}" data-chg="soundVol" aria-label="Volume"></label>
    <div class="row"><button class="btn sm" data-act="soundTest">Testar</button></div>
  </div></div>`;
};
CHG.soundOn = (el) => { Sound.on = el.checked; if (el.checked) Sound.prime(); };
CHG.soundVol = (el) => { Sound.vol = Number(el.value); Sound.ui(); };
ACT.soundTest = () => { Sound.prime(); Sound.beep(); setTimeout(Sound.beep, 300); setTimeout(Sound.go, 700); setTimeout(Sound.stopDrone, 2500); };
ACT.soundToggle = () => { Sound.on = !Sound.on; if (Sound.on) Sound.prime(); toast(Sound.on ? 'Som ligado.' : 'Som desligado.'); if (typeof updateRace === 'function' && UI.view === 'race') updateRace(); };
