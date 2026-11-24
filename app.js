/* =====================================================================
   Croisade · Suivi des actions — le site
   Toutes les données viennent de la base Supabase (voir config.js).
   ===================================================================== */
"use strict";

/* ---------------- petits outils ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const nf = n => String(Math.round(Number(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const pct = (a, b) => b ? Math.round(a / b * 100) + " %" : "—";
const pct1 = (a, b) => b ? (a / b * 100).toFixed(1).replace(".", ",") + " %" : "—";
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const fmtD = d => { if (!d) return "—"; const [y, m, j] = d.slice(0, 10).split("-"); return `${+j} ${MOIS[+m - 1]}`; };
const fmtDL = d => { if (!d) return "—"; const [y, m, j] = d.slice(0, 10).split("-"); return `${+j} ${MOIS[+m - 1]} ${y}`; };
const today = () => new Date().toISOString().slice(0, 10);
const uniq = arr => [...new Map(arr.filter(Boolean).map(x => [norm(x), String(x).trim()])).values()];
const initials = n => String(n || "?").split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
const sum = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 3200); }
const ICON = {
  home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  bilan: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  people: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6 6 0 0 0-3.5-5.4"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>',
  list: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5d6488" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  palette: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.2-4-7.7-9-7.7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>',
  clip: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d3bd1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/></svg>'
};
const MEDALS = [["#f6c445", "#5a3e00"], ["#d5dae6", "#333a55"], ["#e3a26f", "#4d2a0b"], ["#eef1f6", "#4a5175"]];

/* ---------------- connexion à la base ---------------- */
const CFG = window.CONFIG || {};
const sb = window.__MOCK_SB || window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
async function q(table) { const { data, error } = await sb.from(table).select("*"); if (error) throw error; return data || []; }
async function ins(table, rows) { const { data, error } = await sb.from(table).insert(rows).select(); if (error) throw error; return data || []; }
async function upd(table, id, patch) { const { data, error } = await sb.from(table).update(patch).eq("id", id).select(); if (error) throw error; if (!data || !data.length) throw new Error("permission"); return data[0]; }
async function del(table, col, val) { const { error } = await sb.from(table).delete().eq(col, val); if (error) throw error; }
function errMsg(e) {
  const m = (e && (e.message || e.details)) || String(e);
  if (/converti_doit_etre_suivi/.test(m)) return "Indique qui suit chaque converti.";
  if (/row-level security|permission|policy/i.test(m)) return "Tu n'as pas le droit de modifier ce pôle.";
  if (/Invalid login credentials/i.test(m)) return "Email ou mot de passe incorrect.";
  if (/already registered/i.test(m)) return "Un compte existe déjà avec cet email : connecte-toi.";
  if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton email (regarde ta boîte mail, et les spams).";
  if (/Password should be/i.test(m)) return "Le mot de passe doit faire au moins 6 caractères.";
  return "Erreur : " + m;
}

/* ---------------- état ---------------- */
const S = {
  poles: [], campagnes: [], types: [], stats: [], parcours: [],
  actions: [], presents: [], personnes: [], invitations: [], compte: null, comptes: [], session: null,
  view: "accueil", periode: null, pole: "all", q: "", typeF: "all", listF: "convertis", annee: null, recovery: false
};
const role = () => S.compte?.role || null;
const isAdmin = () => role() === "admin";
const membre = () => !!S.compte;
const canWrite = poleId => isAdmin() || (role() === "dirigeant" && S.compte.pole_id === Number(poleId));
const canWriteAny = () => isAdmin() || (role() === "dirigeant" && !!S.compte.pole_id);
const canPresent = () => isAdmin() || role() === "dirigeant";
const poleById = id => S.poles.find(p => p.id === Number(id));
const typeById = id => S.types.find(t => t.id === Number(id));
const campById = id => S.campagnes.find(c => c.id === Number(id));
const poleColor = id => poleById(id)?.couleur || "#8790b5";
const campForDate = d => S.campagnes.find(c => d >= c.date_debut && d <= c.date_fin);

async function loadAll() {
  [S.poles, S.campagnes, S.types, S.stats, S.parcours] = await Promise.all([q("poles"), q("campagnes"), q("types_evangelisation"), q("stats_actions"), q("stats_parcours")]);
  S.poles.sort((a, b) => a.id - b.id); S.types.sort((a, b) => a.ordre - b.ordre); S.campagnes.sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  S.actions = []; S.presents = []; S.personnes = []; S.invitations = []; S.compte = null; S.comptes = [];
  if (S.session) {
    const { data } = await sb.from("comptes").select("*").eq("id", S.session.user.id);
    S.compte = data && data[0] ? data[0] : null;
    if (S.compte) {
      [S.actions, S.presents, S.personnes, S.invitations] = await Promise.all([q("actions"), q("presents"), q("personnes"), q("invitations")]);
      if (isAdmin()) S.comptes = await q("comptes");
    }
  }
}
async function refresh() {
  try { await loadAll(); } catch (e) { console.error(e); toast(errMsg(e)); }
  if (!S.periode) S.periode = defaultPeriode();
  if (!S.annee) S.annee = String(new Date().getFullYear());
  render();
}

/* ---------------- périodes ---------------- */
function defaultPeriode() {
  const withData = [...S.campagnes].reverse().find(c => S.stats.some(r => r.date_action >= c.date_debut && r.date_action <= c.date_fin));
  return withData ? "c:" + withData.id : (S.campagnes.length ? "c:" + S.campagnes[S.campagnes.length - 1].id : "all");
}
function inPer(d, per = S.periode) {
  if (!d) return false; d = d.slice(0, 10);
  if (!per || per === "all") return true;
  if (per.startsWith("c:")) { const c = campById(per.slice(2)); return c ? d >= c.date_debut && d <= c.date_fin : true; }
  if (per.startsWith("y:")) return d.startsWith(per.slice(2));
  return true;
}
function perLabel(per = S.periode) {
  if (per.startsWith("c:")) return campById(per.slice(2))?.nom || "Campagne";
  if (per.startsWith("y:")) return "Année " + per.slice(2);
  return "Depuis le début";
}
function perDates(per = S.periode) {
  if (per.startsWith("c:")) { const c = campById(per.slice(2)); if (c) return `Du ${fmtDL(c.date_debut)} au ${fmtDL(c.date_fin)}`; }
  if (per.startsWith("y:")) return "Du 1er janvier au 31 décembre " + per.slice(2);
  return "Toutes les actions enregistrées";
}
const years = () => uniq([...S.stats.map(r => (r.date_action || "").slice(0, 4)), ...S.parcours.map(r => String(r.jour || "").slice(0, 4)), String(new Date().getFullYear())]).filter(y => /^\d{4}$/.test(y)).sort().reverse();
const inPole = (r, pole = S.pole) => pole === "all" || r.pole_id === Number(pole);

/* ---------------- calculs ---------------- */
function actStats(rows) {
  const freres = sum(rows, "nb_freres"), inv = sum(rows, "nb_invites");
  return { n: rows.length, freres, inv, part: freres + inv, convA: sum(rows, "nb_conversions"), clubs: sum(rows, "nb_clubs_lecture"), rest: sum(rows, "nb_restaurations") };
}
function parcoursStats(per = S.periode, pole = S.pole) {
  const out = { nouvelle_personne: 0, conversion: 0, bapteme: 0, ajout_eglise: 0 };
  if (membre() && S.personnes.length) {
    S.personnes.filter(p => inPole(p, pole)).forEach(p => {
      if (inPer(p.premier_contact, per)) out.nouvelle_personne++;
      if (p.date_conversion && inPer(p.date_conversion, per)) out.conversion++;
      if (p.date_bapteme && inPer(p.date_bapteme, per)) out.bapteme++;
      if (p.date_ajout_eglise && inPer(p.date_ajout_eglise, per)) out.ajout_eglise++;
    });
  } else {
    S.parcours.filter(r => inPole(r, pole) && inPer(String(r.jour), per)).forEach(r => { out[r.etape] = (out[r.etape] || 0) + Number(r.nombre); });
  }
  return out;
}
const statsF = (pole = S.pole) => S.stats.filter(r => inPer(r.date_action) && inPole(r, pole));
function cityRows(rows) {
  const m = new Map();
  rows.forEach(r => { const k = norm(r.ville) || "—"; const o = m.get(k) || { ville: r.ville || "Non précisée", rows: [] }; o.rows.push(r); m.set(k, o); });
  return [...m.values()].map(o => ({ ville: o.ville, ...actStats(o.rows) })).sort((a, b) => b.n - a.n);
}
const namesUsed = () => uniq([...S.presents.map(p => p.nom), ...S.actions.map(a => a.responsable), ...S.personnes.map(p => p.suivi_par)]).sort((a, b) => a.localeCompare(b));

/* ---------------- navigation ---------------- */
const VIEWS = ["accueil", "bilan", "personnes", "cr", "nouveau", "presentation", "compte", "admin", "connexion"];
function route() { const h = location.hash.slice(1).split("?")[0]; S.view = VIEWS.includes(h) ? h : "accueil"; render(); }
window.addEventListener("hashchange", route);
function chrome() {
  $("#appName").textContent = CFG.NOM || "Croisade · Suivi des actions";
  const items = [["accueil", "Accueil"], ["bilan", "Bilan"]];
  if (membre()) items.push(["cr", "Comptes rendus"], ["personnes", "Suivi des personnes"]);
  if (isAdmin()) items.push(["admin", "Admin"]);
  $("#nav").innerHTML = items.map(([v, l]) => `<a href="#${v}" class="${S.view === v ? "on" : ""}">${l}</a>`).join("");
  $("#who").innerHTML = `<button class="iconbtn" id="themeBtn" aria-label="Apparence (couleur, mode sombre)" title="Apparence">${ICON.palette}</button>` +
    (canPresent() ? `<a class="btn ghost sm" href="#presentation">${ICON.play.replace('width="22" height="22"', 'width="16" height="16"')}<span class="hide-m">Présenter</span></a>` : "") +
    (canWriteAny() ? `<a class="btn sm hide-m" href="#nouveau">+ Nouveau CR</a>` : "") +
    (S.session ? `<a class="btn ghost sm" href="#compte" title="Mon compte">${esc(initials(S.compte?.nom || S.session.user.email))}</a>` : `<a class="btn ghost sm" href="#connexion">Se connecter</a>`);
  const tb = [["accueil", "Accueil", ICON.home], ["bilan", "Bilan", ICON.bilan]];
  tb.push(canWriteAny() ? ["nouveau", "", ICON.plus, "plus"] : (membre() ? ["cr", "CR", ICON.list] : null));
  tb.push(membre() ? ["personnes", "Personnes", ICON.people] : ["connexion", "Connexion", ICON.people]);
  if (canPresent()) tb.push(["presentation", "Présenter", ICON.play]);
  $("#themeBtn").onclick = themeDialog;
  $("#tabbar").innerHTML = tb.filter(Boolean).map(([v, l, ic, cls]) => `<a href="#${v}" class="${cls || ""} ${S.view === v ? "on" : ""}" ${cls ? 'aria-label="Nouveau compte rendu"' : ""}>${ic}${l}</a>`).join("");
}
function render() {
  chrome();
  const v = S.view;
  if (S.recovery) return viewNewPassword();
  if (v === "presentation" && !canPresent()) return membre() ? viewInfo("Le mode présentation est réservé aux dirigeants et à l'administratrice.") : viewLogin("Le mode présentation est réservé aux dirigeants et à l'administratrice.");
  if (v === "presentation") { S.view = "accueil"; try { history.replaceState(null, "", "#accueil"); } catch (e) {} chrome(); viewAccueil(); return openDeck(); }
  if (["cr", "personnes"].includes(v) && !membre()) return viewLogin("Connecte-toi pour voir les comptes rendus et le suivi des personnes.");
  if (v === "nouveau" && !canWriteAny()) return membre() ? viewInfo("Seuls les dirigeants peuvent ajouter un compte rendu.", "Si tu es dirigeant(e), demande à l'administratrice de te désigner.") : viewLogin("Connecte-toi pour ajouter un compte rendu.");
  if (v === "admin" && !isAdmin()) return viewInfo("Réservé à l'administratrice.");
  if (v === "compte" && !S.session) return viewLogin();
  ({ accueil: viewAccueil, bilan: viewBilan, personnes: viewPersonnes, cr: viewCR, nouveau: () => { const init = S.editInit || {}; S.editInit = null; viewForm(init); }, compte: viewCompte, admin: viewAdmin, connexion: () => viewLogin() })[v]();
  window.scrollTo(0, 0);
}
function viewInfo(t, d) { $("#view").innerHTML = `<div class="card login"><h2>${esc(t)}</h2>${d ? `<p class="note">${esc(d)}</p>` : ""}<a class="btn" href="#accueil">Retour à l'accueil</a></div>`; }
function periodeChips(id = "perChips") {
  const opts = [...S.campagnes.map(c => ["c:" + c.id, c.nom]), ...years().map(y => ["y:" + y, "Année " + y]), ["all", "Global"]];
  return `<div class="seg" id="${id}" role="tablist" aria-label="Période">${opts.map(([v, l]) => `<button role="tab" aria-selected="${S.periode === v}" class="${S.periode === v ? "on" : ""}" data-per="${v}">${esc(l)}</button>`).join("")}</div>`;
}
function poleChips() {
  return `<div class="chips" aria-label="Pôle"><button class="chip ${S.pole === "all" ? "on" : ""}" data-pole="all">Tous les pôles</button>${S.poles.map(p => `<button class="chip ${S.pole == p.id ? "on" : ""}" data-pole="${p.id}"><span class="dot" style="background:${p.couleur}"></span>${esc(p.nom.replace("Pôle ", ""))}</button>`).join("")}</div>`;
}
function bindFilters(rerender) {
  $$("[data-per]").forEach(b => b.onclick = () => { S.periode = b.dataset.per; rerender(); });
  $$("[data-pole]").forEach(b => b.onclick = () => { S.pole = b.dataset.pole; rerender(); });
}

/* =====================================================================
   ACCUEIL
   ===================================================================== */
function kpiHTML(a, p) {
  return [
    [a.n, "Actions", `${nf(a.part)} participants`, ""],
    [a.inv, "Invités", `${pct(a.inv, a.part)} des participants`, ""],
    [p.conversion, "Conversions", `${pct(p.conversion, a.part)} des participants`, "peach"],
    [a.rest, "Restaurations", "retours à la foi", ""],
    [p.bapteme, "Baptêmes", `${pct(p.bapteme, p.conversion)} des convertis`, ""],
    [p.ajout_eglise, "Ajoutés à l'église", "nouveaux membres", ""]
  ].map(([n, l, d, c]) => `<div class="kpi ${c}"><div class="num">${nf(n)}</div><div class="l">${l}</div><div class="d">${d}</div></div>`).join("");
}
function viewAccueil() {
  const rows = statsF("all"), a = actStats(rows), p = parcoursStats(S.periode, "all");
  const ranking = S.poles.map(pl => { const r = rows.filter(x => x.pole_id === pl.id); return { pl, n: r.length, conv: parcoursStats(S.periode, pl.id).conversion }; }).sort((x, y) => y.n - x.n);
  const max = Math.max(1, ...ranking.map(r => r.n));
  const recent = (membre() ? [...S.actions] : [...S.stats]).sort((x, y) => (y.date_action || "").localeCompare(x.date_action || "")).slice(0, 4);
  $("#view").innerHTML = `
    <section class="hero">
      <div class="eyebrow">Gloire à Dieu</div>
      <h1>${nf(p.conversion)} conversion${p.conversion > 1 ? "s" : ""} pour ${nf(a.part)} participants</h1>
      <div class="dates">${esc(perLabel())} · ${esc(perDates())}</div>
      <div class="kpis">${kpiHTML(a, p)}</div>
    </section>
    <div class="mt">${periodeChips()}</div>
    <div class="row mt">
      <section class="card grow">
        <h2>Classement des pôles <span class="note" style="font-weight:500;font-family:Inter">· en nombre d'actions</span></h2>
        ${ranking.map((r, i) => `<div class="rank"><div class="medal" style="background:${MEDALS[Math.min(i, 3)][0]};color:${MEDALS[Math.min(i, 3)][1]}">${i + 1}</div><div class="body">
          <div class="top-l"><b>${esc(r.pl.nom)}</b><b style="color:var(--chip-ink)">${nf(r.n)} action${r.n > 1 ? "s" : ""}</b></div>
          <div class="bar"><i style="width:${r.n / max * 100}%;background:${r.pl.couleur}"></i></div>
          <div class="note" style="margin-top:4px">${nf(r.conv)} conversion${r.conv > 1 ? "s" : ""}</div></div></div>`).join("")}
      </section>
      <section class="grow stack" style="gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:0 4px"><h2 style="font-size:19px;font-weight:800">Derniers comptes rendus</h2>${membre() ? `<a href="#cr" style="font-weight:600;font-size:14px">Tout voir</a>` : ""}</div>
        ${recent.map(actionCard).join("") || `<div class="card empty">Aucun compte rendu pour l'instant.${canWriteAny() ? ' <a href="#nouveau">Ajouter le premier</a>' : ""}</div>`}
        ${!membre() ? `<p class="note">Les détails (thèmes, équipes, noms) sont visibles après connexion. <a href="#connexion">Se connecter</a></p>` : ""}
      </section>
    </div>`;
  bindFilters(viewAccueil);
  bindActionCards();
}
function actionCard(a) {
  const pl = poleById(a.pole_id), t = typeById(a.type_id);
  const pres = a.responsable !== undefined ? S.presents.filter(p => p.action_id === a.id).length : a.nb_freres;
  const inv = a.responsable !== undefined ? S.invitations.filter(i => i.action_id === a.id).length : a.nb_invites;
  return `<button class="item" style="--c:${pl?.couleur || "#ccd"}" data-act="${esc(a.id)}">
    <div class="m" style="margin-top:0"><span class="tag">${esc(t?.nom || "Action")}</span><span class="tag grey">${esc(pl?.nom || "")}${a.ville ? " · " + esc(a.ville) : ""}</span></div>
    ${a.theme ? `<div class="t" style="margin-top:8px">${esc(a.theme)}</div>` : ""}
    <div class="m">${fmtD(a.date_action)} · ${nf(pres + inv)} participants · ${nf(inv)} invité${inv > 1 ? "s" : ""}</div>
    ${a.responsable ? `<div class="resp">Responsable : <b style="color:var(--ink)">${esc(a.responsable)}</b> · ${pres} frère${pres > 1 ? "s" : ""} présent${pres > 1 ? "s" : ""}</div>` : ""}
  </button>`;
}
function bindActionCards() { $$("[data-act]").forEach(el => el.onclick = () => { const a = S.actions.find(x => x.id === el.dataset.act); if (a) actionDetail(a); else if (!membre()) location.hash = "#connexion"; }); }

/* =====================================================================
   BILAN
   ===================================================================== */
function viewBilan() {
  const rows = statsF(), a = actStats(rows), p = parcoursStats();
  const allRows = statsF("all");
  const types = S.types.map(t => [t.nom, rows.filter(r => r.type_id === t.id).length]).filter(x => x[1]).sort((x, y) => y[1] - x[1]);
  const tmax = Math.max(1, ...types.map(x => x[1]));
  const poles = S.pole === "all" ? S.poles : S.poles.filter(x => x.id === Number(S.pole));
  const partMax = Math.max(1, ...S.poles.map(pl => allRows.filter(r => r.pole_id === pl.id).length));
  $("#view").innerHTML = `
    <div class="page-h"><div><h1>Bilan</h1><div class="sub">${esc(perLabel())} · ${esc(perDates())}</div></div></div>
    <div class="stack" style="gap:12px">${periodeChips()}${poleChips()}</div>
    <section class="hero mt" style="padding:20px 24px">
      <div class="eyebrow">Total · ${esc(perLabel())}${S.pole !== "all" ? " · " + esc(poleById(S.pole)?.nom) : ""}</div>
      <div class="kpis" style="margin-top:12px">${kpiHTML(a, p)}</div>
    </section>
    <div class="row mt">
      <section class="card grow"><h2>Types d'évangélisation</h2>
        ${types.map(([t, n]) => `<div class="hbar"><span>${esc(t)}</span><div class="bar" style="margin:0"><i style="width:${n / tmax * 100}%"></i></div><span class="v">${n}</span></div>`).join("") || `<div class="empty">Aucune action sur cette période.</div>`}
        ${membre() ? `<a class="paste mt" href="#personnes" style="background:var(--orange-bg);border:1px solid var(--orange-line)"><span style="flex:1"><b style="color:var(--ink)">Suivi des personnes</b><br><span class="note">Convertis, baptisés, ajoutés à l'église</span></span><b style="color:var(--orange)">Voir →</b></a>` : ""}
      </section>
      <section class="card grow"><h2>Part de chaque pôle</h2>
        ${S.poles.map(pl => { const n = allRows.filter(r => r.pole_id === pl.id).length; return `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:14px"><span style="display:flex;align-items:center;gap:8px;font-weight:700"><span class="dot" style="background:${pl.couleur}"></span>${esc(pl.nom)}</span><b>${pct1(n, allRows.length)}</b></div><div class="bar"><i style="width:${n / partMax * 100}%;background:${pl.couleur}"></i></div></div>`; }).join("")}
      </section>
    </div>
    <h2 style="font-size:21px;font-weight:800;margin:26px 0 12px">Par pôle et par ville</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">
      ${poles.map(pl => { const r = rows.filter(x => x.pole_id === pl.id), s = actStats(r), ps = parcoursStats(S.periode, pl.id), cities = cityRows(r);
        return `<section class="card" style="border-top:5px solid ${pl.couleur}"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><h3 style="font-size:18px;font-weight:800">${esc(pl.nom)}</h3><span class="note">${s.n} actions · ${ps.conversion} conv. · ${ps.bapteme} bapt.</span></div>
        ${cities.length ? `<div class="scroll-x"><table class="mt" style="margin-top:10px"><thead><tr><th>Ville</th><th>Actions</th><th>Participants</th><th>Conversions</th><th>Restau.</th></tr></thead><tbody>
          ${cities.map(c => `<tr><td>${esc(c.ville)}</td><td>${c.n}</td><td>${nf(c.part)}</td><td class="c-or">${c.convA}</td><td>${c.rest}</td></tr>`).join("")}
          <tr class="tot"><td>Total</td><td>${s.n}</td><td>${nf(s.part)}</td><td>${s.convA}</td><td>${s.rest}</td></tr></tbody></table></div>` : `<div class="empty" style="padding:14px">Aucune action sur cette période.</div>`}</section>`; }).join("")}
    </div>`;
  bindFilters(viewBilan);
}

/* =====================================================================
   SUIVI DES PERSONNES
   ===================================================================== */
function viewPersonnes() {
  const per = S.annee === "all" ? "all" : "y:" + S.annee;
  const p = parcoursStats(per, S.pole);
  const yrs = years();
  let P = S.personnes.filter(x => inPole(x));
  if (S.listF === "convertis") P = P.filter(x => x.date_conversion);
  if (S.listF === "baptises") P = P.filter(x => x.date_bapteme);
  if (S.listF === "ajoutes") P = P.filter(x => x.date_ajout_eglise);
  if (S.q) P = P.filter(x => norm([x.nom, x.ville, x.suivi_par, x.notes].join(" ")).includes(norm(S.q)));
  P.sort((a, b) => (b.date_conversion || b.premier_contact || "").localeCompare(a.date_conversion || a.premier_contact || ""));
  const step = (k, n, l, d, cls) => `<div class="step-card ${cls}"><div class="k">ÉTAPE ${k}</div><div class="num">${nf(n)}</div><div class="l">${l}</div><div class="d">${d}</div></div>`;
  $("#view").innerHTML = `
    <div class="page-h"><div><h1>Suivi des personnes</h1><div class="lock">${ICON.lock}Visible uniquement par les personnes connectées</div></div>
      <select class="sel" id="annee" aria-label="Année">${yrs.map(y => `<option value="${y}" ${S.annee === y ? "selected" : ""}>Année ${y}</option>`).join("")}<option value="all" ${S.annee === "all" ? "selected" : ""}>Toutes les années</option></select></div>
    <div class="mb">${poleChips()}</div>
    <section class="card mt"><h2>Le parcours ${S.annee === "all" ? "depuis le début" : "en " + S.annee}</h2>
      <div class="steps">
        ${step(1, p.nouvelle_personne, "Nouvelles personnes", "invitées aux actions", "st-blue")}
        ${step(2, p.conversion, "Convertis", `${pct(p.conversion, p.nouvelle_personne)} des nouvelles personnes`, "st-or")}
        ${step(3, p.bapteme, "Baptisés", `${pct(p.bapteme, p.conversion)} des convertis`, "st-ok")}
        ${step(4, p.ajout_eglise, "Ajoutés à l'église", `${pct(p.ajout_eglise, p.conversion)} des convertis`, "st-soft")}
      </div>
    </section>
    <section class="card mt"><h2>Année par année</h2><div class="scroll-x"><table><thead><tr><th>Année</th><th>Nouvelles personnes</th><th>Convertis</th><th>Baptisés</th><th>Ajoutés à l'église</th></tr></thead><tbody>
      ${yrs.map(y => { const s = parcoursStats("y:" + y, S.pole); return `<tr><td><b>${y}</b></td><td>${nf(s.nouvelle_personne)}</td><td class="c-or">${nf(s.conversion)}</td><td>${nf(s.bapteme)}</td><td>${nf(s.ajout_eglise)}</td></tr>`; }).join("")}
    </tbody></table></div></section>
    <div class="toolbar mt">
      <div class="seg" role="tablist" aria-label="Liste">${[["convertis", "Convertis"], ["baptises", "Baptisés"], ["ajoutes", "Ajoutés à l'église"], ["tous", "Toutes les personnes"]].map(([k, l]) => `<button role="tab" aria-selected="${S.listF === k}" class="${S.listF === k ? "on" : ""}" data-lf="${k}">${l}</button>`).join("")}</div>
      <label class="search">${ICON.search}<input id="q" placeholder="Rechercher un nom, une ville, un suiveur…" value="${esc(S.q)}" aria-label="Rechercher"></label>
    </div>
    <div class="note" style="margin-bottom:8px">${P.length} personne${P.length > 1 ? "s" : ""}</div>
    <div class="list">${P.map(personCard).join("") || `<div class="card empty">Personne dans cette liste pour l'instant.</div>`}</div>`;
  bindFilters(viewPersonnes);
  $("#annee").onchange = e => { S.annee = e.target.value; viewPersonnes(); };
  $$("[data-lf]").forEach(b => b.onclick = () => { S.listF = b.dataset.lf; viewPersonnes(); });
  const qi = $("#q"); qi.oninput = () => { S.q = qi.value; clearTimeout(qi.t); qi.t = setTimeout(() => { const pos = qi.selectionStart; viewPersonnes(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); }, 250); };
  $$("[data-pers]").forEach(el => el.onclick = () => personDetail(S.personnes.find(x => x.id === el.dataset.pers)));
}
function stepTags(p) {
  return [["date_conversion", "Converti(e)", "or"], ["date_bapteme", "Baptisé(e)", "ok"], ["date_ajout_eglise", "Ajouté(e) à l'église", "ok"]]
    .map(([k, l, c]) => p[k] ? `<span class="tag ${c}">✓ ${l} · ${fmtD(p[k])}</span>` : `<span class="tag off">${l}</span>`).join("");
}
function personCard(p) {
  const pl = poleById(p.pole_id);
  return `<button class="item" style="--c:${pl?.couleur || "#ccd"}" data-pers="${esc(p.id)}">
    <div style="display:flex;gap:12px;align-items:center"><div class="avatar" style="background:${pl?.couleur || "#8790b5"}22;color:${pl?.couleur || "#4a5175"}">${esc(initials(p.nom))}</div>
      <div style="min-width:0"><div class="t">${esc(p.nom)}</div><div class="note">${esc(pl?.nom || "")}${p.ville ? " · " + esc(p.ville) : ""} · rencontré(e) le ${fmtD(p.premier_contact)}</div></div></div>
    <div class="m">${stepTags(p)}</div>
    ${p.suivi_par ? `<div class="resp">Suivi(e) par <b style="color:var(--ink)">${esc(p.suivi_par)}</b></div>` : ""}
  </button>`;
}
function personDetail(p) {
  if (!p) return;
  const w = canWrite(p.pole_id);
  const hist = S.invitations.filter(i => i.personne_id === p.id).map(i => ({ i, a: S.actions.find(a => a.id === i.action_id) })).filter(x => x.a).sort((x, y) => x.a.date_action.localeCompare(y.a.date_action));
  openModal(`<h3>${esc(p.nom)}</h3>
    <div class="kv"><div>Pôle</div><div>${esc(poleById(p.pole_id)?.nom || "")}</div><div>Ville</div><div>${esc(p.ville || "—")}</div><div>Rencontré(e) le</div><div>${fmtDL(p.premier_contact)}</div><div>Suivi(e) par</div><div>${esc(p.suivi_par || "—")}</div></div>
    <div class="m chips" style="margin-bottom:14px">${stepTags(p)}</div>
    ${hist.length ? `<div class="f"><span>Présent(e) aux actions</span><div class="chips">${hist.map(({ i, a }) => `<span class="tag grey">${fmtD(a.date_action)} · ${esc(typeById(a.type_id)?.nom || "")}${i.converti ? " · converti(e)" : ""}${i.club_lecture ? " · club" : ""}${i.restauration ? " · restauration" : ""}</span>`).join("")}</div></div>` : ""}
    ${p.notes ? `<div class="f"><span>Notes</span><div class="pre">${esc(p.notes)}</div></div>` : ""}
    ${p.modifie_par ? `<p class="note">Dernière modification par ${esc(p.modifie_par)}${p.modifie_le ? " le " + fmtDL(p.modifie_le) : ""}</p>` : ""}
    <div class="row" style="gap:8px;margin-top:10px">${w ? `<button class="btn" id="edit">Modifier</button><button class="btn ghost" id="delp">Supprimer</button>` : ""}<button class="btn ghost" id="close" style="margin-left:auto">Fermer</button></div>`);
  $("#close").onclick = closeModal;
  if (w) { $("#edit").onclick = () => personForm(p); confirmBtn($("#delp"), async () => { try { await del("personnes", "id", p.id); closeModal(); toast("Fiche supprimée"); refresh(); } catch (e) { toast(errMsg(e)); } }); }
}
function personForm(p) {
  const dl = `<datalist id="dlNames">${namesUsed().map(n => `<option value="${esc(n)}">`).join("")}</datalist>`;
  const d = (k, l) => `<label class="f">${l}<input type="date" id="pf_${k}" value="${esc(p[k] || "")}"></label>`;
  openModal(`<h3>Modifier la fiche</h3>${dl}
    <div class="grid2"><label class="f">Nom<input id="pf_nom" value="${esc(p.nom)}"></label><label class="f">Ville<input id="pf_ville" value="${esc(p.ville || "")}"></label></div>
    <div class="grid2">${d("premier_contact", "Rencontré(e) le")}<label class="f">Suivi(e) par<input id="pf_suivi" list="dlNames" value="${esc(p.suivi_par || "")}"></label></div>
    <div class="grid2">${d("date_conversion", "Converti(e) le")}${d("date_bapteme", "Baptisé(e) le")}${d("date_ajout_eglise", "Ajouté(e) à l'église le")}</div>
    <label class="f">Notes<textarea id="pf_notes">${esc(p.notes || "")}</textarea></label>
    <div class="row" style="gap:8px"><button class="btn" id="ok">Enregistrer</button><button class="btn ghost" id="close" style="margin-left:auto">Annuler</button></div>`);
  $("#close").onclick = closeModal;
  $("#ok").onclick = async () => {
    const v = id => $(id).value.trim();
    const patch = { nom: v("#pf_nom"), ville: v("#pf_ville") || null, premier_contact: v("#pf_premier_contact") || p.premier_contact, suivi_par: v("#pf_suivi") || null,
      date_conversion: v("#pf_date_conversion") || null, date_bapteme: v("#pf_date_bapteme") || null, date_ajout_eglise: v("#pf_date_ajout_eglise") || null, notes: v("#pf_notes") || null };
    if (!patch.nom) return toast("Indique un nom");
    if (patch.date_conversion && !patch.suivi_par) return toast("Indique qui suit cette personne");
    try { await upd("personnes", p.id, patch); closeModal(); toast("Fiche enregistrée ✓"); refresh(); } catch (e) { toast(errMsg(e)); }
  };
}

/* =====================================================================
   COMPTES RENDUS — liste et détail
   ===================================================================== */
function viewCR() {
  let A = S.actions.filter(a => inPer(a.date_action) && inPole(a));
  if (S.typeF !== "all") A = A.filter(a => a.type_id === Number(S.typeF));
  if (S.q) A = A.filter(a => norm([a.theme, a.ville, a.lieu, a.responsable, a.compte_rendu, ...S.presents.filter(p => p.action_id === a.id).map(p => p.nom)].join(" ")).includes(norm(S.q)));
  A.sort((a, b) => (b.date_action || "").localeCompare(a.date_action || ""));
  $("#view").innerHTML = `
    <div class="page-h"><div><h1>Comptes rendus</h1><div class="sub">${A.length} action${A.length > 1 ? "s" : ""} · ${esc(perLabel())}</div></div>${canWriteAny() ? `<a class="btn" href="#nouveau">+ Nouveau CR</a>` : ""}</div>
    <div class="stack" style="gap:12px">${periodeChips()}${poleChips()}</div>
    <div class="toolbar mt"><label class="search">${ICON.search}<input id="q" placeholder="Rechercher : thème, ville, nom…" value="${esc(S.q)}" aria-label="Rechercher"></label>
      <select class="sel" id="tF" aria-label="Type"><option value="all">Tous les types</option>${S.types.map(t => `<option value="${t.id}" ${S.typeF == t.id ? "selected" : ""}>${esc(t.nom)}</option>`).join("")}</select></div>
    <div class="list">${A.map(actionCard).join("") || `<div class="card empty">Aucun compte rendu sur cette période.</div>`}</div>`;
  bindFilters(viewCR);
  const qi = $("#q"); qi.oninput = () => { S.q = qi.value; clearTimeout(qi.t); qi.t = setTimeout(() => { const pos = qi.selectionStart; viewCR(); const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos); }, 250); };
  $("#tF").onchange = e => { S.typeF = e.target.value; viewCR(); };
  bindActionCards();
}
function actionDetail(a) {
  const w = canWrite(a.pole_id), pres = S.presents.filter(p => p.action_id === a.id);
  const invs = S.invitations.filter(i => i.action_id === a.id).map(i => ({ i, p: S.personnes.find(p => p.id === i.personne_id) })).filter(x => x.p);
  openModal(`<h3>${esc(a.theme || typeById(a.type_id)?.nom || "Compte rendu")}</h3>
    <div class="kv"><div>Type</div><div>${esc(typeById(a.type_id)?.nom || "—")}</div><div>Date</div><div>${fmtDL(a.date_action)}</div><div>Pôle</div><div>${esc(poleById(a.pole_id)?.nom || "")}</div>
      <div>Ville · lieu</div><div>${esc([a.ville, a.lieu].filter(Boolean).join(" · ") || "—")}</div><div>Campagne</div><div>${esc(campById(a.campagne_id)?.nom || "Hors campagne")}</div><div>Responsable</div><div><b>${esc(a.responsable)}</b></div></div>
    <div class="f"><span>Frères et sœurs présents (${pres.length})</span><div class="chips">${pres.map(p => `<span class="tag grey">${esc(p.nom)}</span>`).join("") || "—"}</div></div>
    <div class="f"><span>Invités (${invs.length})</span><div class="list" style="gap:6px">${invs.map(({ i, p }) => `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:14px"><b>${esc(p.nom)}</b>${i.converti ? `<span class="tag or">converti(e) · suivi(e) par ${esc(p.suivi_par || "?")}</span>` : ""}${i.club_lecture ? `<span class="tag">club de lecture</span>` : ""}${i.restauration ? `<span class="tag ok">restauration</span>` : ""}</div>`).join("") || "—"}</div></div>
    <div class="f"><span>Compte rendu</span><div class="pre">${esc(a.compte_rendu || "—")}</div></div>
    ${a.modifie_par ? `<p class="note">Dernière modification par ${esc(a.modifie_par)}${a.modifie_le ? " le " + fmtDL(a.modifie_le) : ""}</p>` : ""}
    <div class="row" style="gap:8px;margin-top:10px">${w ? `<button class="btn" id="edit">Modifier</button><button class="btn ghost" id="dela">Supprimer</button>` : ""}<button class="btn ghost" id="close" style="margin-left:auto">Fermer</button></div>`);
  $("#close").onclick = closeModal;
  if (w) {
    $("#edit").onclick = () => { closeModal(); S.editInit = formFromAction(a); if (location.hash === "#nouveau") render(); else location.hash = "#nouveau"; };
    confirmBtn($("#dela"), async () => { try { await del("actions", "id", a.id); closeModal(); toast("Compte rendu supprimé"); refresh(); } catch (e) { toast(errMsg(e)); } });
  }
}
function formFromAction(a) {
  return { id: a.id, date_action: a.date_action, type_id: a.type_id, pole_id: a.pole_id, campagne_id: a.campagne_id, ville: a.ville, lieu: a.lieu, theme: a.theme, responsable: a.responsable, compte_rendu: a.compte_rendu,
    freres: S.presents.filter(p => p.action_id === a.id).map(p => p.nom),
    invites: S.invitations.filter(i => i.action_id === a.id).map(i => { const p = S.personnes.find(x => x.id === i.personne_id) || {}; return { nom: p.nom || "", converti: i.converti, club: i.club_lecture, restau: i.restauration, suivi: p.suivi_par || "" }; }) };
}
const openModal = h => { $("#modal").innerHTML = h; $("#modalBg").classList.add("on"); $("#modal").scrollTop = 0; };
const closeModal = () => $("#modalBg").classList.remove("on");
$("#modalBg").onclick = e => { if (e.target.id === "modalBg") closeModal(); };
function confirmBtn(b, fn) { b.onclick = () => { if (b.dataset.c) return fn(); b.dataset.c = 1; b.textContent = "Confirmer la suppression"; b.className = "btn red"; }; }

/* =====================================================================
   NOUVEAU COMPTE RENDU (formulaire)
   ===================================================================== */
let F = null;
function viewForm(init) {
  const lockPole = !isAdmin();
  F = { id: init.id || null, date_action: init.date_action || today(), type_id: init.type_id || null, pole_id: init.pole_id || (lockPole ? S.compte.pole_id : (S.pole !== "all" ? Number(S.pole) : S.poles[0]?.id)),
    ville: init.ville || "", lieu: init.lieu || "", theme: init.theme || "", responsable: init.responsable || "", compte_rendu: init.compte_rendu || "",
    freres: init.freres || [], invites: (init.invites && init.invites.length ? init.invites : []).map(x => ({ nom: "", converti: false, club: false, restau: false, suivi: "", ...x })) };
  if (!F.invites.length) F.invites.push({ nom: "", converti: false, club: false, restau: false, suivi: "" });
  renderForm();
}
function renderForm() {
  const lockPole = !isAdmin(), names = namesUsed();
  const villes = uniq([...S.actions.map(a => a.ville), ...S.stats.map(a => a.ville)]);
  const persPole = S.personnes.filter(p => p.pole_id === Number(F.pole_id)).map(p => p.nom);
  const sugg = names.filter(n => !F.freres.some(f => norm(f) === norm(n))).slice(0, 12);
  const nConv = F.invites.filter(i => i.nom.trim() && i.converti).length, nInv = F.invites.filter(i => i.nom.trim()).length;
  $("#view").innerHTML = `
    <datalist id="dlNames">${names.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    <datalist id="dlVilles">${villes.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    <datalist id="dlPers">${persPole.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    <div class="page-h"><h1>${F.id ? "Modifier le compte rendu" : "Nouveau compte rendu"}</h1>
      <button class="paste" id="pasteBtn" style="width:auto">${ICON.clip}<span><b>Coller un CR</b><br><span class="note">Le formulaire se remplit tout seul</span></span></button></div>
    <div class="row" style="align-items:flex-start">
      <div class="stack" style="flex:999 1 560px">
        <section class="card"><div class="sec-t">1 · L'action</div>
          <div class="f"><span>Type d'évangélisation</span><div class="chips">${S.types.map(t => `<button class="chip blue ${F.type_id === t.id ? "on" : ""}" data-type="${t.id}">${esc(t.nom)}</button>`).join("")}</div></div>
          <div class="grid2">
            <label class="f">Date<input type="date" id="f_date" value="${esc(F.date_action)}"></label>
            <label class="f">Pôle<select id="f_pole" ${lockPole ? "disabled" : ""}>${S.poles.map(p => `<option value="${p.id}" ${Number(F.pole_id) === p.id ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}</select></label>
            <label class="f">Ville<input id="f_ville" list="dlVilles" value="${esc(F.ville)}" placeholder="Rennes, Cotonou…"></label>
            <label class="f">Lieu précis<input id="f_lieu" value="${esc(F.lieu)}" placeholder="Campus, gare, salle…"></label>
          </div>
          <label class="f">Thème<input id="f_theme" value="${esc(F.theme)}" placeholder="Ex. La nouvelle naissance"></label>
          <div class="note" id="campNote">${campNote()}</div>
        </section>
        <section class="card"><div class="sec-t">2 · L'équipe</div>
          <label class="f">Responsable de l'action<input id="f_resp" list="dlNames" value="${esc(F.responsable)}" placeholder="Prénom"></label>
          <div class="f"><span>Frères et sœurs présents · ${F.freres.length}</span>
            <div class="chips">${F.freres.map((n, i) => `<span class="pchip">${esc(n)}<button aria-label="Retirer ${esc(n)}" data-rmf="${i}">×</button></span>`).join("")}</div>
            <input class="inp" id="f_frere" list="dlNames" placeholder="Tape un prénom puis Entrée…" style="margin-top:8px">
            ${sugg.length ? `<div class="sugg">Déjà utilisés : ${sugg.map(n => `<button data-addf="${esc(n)}">+ ${esc(n)}</button>`).join("")}</div>` : ""}
          </div>
        </section>
        <section class="card"><div class="sec-t">3 · Les invités · ${nInv}</div>
          <p class="note" style="margin-top:-6px">Pour chaque invité, indique ce qui s'est passé. Un converti doit avoir quelqu'un qui le suit.</p>
          ${F.invites.map((v, i) => `<div class="inv ${v.converti ? "conv" : ""}">
            <div class="head"><input class="inp" data-inv="${i}" data-k="nom" list="dlPers" value="${esc(v.nom)}" placeholder="Nom de l'invité(e)"><button class="xbtn" data-rmi="${i}" aria-label="Retirer cet invité">×</button></div>
            <div class="chips" style="margin-top:10px"><button class="toggle or ${v.converti ? "on" : ""}" data-tg="${i}" data-k="converti">${v.converti ? "✓ " : ""}Converti(e)</button><button class="toggle ${v.club ? "on" : ""}" data-tg="${i}" data-k="club">${v.club ? "✓ " : ""}Club de lecture</button><button class="toggle ${v.restau ? "on" : ""}" data-tg="${i}" data-k="restau">${v.restau ? "✓ " : ""}Restauration</button></div>
            ${v.converti ? `<label class="f" style="margin:10px 0 0;color:#8a2d0a">Suivi(e) par (obligatoire)<input data-inv="${i}" data-k="suivi" list="dlNames" value="${esc(v.suivi)}" placeholder="Prénom de la personne qui le/la suit"></label>` : ""}
          </div>`).join("")}
          <button class="btn ghost" id="addInv" style="width:100%;border-style:dashed">+ Ajouter un invité</button>
        </section>
        <section class="card"><div class="sec-t">4 · Compte rendu</div><label class="f" style="margin:0"><span class="hidden">Compte rendu</span><textarea id="f_cr" style="min-height:130px" placeholder="Ce qui s'est passé…">${esc(F.compte_rendu)}</textarea></label></section>
      </div>
      <aside class="stack" style="flex:1 1 260px;position:sticky;top:84px">
        <div class="calc"><div class="k">CALCULÉ AUTOMATIQUEMENT</div>
          <div class="r"><span>Participants</span><b>${F.freres.length + nInv}</b></div><div class="note" style="color:#aab4e8">${F.freres.length} frères + ${nInv} invités</div>
          <div class="r"><span>Conversions</span><b style="color:var(--peach)">${nConv}</b></div>
          <div class="r"><span>Clubs de lecture</span><b>${F.invites.filter(i => i.nom.trim() && i.club).length}</b></div>
          <div class="r"><span>Restaurations</span><b>${F.invites.filter(i => i.nom.trim() && i.restau).length}</b></div></div>
        <button class="btn" id="save" style="min-height:54px;font-size:16px">${F.id ? "Enregistrer les modifications" : "Enregistrer le compte rendu"}</button>
        <p class="note">Les baptêmes et les ajouts à l'église s'enregistrent plus tard, sur la fiche de la personne (Suivi des personnes).</p>
      </aside>
    </div>`;
  bindForm();
}
function campNote() { const c = campForDate(F.date_action); return c ? `Cette action compte pour : <b>${esc(c.nom)}</b>` : "Cette action est hors campagne (elle compte dans le bilan de l'année)."; }
function syncForm() {
  if (!$("#f_date")) return;
  F.date_action = $("#f_date").value; F.pole_id = Number($("#f_pole").value); F.ville = $("#f_ville").value; F.lieu = $("#f_lieu").value; F.theme = $("#f_theme").value;
  F.responsable = $("#f_resp").value; F.compte_rendu = $("#f_cr").value;
  $$("[data-inv]").forEach(el => { F.invites[+el.dataset.inv][el.dataset.k] = el.value; });
}
function bindForm() {
  const rer = () => { syncForm(); const y = window.scrollY; renderForm(); window.scrollTo(0, y); };
  $$("[data-type]").forEach(b => b.onclick = () => { F.type_id = Number(b.dataset.type); rer(); });
  $$("[data-rmf]").forEach(b => b.onclick = () => { syncForm(); F.freres.splice(+b.dataset.rmf, 1); rer(); });
  $$("[data-addf]").forEach(b => b.onclick = () => { syncForm(); F.freres.push(b.dataset.addf); rer(); });
  const fi = $("#f_frere");
  const addFrere = () => { const v = fi.value.trim(); if (!v) return; syncForm(); if (!F.freres.some(f => norm(f) === norm(v))) F.freres.push(names_canon(v)); rer(); setTimeout(() => $("#f_frere")?.focus(), 0); };
  fi.onkeydown = e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addFrere(); } };
  fi.onchange = () => { if (namesUsed().some(n => n === fi.value)) addFrere(); };
  $$("[data-tg]").forEach(b => b.onclick = () => { syncForm(); const v = F.invites[+b.dataset.tg]; v[b.dataset.k] = !v[b.dataset.k]; rer(); });
  $$("[data-rmi]").forEach(b => b.onclick = () => { syncForm(); F.invites.splice(+b.dataset.rmi, 1); if (!F.invites.length) F.invites.push({ nom: "", converti: false, club: false, restau: false, suivi: "" }); rer(); });
  $$('[data-inv][data-k="nom"]').forEach(el => el.addEventListener("change", rer));
  $("#addInv").onclick = () => { syncForm(); F.invites.push({ nom: "", converti: false, club: false, restau: false, suivi: "" }); rer(); setTimeout(() => { const all = $$('[data-k="nom"]'); all[all.length - 1]?.focus(); }, 0); };
  $("#f_date").onchange = () => { F.date_action = $("#f_date").value; $("#campNote").innerHTML = campNote(); };
  $("#f_pole").onchange = rer;
  $("#pasteBtn").onclick = pasteDialog;
  $("#save").onclick = saveForm;
}
const names_canon = v => namesUsed().find(n => norm(n) === norm(v)) || v.trim().replace(/^\p{Ll}/u, c => c.toUpperCase());
function pasteDialog() {
  syncForm();
  openModal(`<h3>Coller un compte rendu</h3><p class="note" style="margin-top:-6px">Depuis WhatsApp, un mail ou un document. Je repère la date, le type, le thème, les frères, les invités et le texte. Tu vérifies ensuite.</p>
    <label class="f"><span class="hidden">Texte du CR</span><textarea id="pasteTa" style="min-height:240px" placeholder="*Conférence : …*&#10;*14/11/2026*&#10;*Invités présents*&#10;1. Awa…"></textarea></label>
    <div class="row" style="gap:8px"><button class="btn" id="go">Remplir le formulaire</button><button class="btn ghost" id="close" style="margin-left:auto">Annuler</button></div>`);
  $("#close").onclick = closeModal;
  $("#go").onclick = () => {
    const t = $("#pasteTa").value; if (!t.trim()) return toast("Colle d'abord un CR");
    const r = parseCR(t);
    Object.entries(r).forEach(([k, v]) => { if (v && (!Array.isArray(v) || v.length)) F[k] = v; });
    if (r.invites.length) F.invites = r.invites.map(nom => ({ nom, converti: false, club: false, restau: false, suivi: "" }));
    closeModal(); renderForm(); toast("Formulaire rempli : vérifie et complète ✓");
  };
}
function parseCR(raw) {
  const lines = raw.replace(/[⁠​‎]/g, "").split(/\r?\n/).map(l => l.replace(/^\[\d{1,2}\/\d{1,2}[^\]]*\]\s*[^:]{1,60}:\s*/, "").replace(/\*/g, "").trim());
  const out = { freres: [], invites: [] }, txt = lines.join("\n");
  const dm = txt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (dm) out.date_action = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  const first = lines.find(l => l) || "", f = norm(first);
  const map = [["porte", "Porte-à-porte"], ["rue", "Évangélisation de rue"], ["campus", "Campus"], ["conf", "Conférence"], ["etude", "Étude biblique"], ["retraite", "Retraite"], ["ligne", "En ligne"], ["personnel", "Évangélisation personnelle"]];
  const hit = map.find(([k]) => f.includes(k)); if (hit) out.type_id = S.types.find(t => t.nom === hit[1])?.id || null;
  const val = re => { const l = lines.find(x => re.test(x)); return l ? l.split(":").slice(1).join(":").trim() : ""; };
  out.theme = val(/^th[eè]me\s*:/i) || (first.includes(":") ? first.split(":").slice(1).join(":").trim() : "");
  out.lieu = val(/^lieu\s*:/i); out.ville = val(/^ville\s*:/i); out.responsable = val(/^responsable\s*:/i);
  let sec = null; const cr = [];
  for (const l of lines) {
    const n = norm(l);
    if (/^invit/.test(n)) { sec = "inv"; continue; }
    if (/^(freres|soeurs|participants|presents|equipe|membres)/.test(n)) { sec = "fr"; continue; }
    if (/^compte\s*rendu/.test(n)) { sec = "cr"; continue; }
    if (/^total/.test(n)) { if (sec !== "cr") sec = null; continue; }
    if (sec === "inv" || sec === "fr") {
      const m = l.match(/^\d+\s*[.)-]\s*(.+)$/) || l.match(/^[-•]\s*(.+)$/);
      if (m) { (sec === "inv" ? out.invites : out.freres).push(m[1].trim()); continue; }
      if (!l) continue; sec = null;
    }
    if (sec === "cr") cr.push(l);
  }
  out.compte_rendu = cr.join("\n").trim();
  return out;
}
async function saveForm() {
  syncForm();
  const invs = F.invites.filter(i => i.nom.trim());
  if (!F.date_action) return toast("Indique la date");
  if (!F.type_id) return toast("Choisis le type d'évangélisation");
  if (!F.responsable.trim()) return toast("Indique le responsable de l'action");
  if (invs.some(i => i.converti && !i.suivi.trim())) return toast("Indique qui suit chaque converti");
  const btn = $("#save"); btn.disabled = true; btn.textContent = "Enregistrement…";
  try {
    const row = { date_action: F.date_action, type_id: F.type_id, pole_id: Number(F.pole_id), campagne_id: campForDate(F.date_action)?.id || null,
      ville: names_city(F.ville), lieu: F.lieu.trim() || null, theme: F.theme.trim() || null, responsable: names_canon(F.responsable), compte_rendu: F.compte_rendu.trim() || null };
    let actionId = F.id;
    if (actionId) { await upd("actions", actionId, row); await del("presents", "action_id", actionId); await del("invitations", "action_id", actionId); }
    else actionId = (await ins("actions", row))[0].id;
    if (F.freres.length) await ins("presents", F.freres.map(nom => ({ action_id: actionId, nom: names_canon(nom) })));
    const invRows = [];
    for (const v of invs) {
      let p = S.personnes.find(x => x.pole_id === row.pole_id && norm(x.nom) === norm(v.nom));
      if (!p) {
        p = (await ins("personnes", { nom: v.nom.trim(), pole_id: row.pole_id, ville: row.ville, premier_contact: row.date_action,
          date_conversion: v.converti ? row.date_action : null, suivi_par: v.converti ? names_canon(v.suivi) : null }))[0];
        S.personnes.push(p);
      } else if (v.converti && (!p.date_conversion || norm(p.suivi_par) !== norm(v.suivi))) {
        p = await upd("personnes", p.id, { date_conversion: p.date_conversion || row.date_action, suivi_par: names_canon(v.suivi) });
      }
      if (!invRows.some(r => r.personne_id === p.id)) invRows.push({ action_id: actionId, personne_id: p.id, converti: !!v.converti, club_lecture: !!v.club, restauration: !!v.restau });
    }
    if (invRows.length) await ins("invitations", invRows);
    toast(F.id ? "Compte rendu modifié ✓" : "Compte rendu enregistré ✓");
    F = null; location.hash = "#cr"; await refresh();
  } catch (e) { console.error(e); toast(errMsg(e)); btn.disabled = false; btn.textContent = "Réessayer l'enregistrement"; }
}
const names_city = v => { v = (v || "").trim(); if (!v) return null; const ex = uniq([...S.actions.map(a => a.ville), ...S.stats.map(a => a.ville)]).find(c => norm(c) === norm(v)); return ex || v.replace(/^\p{Ll}/u, c => c.toUpperCase()); };

/* =====================================================================
   MODE PRÉSENTATION
   ===================================================================== */
function buildSlides() {
  const rows = statsF("all"), a = actStats(rows), p = parcoursStats(S.periode, "all");
  const slides = [];
  slides.push(`<div class="s-center"><div class="eyebrow">${esc(perLabel())}</div><h1>Les actions<br>évangéliques</h1><p>${esc(perDates())} · situation au ${fmtDL(today())}</p></div>`);
  slides.push(`<div class="s-wide"><h2>Fruits : ${nf(p.conversion)} conversion${p.conversion > 1 ? "s" : ""} pour ${nf(a.part)} participants</h2><div class="kpis">${kpiHTML(a, p)}</div></div>`);
  slides.push(`<div class="s-white"><div class="eyebrow">Le parcours</div><h2>De la rencontre à l'église</h2><div class="big">
    ${[["Nouvelles personnes", p.nouvelle_personne, "#1d3bd1"], ["Convertis", p.conversion, "#c2410c"], ["Baptisés", p.bapteme, "#0f7a63"], ["Ajoutés à l'église", p.ajout_eglise, "#1d3bd1"]].map(([l, n, c]) => `<div><div class="num" style="color:${c}">${nf(n)}</div><div class="l">${l}</div></div>`).join('<div style="align-self:center;font-size:30px;color:#c9cfe6">→</div>')}</div></div>`);
  const types = S.types.map(t => [t.nom, rows.filter(r => r.type_id === t.id).length]).filter(x => x[1]).sort((x, y) => y[1] - x[1]), tmax = Math.max(1, ...types.map(x => x[1]));
  if (types.length) slides.push(`<div class="s-white"><div class="eyebrow">Sur le terrain</div><h2>Les types d'évangélisation</h2>${types.map(([t, n]) => `<div class="hbar" style="font-size:clamp(14px,1.5vw,20px);grid-template-columns:minmax(160px,280px) 1fr 60px"><span>${esc(t)}</span><div class="bar" style="margin:0;height:14px"><i style="width:${n / tmax * 100}%"></i></div><span class="v">${n}</span></div>`).join("")}</div>`);
  const poles = S.poles.filter(pl => rows.some(r => r.pole_id === pl.id));
  poles.forEach((pl, i) => {
    const r = rows.filter(x => x.pole_id === pl.id), s = actStats(r), ps = parcoursStats(S.periode, pl.id), cities = cityRows(r);
    const top = cities.slice(0, 3).map(c => `${c.ville} (${c.n})`);
    slides.push(`<div class="s-white" style="border-top:8px solid ${pl.couleur}"><div class="eyebrow">Étape ${i + 1} / ${poles.length}</div><h2>${esc(pl.nom)}</h2>
      ${top.length ? `<p style="font-style:italic;color:#4a5080;margin:0 0 3vh">${esc(top.join(", "))}</p>` : ""}
      <div class="big"><div><div class="num" style="color:var(--green)">${nf(s.n)}</div><div class="l">actions</div></div><div><div class="num" style="color:var(--navy)">${pct1(s.n, a.n)}</div><div class="l">du total</div></div><div><div class="num" style="color:var(--orange)">${nf(ps.conversion)}</div><div class="l">conversions</div></div><div><div class="num" style="color:var(--royal)">${nf(ps.bapteme)}</div><div class="l">baptêmes</div></div></div>
      <table style="font-size:clamp(13px,1.3vw,18px)"><thead><tr><th>Ville</th><th>Actions</th><th>Participants</th><th>Conversions</th><th>Restaurations</th></tr></thead><tbody>${cities.slice(0, 7).map(c => `<tr><td>${esc(c.ville)}</td><td>${c.n}</td><td>${nf(c.part)}</td><td class="c-or">${c.convA}</td><td>${c.rest}</td></tr>`).join("")}</tbody></table></div>`);
  });
  slides.push(`<div class="s-center"><div class="eyebrow">Merci à tous les pôles</div><h1>Gloire à Dieu</h1><p>${nf(a.n)} actions · ${nf(a.part)} participants · ${nf(p.conversion)} conversions · ${nf(p.bapteme)} baptêmes</p></div>`);
  return slides;
}
function openDeck() {
  const slides = buildSlides(); let i = 0;
  const d = document.createElement("div"); d.className = "deck";
  d.innerHTML = `<div class="slide" id="dkS"></div><div class="ctrl"><button id="dkP" aria-label="Précédent">←</button><button id="dkN" aria-label="Suivant">→</button><span id="dkC"></span><div class="prog"><i id="dkB"></i></div><button id="dkF">Plein écran</button><button id="dkX">Fermer ✕</button></div>`;
  document.body.appendChild(d);
  const show = () => { $("#dkS").innerHTML = slides[i]; $("#dkC").textContent = `${i + 1} / ${slides.length}`; $("#dkB").style.width = ((i + 1) / slides.length * 100) + "%"; };
  const go = n => { i = Math.max(0, Math.min(slides.length - 1, i + n)); show(); };
  const key = e => { if (["ArrowRight", " ", "PageDown"].includes(e.key)) { e.preventDefault(); go(1); } if (["ArrowLeft", "PageUp"].includes(e.key)) go(-1); if (e.key === "Escape") close(); };
  const close = () => { document.removeEventListener("keydown", key); d.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  $("#dkP").onclick = () => go(-1); $("#dkN").onclick = () => go(1); $("#dkX").onclick = close;
  $("#dkF").onclick = () => { (document.fullscreenElement ? document.exitFullscreen() : d.requestFullscreen()).catch(() => toast("Plein écran indisponible ici")); };
  $("#dkS").onclick = e => { if (!e.target.closest("button,table")) go(1); };
  document.addEventListener("keydown", key); show();
}

/* =====================================================================
   MON COMPTE · ADMIN · CONNEXION
   ===================================================================== */
function viewCompte() {
  const c = S.compte || {};
  const roleL = { admin: "Administratrice", dirigeant: "Dirigeant(e) · peut modifier son pôle", membre: "Membre · peut tout voir, sans modifier" }[c.role] || "—";
  $("#view").innerHTML = `<div class="card login"><h2>Mon compte</h2>
    <div class="kv"><div>Email</div><div>${esc(S.session?.user?.email || "")}</div><div>Rôle</div><div><b>${esc(roleL)}</b></div></div>
    <label class="f">Mon nom<input id="c_nom" value="${esc(c.nom || "")}"></label>
    <label class="f">Mon pôle<select id="c_pole" ${c.role !== "membre" ? "disabled" : ""}><option value="">—</option>${S.poles.map(p => `<option value="${p.id}" ${c.pole_id === p.id ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}</select></label>
    ${c.role === "dirigeant" ? `<p class="note">Ton pôle est fixé par l'administratrice.</p>` : ""}
    ${c.role === "membre" ? `<p class="note">Pour pouvoir ajouter des comptes rendus, demande à l'administratrice de te désigner dirigeant(e).</p>` : ""}
    <div class="row" style="gap:8px"><button class="btn" id="c_save">Enregistrer</button><button class="btn ghost" id="c_out" style="margin-left:auto">Se déconnecter</button></div></div>`;
  $("#c_save").onclick = async () => {
    const patch = { nom: $("#c_nom").value.trim() || null }; if (c.role === "membre") patch.pole_id = Number($("#c_pole").value) || null;
    try { await upd("comptes", c.id, patch); toast("Enregistré ✓"); refresh(); } catch (e) { toast(errMsg(e)); }
  };
  $("#c_out").onclick = async () => { await sb.auth.signOut(); location.hash = "#accueil"; };
}
function viewAdmin() {
  const L = [...S.comptes].sort((a, b) => (a.role === "membre") - (b.role === "membre") || String(a.email).localeCompare(String(b.email)));
  $("#view").innerHTML = `<div class="page-h"><div><h1>Administration</h1><div class="sub">Désigne les dirigeants et leur pôle. Les autres restent membres (lecture seule).</div></div></div>
    <section class="card"><h2>Comptes (${L.length})</h2><div class="scroll-x"><table style="min-width:640px"><thead><tr><th>Email</th><th>Nom</th><th style="text-align:left">Rôle</th><th style="text-align:left">Pôle</th><th></th></tr></thead><tbody>
      ${L.map(u => `<tr data-u="${u.id}"><td>${esc(u.email)}</td><td style="text-align:right">${esc(u.nom || "")}</td>
        <td style="text-align:left">${u.role === "admin" ? "<b>admin</b>" : `<select class="sel" data-k="role" aria-label="Rôle de ${esc(u.email)}"><option value="membre" ${u.role === "membre" ? "selected" : ""}>Membre</option><option value="dirigeant" ${u.role === "dirigeant" ? "selected" : ""}>Dirigeant(e)</option></select>`}</td>
        <td style="text-align:left"><select class="sel" data-k="pole_id" aria-label="Pôle de ${esc(u.email)}"><option value="">—</option>${S.poles.map(p => `<option value="${p.id}" ${u.pole_id === p.id ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}</select></td>
        <td><button class="btn sm" data-save="${u.id}">OK</button></td></tr>`).join("")}
    </tbody></table></div></section>
    <section class="card mt"><h2>Campagnes</h2><p class="note" style="margin-top:-6px">Les actions sont rattachées automatiquement à la campagne dont les dates les contiennent.</p>
      <div class="scroll-x"><table style="min-width:560px"><thead><tr><th>Nom</th><th style="text-align:left">Début</th><th style="text-align:left">Fin</th><th></th></tr></thead><tbody>
      ${[...S.campagnes, {}].map(c => `<tr data-c="${c.id || ""}"><td><input class="inp" data-k="nom" value="${esc(c.nom || "")}" placeholder="Nouvelle campagne…"></td><td style="text-align:left"><input class="inp" type="date" data-k="date_debut" value="${esc(c.date_debut || "")}"></td><td style="text-align:left"><input class="inp" type="date" data-k="date_fin" value="${esc(c.date_fin || "")}"></td><td><button class="btn sm" data-savec>${c.id ? "OK" : "Ajouter"}</button></td></tr>`).join("")}
      </tbody></table></div></section>`;
  $$("[data-save]").forEach(b => b.onclick = async () => {
    const tr = b.closest("tr"), patch = {};
    tr.querySelectorAll("[data-k]").forEach(i => { patch[i.dataset.k] = i.dataset.k === "pole_id" ? (Number(i.value) || null) : i.value; });
    if (patch.role === "dirigeant" && !patch.pole_id) return toast("Choisis le pôle du dirigeant");
    try { await upd("comptes", tr.dataset.u, patch); toast("Compte mis à jour ✓"); refresh(); } catch (e) { toast(errMsg(e)); }
  });
  $$("[data-savec]").forEach(b => b.onclick = async () => {
    const tr = b.closest("tr"), row = {}; tr.querySelectorAll("[data-k]").forEach(i => row[i.dataset.k] = i.value.trim());
    if (!row.nom || !row.date_debut || !row.date_fin) return toast("Nom, début et fin sont obligatoires");
    try { tr.dataset.c ? await upd("campagnes", Number(tr.dataset.c), row) : await ins("campagnes", row); toast("Campagne enregistrée ✓"); refresh(); } catch (e) { toast(errMsg(e)); }
  });
}
function viewLogin(msg) {
  if (S.session) return viewInfo(msg || "Tu es déjà connecté(e).");
  let mode = "in";
  const draw = () => {
    $("#view").innerHTML = `<div class="card login"><h2>${mode === "in" ? "Connexion" : "Créer un compte"}</h2>
      ${msg ? `<p class="note" style="margin-top:-6px">${esc(msg)}</p>` : ""}
      <div class="seg" style="margin-bottom:14px"><button class="${mode === "in" ? "on" : ""}" data-m="in">Se connecter</button><button class="${mode === "up" ? "on" : ""}" data-m="up">Créer un compte</button></div>
      ${mode === "up" ? `<label class="f">Ton prénom et nom<input id="l_nom" autocomplete="name"></label>` : ""}
      <label class="f">Email<input id="l_mail" type="email" autocomplete="email" placeholder="prenom@exemple.com"></label>
      <label class="f">Mot de passe<input id="l_pass" type="password" autocomplete="${mode === "in" ? "current-password" : "new-password"}" placeholder="${mode === "up" ? "6 caractères minimum" : ""}"></label>
      <button class="btn" id="l_go" style="width:100%">${mode === "in" ? "Se connecter" : "Créer mon compte"}</button>
      ${mode === "in" ? `<p style="text-align:center;margin:12px 0 0"><button class="btn ghost sm" id="l_forgot">Mot de passe oublié ?</button></p>` : `<p class="note">Avec un compte, tu peux voir les comptes rendus et le suivi des personnes. Pour ajouter des CR, l'administratrice te désignera dirigeant(e).</p>`}
      <p class="note" id="l_msg"></p></div>`;
    $$("[data-m]").forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
    $("#l_go").onclick = async () => {
      const email = $("#l_mail").value.trim(), password = $("#l_pass").value;
      if (!email || !password) return toast("Indique ton email et ton mot de passe");
      $("#l_go").disabled = true;
      try {
        if (mode === "in") { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; location.hash = "#accueil"; }
        else {
          const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error;
          const nom = $("#l_nom")?.value.trim();
          if (data.session) { if (nom) await sb.from("comptes").update({ nom }).eq("id", data.user.id); location.hash = "#compte"; }
          else $("#l_msg").textContent = "✓ Compte créé ! Ouvre le mail de confirmation (pense aux spams), puis reviens te connecter.";
        }
      } catch (e) { $("#l_msg").textContent = errMsg(e); }
      const b = $("#l_go"); if (b) b.disabled = false;
    };
    const fg = $("#l_forgot"); if (fg) fg.onclick = async () => {
      const email = $("#l_mail").value.trim(); if (!email) return toast("Écris d'abord ton email");
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      $("#l_msg").textContent = error ? errMsg(error) : "✓ Si ce compte existe, un email pour changer ton mot de passe vient de partir.";
    };
  };
  draw();
}
function viewNewPassword() {
  $("#view").innerHTML = `<div class="card login"><h2>Nouveau mot de passe</h2><label class="f">Choisis un nouveau mot de passe<input id="np" type="password" autocomplete="new-password"></label><button class="btn" id="npGo" style="width:100%">Enregistrer</button></div>`;
  $("#npGo").onclick = async () => { const { error } = await sb.auth.updateUser({ password: $("#np").value }); if (error) return toast(errMsg(error)); S.recovery = false; toast("Mot de passe changé ✓"); location.hash = "#accueil"; render(); };
}

/* =====================================================================
   APPARENCE : couleur et mode clair / sombre (mémorisés sur l'appareil)
   ===================================================================== */
const COULEURS = [["Bleu royal", "#1d3bd1"], ["Violet", "#6d28d9"], ["Émeraude", "#047857"], ["Rose", "#be185d"], ["Bordeaux", "#9f1239"], ["Bleu nuit", "#1e3a5f"], ["Turquoise", "#0e7490"], ["Ambre", "#b45309"]];
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const darkMQ = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function applyTheme() {
  const color = store.get("theme-couleur") || COULEURS[0][1], mode = store.get("theme-mode") || "auto";
  document.documentElement.style.setProperty("--royal", color);
  const dark = mode === "sombre" || (mode === "auto" && darkMQ && darkMQ.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  let meta = document.querySelector('meta[name="theme-color"]'); if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  meta.content = dark ? "#181c30" : "#ffffff";
}
if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener("change", applyTheme);
applyTheme();
function themeDialog() {
  let tab = "couleur";
  const draw = () => {
    const color = store.get("theme-couleur") || COULEURS[0][1], mode = store.get("theme-mode") || "auto";
    openModal(`<h3>Apparence</h3>
      <div class="seg" role="tablist" style="margin-bottom:16px"><button role="tab" aria-selected="${tab === "couleur"}" class="${tab === "couleur" ? "on" : ""}" data-tab="couleur">Couleur</button><button role="tab" aria-selected="${tab === "mode"}" class="${tab === "mode" ? "on" : ""}" data-tab="mode">Mode clair / sombre</button></div>
      ${tab === "couleur" ? `<div class="swatches">${COULEURS.map(([n, c]) => `<button class="swatch ${c === color ? "on" : ""}" data-col="${c}" aria-pressed="${c === color}"><i style="background:${c}"></i>${n}</button>`).join("")}</div>`
        : `<div class="modes">${[["clair", "Clair", "☀"], ["sombre", "Sombre", "☾"], ["auto", "Automatique", "◐"]].map(([k, l, ic]) => `<button class="mode ${k === mode ? "on" : ""}" data-mode="${k}" aria-pressed="${k === mode}"><span style="font-size:22px">${ic}</span>${l}</button>`).join("")}</div><p class="note">« Automatique » suit le réglage de ton téléphone ou de ton ordinateur.</p>`}
      <p class="note">Ton choix est mémorisé sur cet appareil. Chacun peut choisir le sien.</p>
      <div class="row" style="justify-content:flex-end"><button class="btn" id="close">Terminé</button></div>`);
    $$("[data-tab]").forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    $$("[data-col]").forEach(b => b.onclick = () => { store.set("theme-couleur", b.dataset.col); applyTheme(); draw(); });
    $$("[data-mode]").forEach(b => b.onclick = () => { store.set("theme-mode", b.dataset.mode); applyTheme(); draw(); });
    $("#close").onclick = closeModal;
  };
  draw();
}

/* =====================================================================
   DÉMARRAGE
   ===================================================================== */
(async function start() {
  const st = document.createElement("style"); st.textContent = "@media (max-width:760px){.hide-m{display:none}}"; document.head.appendChild(st);
  try { const { data } = await sb.auth.getSession(); S.session = data.session; } catch (e) {}
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") { S.recovery = true; }
    const changed = (session?.user?.id || null) !== (S.session?.user?.id || null);
    S.session = session;
    if (changed || ev === "PASSWORD_RECOVERY") refresh();
  });
  const h = location.hash.slice(1); S.view = VIEWS.includes(h) && h !== "presentation" ? h : "accueil";
  await refresh();
})();
