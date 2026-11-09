'use strict';
/* ---------- Equipe irmã: indicar pilotos e reestilizar (0.8.6) ---------- */
(function () {
  const sc = SCREENS.sister; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if (Career.isObs(G)) return out;
    const child = Sisters.childOf(G, G.player.teamId); if (!child) return out;
    const c = Career.team(G, child);
    const race = G.db.drivers.filter(d => d.team === child && d.seat !== 'R').sort((a, b) => a.seat - b.seat);
    const cands = Sisters.nomCandidates(G, child);
    const SRC = { academy: byLang('Academia', 'Academy'), reserve: byLang('Seu reserva', 'Your reserve'), free: byLang('Livre', 'Free agent') };
    const nom = K85.card({ t: `${byLang('Indicar pilotos para a', 'Nominate drivers for')} ${c.name}`, flush: true,
      body: K85.table([[byLang('Carro', 'Car'), 'c'], [byLang('Piloto atual', 'Current driver')], [byLang('Nota', 'Rating'), 'c'], [byLang('Contrato', 'Contract'), 'c'], ['', 'r']],
        race.map(d => [`<b class="n-num">#${d.seat}</b>`, K85.who(d.id, { tid: child }), `<b class="n-num">${driverOverall(d)}</b>`, `<span class="n-num">${d.contract ? d.contract.until : G.season.year + Math.max(0, d.contractYears || 0)}</span>`, G.weekend ? `<small class="n-mu">${byLang('depois da corrida', 'after the race')}</small>` : `<button class="btn sm" data-act="sisNomOpen86" data-id="${d.id}" ${cands.length ? '' : 'disabled'}>${byLang('Substituir', 'Replace')}</button>`])) +
        `<p class="n-mu n-sm" style="margin:10px 14px">${byLang(`Como dona da ${esc(c.name)}, você escolhe quem corre nela: alguém da academia, o seu reserva ou um piloto livre com superlicença (${cands.length} disponíveis). Quem sai vira reserva da irmã ou fica livre; a rescisão sai do caixa da irmã.`, `As owner of ${esc(c.name)}, you choose who races there: someone from the academy, your reserve or a free agent with a super licence (${cands.length} available). The driver who leaves becomes the sister team's reserve or a free agent; the sister team pays any termination.`)}</p>` });
    const reb = c.rebranded;
    const brand = K85.card({ t: byLang('Identidade da equipe', 'Team identity'), a: `<button class="btn sm primary" data-act="sisBrandGo86">${byLang('Reestilizar', 'Restyle')}</button>`,
      body: `<div class="br86-now">${teamLogo(c)}<div><b>${esc(c.fullName || c.name)}</b><small class="n-mu">${esc(c.short || '')} · ${esc(c.chassisName || '')}</small><span class="br86-sw"><i style="background:${c.color}"></i><i style="background:${c.color2 || c.color}"></i></span></div></div>
        <p class="n-mu n-sm">${reb ? byLang(`Identidade nova desde ${reb.y} (antes: ${esc(reb.from.name)}).`, `New identity since ${reb.y} (formerly ${esc(reb.from.name)}).`) + ` <a data-act="sisBrandRestore86">${byLang('voltar à original', 'restore the original')}</a>` : byLang('Você pode trocar nome, sigla, cores, logo e nome do chassi da equipe irmã.', 'You can change the sister team name, code, colours, logo and chassis name.')}</p>` });
    return out + K85.grid('minmax(0,1.5fr) minmax(0,1fr)', nom, brand);
  };
  ACT.sisNomOpen86 = (el) => {
    const child = Sisters.childOf(G, G.player.teamId); const d = Career.driver(G, el.dataset.id); if (!child || !d) return;
    const SRC = { academy: byLang('Academia', 'Academy'), reserve: byLang('Seu reserva', 'Your reserve'), free: byLang('Livre', 'Free agent') };
    const list = Sisters.nomCandidates(G, child);
    modal(byLang(`Quem entra no lugar de ${d.name}?`, `Who replaces ${d.name}?`), `<div class="stack">${list.map(x => `<button class="btn opt" data-act="sisNom86" data-out="${d.id}" data-in="${x.d.id}"><span>${esc(x.d.name)} · ${x.d.age} ${byLang('anos', 'years')}</span><span class="small muted">${SRC[x.src]} · ${byLang('nota', 'rating')} ${driverOverall(x.d)}${x.d.cat ? ' · ' + esc(((typeof Cats !== 'undefined' && Cats.get(G, x.d.cat)) || {}).short || '') : ''}</span></button>`).join('') || `<p class="muted">${byLang('Ninguém disponível com superlicença.', 'Nobody available with a super licence.')}</p>`}</div>`);
  };
  ACT.sisNom86 = (el) => { const child = Sisters.childOf(G, G.player.teamId); const e = Sisters.nominate(G, child, el.dataset.out, el.dataset.in); closeModal(); if (e) return toast(e, 'bad'); toast(byLang('Indicação feita. Vale a partir da próxima etapa.', 'Nomination done. It applies from the next round.'), 'good'); autosave(); render(); };
  ACT.sisBrandGo86 = () => { const child = Sisters.childOf(G, G.player.teamId); const t = Career.team(G, child); if (!t) return; UI.brand = { child, name: t.name, fullName: t.fullName || t.name, short: t.short || '', color: t.color, color2: t.color2 || t.color, logo: 'keep', chassisName: t.chassisName || '', keepCar: !!t.carImg }; go('sisterBrand'); };
  ACT.sisBrandRestore86 = () => { const e = Sisters.restoreBrand(G, Sisters.childOf(G, G.player.teamId)); if (e) return toast(e, 'bad'); toast(byLang('Identidade original de volta.', 'Original identity restored.'), 'good'); autosave(); render(); };
  // depois de comprar, já abre a tela de identidade
  const buy = ACT.sisBuy;
  ACT.sisBuy = (el) => { buy(el); if (Sisters.childOf(G, G.player.teamId)) ACT.sisBrandGo86(); };
})();

SCREENS.sisterBrand = {
  html() {
    const B = UI.brand; const t = B && Career.team(G, B.child);
    if (!t || Sisters.parentOf(G, B.child) !== G.player.teamId) return K85.empty(byLang('Nenhuma equipe irmã para reestilizar.', 'No sister team to restyle.'));
    const prev = { ...t, name: B.name || t.name, short: (B.short || (B.name || '').slice(0, 3)).toUpperCase(), color: B.color, color2: B.color2, logo: B.logo === 'keep' ? t.logo : B.logo, carImg: null };
    const logos = (typeof GENERIC_LOGOS !== 'undefined' ? GENERIC_LOGOS : []).map((p, i) => `<button class="tlogo ${B.logo === p ? 'on' : ''}" style="--tc:${B.color};width:48px;height:48px;cursor:pointer;${B.logo === p ? 'outline:3px solid var(--acc);' : ''}" data-act="brLogo86" data-v="${p}" title="${i + 1}"><img src="${imgUrl(p)}" alt=""></button>`).join('');
    const f = (k, label, max, ph) => `<label class="field"><span>${label}</span><input class="inp" value="${esc(B[k] || '')}" maxlength="${max}" data-inp="brT86" data-k="${k}" placeholder="${esc(ph || '')}"></label>`;
    return K85.head({ t: byLang('Nova identidade', 'New identity'), s: `${esc(t.rebranded ? t.rebranded.from.name : t.name)} · ${byLang('equipe irmã', 'sister team')}`, act: K85.btn(byLang('Voltar', 'Back'), { act: 'go', v: 'sister' }) }) +
      K85.grid('minmax(0,1.4fr) minmax(0,1fr)',
        K85.card({ t: byLang('Nome e cores', 'Name and colours'), body: `<div class="grid g2" style="gap:10px">${f('name', byLang('Nome', 'Name'), 28, 'Racing Bulls')}${f('fullName', byLang('Nome completo', 'Full name'), 48, 'Visa Cash App Racing Bulls F1 Team')}${f('short', byLang('Sigla (3 letras)', 'Code (3 letters)'), 3, 'RB')}${f('chassisName', byLang('Nome do chassi', 'Chassis name'), 16, 'VCARB 03')}
            <label class="field"><span>${byLang('Cor principal', 'Main colour')}</span><input class="inp" type="color" style="height:42px;padding:3px" value="${esc(B.color)}" data-chg="brC86" data-k="color"></label>
            <label class="field"><span>${byLang('Cor secundária', 'Second colour')}</span><input class="inp" type="color" style="height:42px;padding:3px" value="${esc(B.color2)}" data-chg="brC86" data-k="color2"></label></div>
          <div class="label" style="margin-top:12px">${byLang('Logo', 'Logo')}</div><div class="row" style="flex-wrap:wrap;gap:6px"><button class="btn sm ${B.logo === 'keep' ? 'primary' : ''}" data-act="brLogo86" data-v="keep">${byLang('Manter o atual', 'Keep current')}</button>${logos}</div>
          <label class="field" style="margin-top:10px"><span>${byLang('Ou importe o seu logo (PNG, JPG, SVG ou WEBP)', 'Or import your own logo (PNG, JPG, SVG or WEBP)')}</span><input class="inp" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-chg="brFile86"></label>
          <label class="row" style="gap:8px;margin-top:10px"><input type="checkbox" ${B.keepCar ? 'checked' : ''} data-chg="brCar86"> <span class="n-sm">${byLang('Manter a foto do carro atual (desmarque se a pintura nova não combina)', 'Keep the current car photo (untick if the new livery does not match)')}</span></label>` }),
        K85.col(K85.card({ t: byLang('Prévia', 'Preview'), body: `<div class="br86-prev" style="--c1:${B.color};--c2:${B.color2}"><div class="br86-stripe"></div>${teamLogo(prev)}<b>${esc(B.fullName || B.name || '')}</b><small>${esc(prev.short)} · ${esc(B.chassisName || '')}</small></div><div style="margin-top:12px">${K85.tm ? `<span class="n-tm"><i class="n-slab" style="background:${B.color}"></i>${esc(B.name || '')}</span>` : ''}</div>` }),
          K85.card({ body: `<p class="n-mu n-sm">${byLang('A nova identidade aparece em todo o jogo: classificação, corrida, notícias e redes. As trocas reais de patrocinador da temporada deixam de valer para esta equipe. Dá para voltar à identidade original na tela da equipe irmã.', 'The new identity shows across the game: standings, race, news and social media. The season\'s real sponsor-name changes no longer apply to this team. You can restore the original identity on the sister team screen.')}</p><button class="btn primary" data-act="brSave86">${byLang('Aplicar nova identidade', 'Apply new identity')}</button>` })));
  },
};
ACT.brLogo86 = (el) => { UI.brand.logo = el.dataset.v; render(); };
CHG.brT86 = (el) => { UI.brand[el.dataset.k] = el.value; };
CHG.brC86 = (el) => { UI.brand[el.dataset.k] = el.value; render(); };
CHG.brCar86 = (el) => { UI.brand.keepCar = el.checked; };
CHG.brFile86 = (el) => {
  const f = el.files && el.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 256 / Math.max(img.width, img.height)); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); UI.brand.logo = c.toDataURL('image/png'); render(); }; img.src = rd.result; };
  rd.readAsDataURL(f);
};
ACT.brSave86 = () => { const B = UI.brand; const e = Sisters.rebrand(G, B.child, B); if (e) return toast(e, 'bad'); toast(byLang('Nova identidade aplicada.', 'New identity applied.'), 'good'); autosave(); go('sister'); };
AREA_OF85.sisterBrand = 'equipe'; SCREEN_TITLE85.sisterBrand = 'Nova identidade';
