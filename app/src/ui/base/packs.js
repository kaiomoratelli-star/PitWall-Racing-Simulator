/* ============================================================
   PIT WALL — Pacote de dados na interface (0.9, Onda 3, passo 3)
   O jogo base é fictício. O Pacote de dados que vem com o jogo (app/dist/packs/*.js no desktop,
   bloco embutido na versão web) só acrescenta o JSON à lista PITWALL_PACKS; aqui ele é conferido
   e instalado (Pack.boot), ANTES de qualquer tela carregar, porque algumas telas leem os dados ao abrir.
   Sem pacote (edição gratuita), o mundo é o fictício. Um pacote inválido não muda nada.
   ============================================================ */
'use strict';

const PACK_BOOT = Pack.boot(typeof PITWALL_PACKS !== 'undefined' ? PITWALL_PACKS : []);

/* nome do pacote no idioma do jogo */
const packName = (p) => (p ? byLang(p.name, p.nameEn || p.name) : '');

/* por que um save não abre com o pacote instalado (Pack.canOpen); nada no save é alterado */
const packRefusal = (r) => {
  if (r.why === 'missing') return byLang(`Este save foi criado com o Pacote de dados “${packName(r.need)}”, que não está instalado nesta edição do jogo. Nada foi alterado.`, `This save was created with the “${packName(r.need)}” data pack, which is not installed in this edition of the game. Nothing was changed.`);
  if (r.why === 'other') return byLang(`Este save foi criado com o Pacote de dados “${packName(r.need)}”, mas o instalado é “${packName(r.have)}”. Nada foi alterado.`, `This save was created with the “${packName(r.need)}” data pack, but the installed one is “${packName(r.have)}”. Nothing was changed.`);
  return byLang(`Este save é do mundo fictício (sem Pacote de dados) e não abre com o pacote “${packName(r.have)}” instalado. Nada foi alterado.`, `This save belongs to the fictional world (no data pack) and cannot be opened with the “${packName(r.have)}” data pack installed. Nothing was changed.`);
};

/* chamado pelo boot depois da primeira tela: avisa se o pacote do jogo veio quebrado */
const packBootNotice = () => {
  if (!PACK_BOOT || !PACK_BOOT.errors.length) return;
  Store.log('error', 'Pacote de dados recusado: ' + PACK_BOOT.errors.join(' | '));
  if (!PACK_BOOT.installed) toast(byLang('O Pacote de dados que vem com o jogo está danificado e não foi carregado. O jogo abriu com o mundo fictício.', 'The data pack that ships with the game is damaged and was not loaded. The game opened with the fictional world.'), 'bad');
};
