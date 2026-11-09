/* ============================================================
   PIT WALL — Conta: perfil do jogador e chave de ativação.
   Por enquanto são telas sem efeito no jogo (versão de desenvolvimento):
   nada é enviado para a internet e nenhuma função depende da ativação.
   ============================================================ */
'use strict';

NAV.splice(NAV.findIndex(n => n[0] === 'saves') + 1, 0, ['account', 'Perfil e ativação', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0M17 4l2 2 3-3']);

const Account = {
  DEFAULT: { name: 'Kaio Moratelli', email: 'kaio.moratelli@gmail.com', plan: 'Desenvolvedor', key: '', activated: false },
  PLANS: { Desenvolvedor: 'Acesso completo para desenvolvimento e testes da Moratelli Game Company.' },
  get() { try { return Object.assign({}, Account.DEFAULT, JSON.parse(localStorage.getItem('pw-account') || '{}')); } catch (e) { return { ...Account.DEFAULT }; } },
  set(v) { try { localStorage.setItem('pw-account', JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
  // formato previsto: PW-XXXXX-XXXXX-XXXXX-XXXXX (letras e números)
  valid: (k) => /^PW(-[A-Z0-9]{5}){4}$/.test(k),
};

function accountHtml() {
  const a = Account.get();
  return `<div class="grid g2">
    <div class="panel"><div class="panel-h"><h3>Perfil</h3><span class="chip">${esc(a.plan)}</span></div><div class="panel-b stack">
      <div class="row" style="gap:14px;flex-wrap:nowrap"><span class="hs xl noimg" style="--tc:var(--accent)"><b>${esc(initials(a.name))}</b></span>
        <div class="stack" style="gap:2px;min-width:0"><b style="font-size:18px">${esc(a.name)}</b><span class="small muted" style="overflow-wrap:anywhere">${esc(a.email)}</span><span class="small">Plano: <b>${esc(a.plan)}</b></span></div></div>
      <p class="small muted">${esc(Account.PLANS[a.plan] || '')}</p>
      <label class="field"><span>Nome</span><input class="inp" value="${esc(a.name)}" data-chg="accSet" data-k="name"></label>
      <label class="field"><span>E-mail</span><input class="inp" type="email" value="${esc(a.email)}" data-chg="accSet" data-k="email"></label>
      <p class="small muted">Perfil guardado só neste computador. As contas online ainda não existem nesta versão.</p>
    </div></div>
    <div class="panel"><div class="panel-h"><h3>Chave de ativação</h3><span class="chip ${a.activated ? 'good' : 'acc'}">${a.activated ? 'Ativado' : 'Versão de desenvolvimento'}</span></div><div class="panel-b stack">
      <p class="small">Quando o PitWall for lançado, a chave que vem com a compra será informada aqui. Nesta versão de desenvolvimento o jogo funciona por completo sem ativação.</p>
      <label class="field"><span>Chave do produto</span><input class="inp num" id="acc-key" placeholder="PW-XXXXX-XXXXX-XXXXX-XXXXX" maxlength="26" value="${esc(a.key)}" style="text-transform:uppercase;letter-spacing:.06em"></label>
      <div class="row"><button class="btn primary" data-act="accActivate">Ativar</button>${a.key ? '<button class="btn ghost" data-act="accClear">Remover chave</button>' : ''}</div>
      ${disclaimerHtml()}<dl class="kv"><dt>Produto</dt><dd>PitWall Racing Simulator</dd><dt>Versão</dt><dd>${esc(APP_VERSION)}</dd><dt>Editora</dt><dd>${esc(COMPANY)}</dd><dt>Situação</dt><dd>${a.activated ? 'Ativado' : 'Desenvolvimento (sem ativação)'}</dd></dl>
    </div></div>
  </div>`;
}
SCREENS.account = {
  html() { return `<div class="page-head"><div><div class="eyebrow">Sistema</div><h1>Perfil e ativação</h1></div>${mgcLogo(30)}</div>${accountHtml()}`; },
};
CHG.accSet = (el) => { const a = Account.get(); a[el.dataset.k] = el.value.trim() || Account.DEFAULT[el.dataset.k]; Account.set(a); toast('Perfil salvo.'); if (G) render(); };
ACT.accActivate = () => {
  const k = ($('#acc-key').value || '').trim().toUpperCase();
  const a = Account.get();
  if (!Account.valid(k)) return toast('Chave inválida. O formato é PW-XXXXX-XXXXX-XXXXX-XXXXX.', 'bad');
  a.key = k; Account.set(a);
  toast('Chave guardada. A ativação online ainda não está disponível nesta versão.');
  if (G) render(); else ACT.openAccount();
};
ACT.accClear = () => { const a = Account.get(); a.key = ''; a.activated = false; Account.set(a); if (G) render(); else ACT.openAccount(); };
// na tela inicial (sem carreira aberta) a conta abre numa janela
ACT.openAccount = () => { closeModal(); modal('Perfil e ativação', accountHtml()); };
