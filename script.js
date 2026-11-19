const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuRgwAiAtnVkkGQ6U9_zyVx04hXplaf9bpMb8geN5hVrHz_n-KMO4NnelRpoOIYRtDeA/exec";

const structureMois = [
  { id: "12", nom: "Décembre", semaines: [
    { code: "S51 (14/12 - 20/12)", label: "Semaine 51 : 14/12 - 20/12" },
    { code: "S52 (21/12 - 27/12)", label: "Semaine 52 : 21/12 - 27/12" },
    { code: "S53 (28/12 - 03/01)", label: "Semaine 53 : 28/12 - 03/01" }
  ]},
  { id: "01", nom: "Janvier", semaines: [
    { code: "S1 (04/01 - 10/01)",  label: "Semaine 1 : 04/01 - 10/01" },
    { code: "S2 (11/01 - 17/01)",  label: "Semaine 2 : 11/01 - 17/01" },
    { code: "S3 (18/01 - 24/01)",  label: "Semaine 3 : 18/01 - 24/01" },
    { code: "S4 (25/01 - 31/01)",  label: "Semaine 4 : 25/01 - 31/01" }
  ]},
  { id: "02", nom: "Février", semaines: [
    { code: "S5 (01/02 - 07/02)", label: "Semaine 5 : 01/02 - 07/02" },
    { code: "S6 (08/02 - 14/02)", label: "Semaine 6 : 08/02 - 14/02" },
    { code: "S7 (15/02 - 21/02)", label: "Semaine 7 : 15/02 - 21/02" },
    { code: "S8 (22/02 - 28/02)", label: "Semaine 8 : 22/02 - 28/02" }
  ]},
  { id: "03", nom: "Mars", semaines: [
    { code: "S9 (01/03 - 07/03)",   label: "Semaine 9 : 01/03 - 07/03" },
    { code: "S10 (08/03 - 14/03)", label: "Semaine 10 : 08/03 - 14/03" },
    { code: "S11 (15/03 - 21/03)", label: "Semaine 11 : 15/03 - 21/03" },
    { code: "S12 (22/03 - 28/03)", label: "Semaine 12 : 22/03 - 28/03" }
  ]},
  { id: "04", nom: "Avril", semaines: [
    { code: "S13 (29/03 - 04/04)", label: "Semaine 13 : 29/03 - 04/04" },
    { code: "S14 (05/04 - 11/04)", label: "Semaine 14 : 05/04 - 11/04" },
    { code: "S15 (12/04 - 18/04)", label: "Semaine 15 : 12/04 - 18/04" },
    { code: "S16 (19/04 - 25/04)", label: "Semaine 16 : 19/04 - 25/04" }
  ]}
];

let disposGuide = {};
let sejoursAgence = {}; 
let commentairesMois = {}; 
let commentairesValidesMois = {}; 
let commentairesSemaines = {}; 
let moisOuvertEnEdition = null; 
let aDesModifications = false;
let aDesDonneesEnregistrees = false;
let profilRenseigneSurServeur = false;
let aEteAvertiSauvegarde = false;
let modalConfirmationEndInstance = null;
let modalProfileInstance = null;
let modalConfirmSejourInstance = null;
let sejourAConfirmerTemp = null;
let ecouteurPremierClicPostPopin = false;
let timerBulleIncomplet = null;
let estBoutonSauvegardePret = false;

const urlParams = new URLSearchParams(window.location.search);
const guideTokenParam = urlParams.get('token') || "";

const extraireCodeSemaine = (str) => {
  const match = String(str || '').match(/S\d+/i);
  return match ? match[0].toUpperCase() : '';
};

const formaterPlageDates = (dateDepart, dateFin, moisNom) => {
  if (dateDepart && dateFin) {
    return `${dateDepart} - ${dateFin}`;
  } else if (dateDepart) {
    return dateDepart;
  }
  return moisNom || '';
};

document.addEventListener("DOMContentLoaded", () => {
  const modalEndEl = document.getElementById('confirmationEndModal');
  if (modalEndEl && window.bootstrap) {
    modalConfirmationEndInstance = new bootstrap.Modal(modalEndEl);
  }

  const modalProfileEl = document.getElementById('profileModal');
  if (modalProfileEl && window.bootstrap) {
    modalProfileInstance = new bootstrap.Modal(modalProfileEl);
  }

  const modalConfirmEl = document.getElementById('confirmSejourModal');
  if (modalConfirmEl && window.bootstrap) {
    modalConfirmSejourInstance = new bootstrap.Modal(modalConfirmEl);
  }

  document.getElementById('btn-valider-confirmation-modal')?.addEventListener('click', () => traiterActionSejour("confirmer"));
  document.getElementById('btn-refuser-modal')?.addEventListener('click', () => traiterActionSejour("refuser"));

  document.querySelectorAll('.profile-q').forEach(input => {
    input.addEventListener('change', () => {
      verifierFormulaireProfilComplet();
      enregistrerProfilGoogleSheets();
    });
  });
});

function initApp() {
  structureMois.forEach(m => {
    m.semaines.forEach(sem => {
      disposGuide[sem.code] = null;
      commentairesSemaines[sem.code] = "";
    });
    commentairesMois[m.id] = "";
    commentairesValidesMois[m.id] = false;
  });
  
  renderMonthsHTML();
  chargerDonneesGoogleSheets();
}

function toggleBlocDisposFull() {
  const wrapper = document.getElementById('dispos-full-wrapper');
  const btnToggle = document.getElementById('btn-toggle-dispos-block');

  if (wrapper.style.display === 'none' || wrapper.style.display === '') {
    wrapper.style.display = 'block';
    btnToggle.textContent = '▲ Masquer le formulaire de dispos';
    setTimeout(() => {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } else {
    wrapper.style.display = 'none';
    btnToggle.textContent = '✏️ Voir ou modifier mes dispos';
  }
}

function clicCestParti() {
  document.getElementById('start-btn').style.display = 'none';

  if (profilRenseigneSurServeur) {
    demarrerRemplissageDispos();
  } else {
    const profileCard = document.getElementById('inline-profile-card');
    if (profileCard) {
      profileCard.style.display = 'block';
      profileCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function ouvrirProfilEdit() {
  const questionsContainer = document.getElementById('profile-questions-container');
  const modalBody = document.getElementById('profile-modal-body-content');

  if (questionsContainer && modalBody) {
    modalBody.appendChild(questionsContainer);
  }

  if (modalProfileInstance) {
    modalProfileInstance.show();
  }
}

function validerProfilInlineEtContinuer() {
  document.getElementById('inline-profile-card').style.display = 'none';
  profilRenseigneSurServeur = true;

  const btnEditProfile = document.getElementById('btn-edit-profile');
  if (btnEditProfile) btnEditProfile.style.display = 'inline-block';

  demarrerRemplissageDispos();
}

function validerProfilModalEtMasquer() {
  if (modalProfileInstance) {
    modalProfileInstance.hide();
  }
}

function verifierFormulaireProfilComplet() {
  const q1 = document.querySelector('input[name="q1_qualification"]:checked');
  const q2 = document.querySelector('input[name="q2_pref"]:checked');
  const q3 = document.querySelector('input[name="q3_anglo"]:checked');

  const btnOkInline = document.getElementById('btn-ok-profile-inline');
  const btnOkModal = document.getElementById('btn-ok-profile-modal');

  if (q1 && q2 && q3) {
    if (btnOkInline) btnOkInline.disabled = false;
    if (btnOkModal) btnOkModal.disabled = false;
    return true;
  } else {
    if (btnOkInline) btnOkInline.disabled = true;
    if (btnOkModal) btnOkModal.disabled = true;
    return false;
  }
}

async function enregistrerProfilGoogleSheets() {
  const q1 = document.querySelector('input[name="q1_qualification"]:checked')?.value || "";
  const q2 = document.querySelector('input[name="q2_pref"]:checked')?.value || "";
  const q3 = document.querySelector('input[name="q3_anglo"]:checked')?.value || "";

  if (!guideTokenParam) return;

  try {
    const payload = {
      action: "saveProfileGuide",
      token: guideTokenParam,
      qualification: q1,
      preferenceSejour: q2,
      anglophones: q3
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("Erreur enregistrement profil :", e);
  }
}

function demarrerRemplissageDispos() {
  const wrapper = document.getElementById('dispos-full-wrapper');
  wrapper.style.display = 'block';

  const sectionTitle = document.getElementById('section-dispos-title');
  if (sectionTitle) sectionTitle.style.display = 'block';

  const card0 = document.getElementById('month-card-0');
  if (card0) {
    card0.classList.add('active');
    moisOuvertEnEdition = 0;
    configurerBoutonsGlobauxMois(0);
    actualiserVerrouillageModifier();
    actualiserVisibiliteBadgeRecap(0);
    setTimeout(() => {
      if (sectionTitle) {
        sectionTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        card0.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  document.getElementById('save-btn').style.display = 'block';
  actualiserEtatBouton();
}

function toggleTexteAccueil() {
  const moreContent = document.getElementById('welcome-more-content');
  const btnLabel = document.getElementById('label-toggle-welcome');

  if (moreContent.style.display === 'none' || moreContent.style.display === '') {
    moreContent.style.display = 'block';
    if (btnLabel) btnLabel.textContent = 'Masquer les détails ▴';
  } else {
    moreContent.style.display = 'none';
    if (btnLabel) btnLabel.textContent = 'Lire la suite ▾';
  }
}

function toggleListeSejoursRecap() {
  const container = document.getElementById('sejours-list-container');
  const btnToggle = document.getElementById('btn-toggle-sejours-list');
  const btnEspace = document.getElementById('btn-espace-azimut-guide');
  const textSpan = btnToggle.querySelector('span');

  if (container.style.display === 'none' || container.style.display === '') {
    container.style.display = 'flex';
    if (textSpan) textSpan.textContent = 'Masquer le détail';
    btnToggle.classList.add('open');
    btnEspace.style.display = 'flex';
  } else {
    container.style.display = 'none';
    if (textSpan) textSpan.textContent = 'Afficher le détail';
    btnToggle.classList.remove('open');
    btnEspace.style.display = 'none';
  }
  
  actualiserRecap();
}

function toggleSubgroupRefuses() {
  const listDiv = document.getElementById('subgroup-refuses-list');
  const arrowSpan = document.getElementById('arrow-subgroup-refuses');
  if (!listDiv) return;

  if (listDiv.style.display === 'none' || listDiv.style.display === '') {
    listDiv.style.display = 'flex';
    if (arrowSpan) arrowSpan.textContent = '▲';
  } else {
    listDiv.style.display = 'none';
    if (arrowSpan) arrowSpan.textContent = '▼';
  }
}

function estMoisCompletementRenseigne(indexMois) {
  const mois = structureMois[indexMois];
  return mois.semaines.every(sem => {
    const sej = sejoursAgence[sem.code];
    const stGuideLower = sej ? String(sej.statutGuide || "").toLowerCase() : "";
    const estRefuse = stGuideLower.includes("refusé") || stGuideLower.includes("refuse");
    return (sej && !estRefuse) || (disposGuide[sem.code] !== null && disposGuide[sem.code] !== undefined);
  });
}

function actualiserEtatValidationMois(indexMois) {
  const btnValider = document.getElementById(`btn-next-${indexMois}`);
  if (!btnValider) return;

  const complet = estMoisCompletementRenseigne(indexMois);
  if (complet) {
    btnValider.classList.remove('btn-next-disabled');
    masquerBulleMoisIncomplet(indexMois);
  } else {
    btnValider.classList.add('btn-next-disabled');
  }
}

function actualiserVerrouillageModifier() {
  structureMois.forEach((_, idx) => {
    const btnEdit = document.getElementById(`btn-edit-${idx}`);
    if (!btnEdit) return;

    if (moisOuvertEnEdition !== null && moisOuvertEnEdition !== idx) {
      btnEdit.disabled = true;
    } else {
      btnEdit.disabled = false;
    }
  });
}

function actualiserVisibiliteBadgeRecap(indexMois) {
  const badge = document.getElementById(`badge-${indexMois}`);
  if (!badge) return;

  const body = document.getElementById(`month-body-${indexMois}`);
  const isEditing = (body && body.style.display === 'block');

  if (isEditing) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'inline-block';
  }
}

function genererTexteBadgeMois(m) {
  let dispoCount = 0, occupeCount = 0, optionCount = 0, sejourCount = 0, nonRenseigneCount = 0;
  
  m.semaines.forEach(sem => {
    const sej = sejoursAgence[sem.code];
    const stGuideLower = sej ? String(sej.statutGuide || "").toLowerCase() : "";
    const estRefuse = stGuideLower.includes("refusé") || stGuideLower.includes("refuse");

    if (sej && !estRefuse) {
      const countS = sej.nbSejours || 1;
      sejourCount += countS;
    } else {
      const st = disposGuide[sem.code];
      if (st === "Disponible") dispoCount++;
      else if (st === "Occupé") occupeCount++;
      else if (st === "Option") optionCount++;
      else nonRenseigneCount++;
    }
  });

  const totalSemaines = m.semaines.length;

  if (nonRenseigneCount > 0 && dispoCount === 0 && occupeCount === 0 && optionCount === 0 && sejourCount === 0) {
    return "En attente";
  }

  const labelSejours = sejourCount > 1 ? `${sejourCount} séjours` : `1 séjour`;
  
  if (sejourCount >= totalSemaines) return labelSejours;
  if (occupeCount === totalSemaines) return "🔴 Tout Indispo";
  if (dispoCount === totalSemaines) return "🟢 Tout Dispo";

  const elements = [];
  if (sejourCount > 0) elements.push(labelSejours);
  if (dispoCount > 0) elements.push(`${dispoCount} dispo`);
  if (occupeCount > 0) elements.push(`${occupeCount} occupé`);
  if (optionCount > 0) elements.push(`${optionCount} peut-être`);

  return elements.length > 0 ? elements.join(", ") : "En attente";
}

function actualiserEtatBouton() {
  const btn = document.getElementById('save-btn');
  if (!btn) return;

  const tousLesMoisCompletes = structureMois.every((_, idx) => {
    const card = document.getElementById(`month-card-${idx}`);
    return card && card.classList.contains('completed');
  });

  if (aDesDonneesEnregistrees) {
    btn.style.display = 'block';

    if (moisOuvertEnEdition !== null) {
      estBoutonSauvegardePret = false;
      btn.className = "btn-save btn-disabled";
      btn.textContent = "Valide le mois en cours pour enregistrer";
    } else if (aDesModifications) {
      estBoutonSauvegardePret = true;
      btn.className = "btn-save ready";
      btn.textContent = "💾 Enregistrer mes modifications";
    } else {
      estBoutonSauvegardePret = false;
      btn.className = "btn-save btn-disabled";
      btn.textContent = "Aucune modification à enregistrer";
    }
  } else {
    if (tousLesMoisCompletes && moisOuvertEnEdition === null) {
      estBoutonSauvegardePret = true;
      btn.className = "btn-save ready";
      btn.textContent = "💾 Enregistrer mes disponibilités";
    } else {
      estBoutonSauvegardePret = false;
      btn.className = "btn-save btn-disabled";
      btn.textContent = "Valide tous les mois pour pouvoir enregistrer";
    }
  }
}

function handleClicEnregistrer() {
  if (estBoutonSauvegardePret) {
    enregistrerDispos();
  }
}

function ouvrirPopinDetailSejour(semCode, estDuBlocAttribue = false) {
  const sejour = sejoursAgence[semCode];
  if (!sejour) return;

  sejourAConfirmerTemp = { semCode, ...sejour };

  document.getElementById('modal-sejour-nom').textContent = sejour.nom || "Séjour sans nom";
  
  const plageDates = formaterPlageDates(sejour.date, sejour.dateFin, "");
  document.getElementById('modal-sejour-date').textContent = plageDates ? plageDates : "À préciser";

  document.getElementById('modal-sejour-duree').textContent = sejour.duree ? `${sejour.duree} jours` : "6 jours";
  
  if (sejour.inscrits !== undefined && sejour.paxMax !== undefined) {
    document.getElementById('modal-sejour-pax').textContent = `${sejour.inscrits} / ${sejour.paxMax} inscrits`;
  } else {
    document.getElementById('modal-sejour-pax').textContent = "Non précisé";
  }

  const stGuideLower = String(sejour.statutGuide || "").toLowerCase();
  
  const estAttribue = estDuBlocAttribue === true || 
                      stGuideLower.includes("attribué") || 
                      stGuideLower.includes("attribue") ||
                      stGuideLower === "occupé";

  const stSejourLower = String(sejour.statut || "").toLowerCase();
  const estConfirmeSheet = stSejourLower.includes("confirmé") || stSejourLower === "ok";

  const actionsDiv = document.getElementById('modal-sejour-actions');
  const subtext = document.getElementById('modal-sejour-subtext');
  const statutRow = document.getElementById('modal-sejour-statut-row');

  if (estAttribue) {
    if (actionsDiv) actionsDiv.style.setProperty('display', 'none', 'important');
    if (subtext) subtext.style.setProperty('display', 'none', 'important');
  } else {
    if (actionsDiv) actionsDiv.style.setProperty('display', 'flex', 'important');
    if (subtext) subtext.style.setProperty('display', 'block', 'important');
  }

  if (estConfirmeSheet) {
    document.getElementById('modal-sejour-statut-val').textContent = "🟢 Voyage assuré";
    if (statutRow) statutRow.style.display = 'flex';
  } else {
    if (statutRow) statutRow.style.display = 'none';
  }

  // Gestion de l'affichage de l'URL Séjour
  const urlSejourRow = document.getElementById('modal-sejour-url-row');
  const urlSejourVal = document.getElementById('modal-sejour-url-val');
  if (sejour.urlSejour && String(sejour.urlSejour).trim() !== "") {
    urlSejourVal.href = sejour.urlSejour;
    urlSejourRow.style.display = 'flex';
  } else {
    urlSejourRow.style.display = 'none';
  }

  // Gestion de l'affichage de la Fiche Technique
  const urlFicheRow = document.getElementById('modal-sejour-fiche-row');
  const urlFicheVal = document.getElementById('modal-sejour-fiche-val');
  const urlFicheEffectif = sejour.urlFiche || sejour.urlFicheTechnique;
  if (urlFicheEffectif && String(urlFicheEffectif).trim() !== "") {
    urlFicheVal.href = urlFicheEffectif;
    urlFicheRow.style.display = 'flex';
  } else {
    urlFicheRow.style.display = 'none';
  }

  if (modalConfirmSejourInstance) {
    modalConfirmSejourInstance.show();
  }
}

async function traiterActionSejour(typeAction) {
  if (!sejourAConfirmerTemp) return;

  const { semCode, idSejour, nom } = sejourAConfirmerTemp;
  
  if (modalConfirmSejourInstance) modalConfirmSejourInstance.hide();
  
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('active');

  try {
    const nouveauStatutGuide = (typeAction === "confirmer") ? "Attribué" : "Refusé";

    if (sejoursAgence[semCode]) {
      sejoursAgence[semCode].statutGuide = nouveauStatutGuide;
    }

    if (typeAction === "refuser") {
      disposGuide[semCode] = "Occupé";
    }

    actualiserRecap();

    const payload = {
      action: typeAction === "confirmer" ? "confirmSejourGuide" : "refuseSejourGuide",
      token: guideTokenParam,
      semaine: semCode,
      idSejour: idSejour,
      nomSejour: nom,
      statut: nouveauStatutGuide
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    if (overlay) overlay.classList.remove('active');
    
    if (typeAction === "confirmer") {
      afficherMessage(`✓ Séjour "${nom}" confirmé avec succès !\nNous l'ajouterons sur ton espace du site Azimut très prochainement.`, "success");
    } else {
      afficherMessage(`✓ Refus du séjour pris en compte (nous l'avons supprimé de ton planning).`, "success");
    }
  } catch (err) {
    console.error("Erreur action séjour :", err);
    if (overlay) overlay.classList.remove('active');
    afficherMessage("Erreur réseau lors de la mise à jour.", "error");
  }
}

function actualiserRecap() {
  let nbrDispo = 0, nbrOccupe = 0, nbrOption = 0, nbrSejour = 0;
  let totalSejoursVisibles = 0;

  Object.keys(disposGuide).forEach(semCode => {
    const sejour = sejoursAgence[semCode];
    const stGuideLower = sejour ? String(sejour.statutGuide || "").toLowerCase() : "";
    const estRefuse = stGuideLower.includes("refusé") || stGuideLower.includes("refuse");

    if (sejour) {
      totalSejoursVisibles += sejour.nbSejours || 1;
      if (!estRefuse) {
        nbrSejour += sejour.nbSejours || 1;
      }
    }
    
    if (!sejour || estRefuse) {
      const statut = disposGuide[semCode];
      if (aDesDonneesEnregistrees) {
        if (statut === "Disponible") nbrDispo++;
        else if (statut === "Occupé") nbrOccupe++;
        else if (statut === "Option") nbrOption++;
      }
    }
  });

  document.getElementById('count-dispo').textContent = nbrDispo;
  document.getElementById('count-occupe').textContent = nbrOccupe;
  document.getElementById('count-option').textContent = nbrOption;
  document.getElementById('count-sejour').textContent = nbrSejour;

  const summaryBox = document.getElementById('summary-section');
  const topRow = document.getElementById('summary-top');
  const bottomRow = document.getElementById('summary-bottom');
  const disposSubtitle = document.getElementById('summary-dispos-subtitle');
  const welcomeNotice = document.getElementById('welcome-notice');
  const welcomeMore = document.getElementById('welcome-more-content');
  const btnToggleWelcome = document.getElementById('btn-toggle-welcome');
  const sejoursListContainer = document.getElementById('sejours-list-container');
  const btnEspaceAzimut = document.getElementById('btn-espace-azimut-guide');
  const startBtn = document.getElementById('start-btn');
  const btnToggleDisposBlock = document.getElementById('btn-toggle-dispos-block');
  const badgeTitleAConfirmer = document.getElementById('badge-a-confirmer-title');

  if (!aDesDonneesEnregistrees) {
    welcomeNotice.style.display = 'block';
    welcomeMore.style.display = 'block';
    btnToggleWelcome.style.display = 'none';
    bottomRow.style.display = 'none';
    disposSubtitle.style.display = 'none';
    if (btnToggleDisposBlock) btnToggleDisposBlock.style.display = 'none';

    if (totalSejoursVisibles === 0) {
      summaryBox.style.display = 'none';
    } else {
      summaryBox.style.display = 'block';
      if (startBtn && startBtn.style.display !== 'none') {
        summaryBox.parentNode.insertBefore(startBtn, summaryBox.nextSibling);
      }
    }
  } else {
    welcomeNotice.style.display = 'none';
    summaryBox.style.display = 'block';
    bottomRow.style.display = 'grid';
    disposSubtitle.style.display = 'block';
    if (btnToggleDisposBlock) btnToggleDisposBlock.style.display = 'block';
  }

  if (totalSejoursVisibles > 0) {
    topRow.style.display = 'block';
    sejoursListContainer.innerHTML = '';

    const sejoursDemande = [];
    const sejoursAttribue = [];
    const sejoursRefuse = [];

    structureMois.forEach(m => {
      m.semaines.forEach(sem => {
        const sejour = sejoursAgence[sem.code];
        if (sejour) {
          const stGuideLower = String(sejour.statutGuide || "").toLowerCase();
          const estRefuse = stGuideLower.includes("refusé") || stGuideLower.includes("refuse");
          const estAttribueGuide = stGuideLower.includes("attribué") || stGuideLower.includes("attribue");
          const stSejourLower = String(sejour.statut || "").toLowerCase();
          const estConfirmeSejourSheet = stSejourLower.includes("confirmé") || stSejourLower === "ok";

          if (estRefuse) {
            sejoursRefuse.push({ semCode: sem.code, moisNom: m.nom, estConfirmeSejourSheet, ...sejour });
          } else if (estAttribueGuide) {
            sejoursAttribue.push({ semCode: sem.code, moisNom: m.nom, estConfirmeSejourSheet, ...sejour });
          } else {
            sejoursDemande.push({ semCode: sem.code, moisNom: m.nom, estConfirmeSejourSheet, ...sejour });
          }
        }
      });
    });

    const nbrAConfirmer = sejoursDemande.length;
    const estDesactiveDetail = (sejoursListContainer.style.display === 'none' || sejoursListContainer.style.display === '');

    if (nbrAConfirmer > 0 && estDesactiveDetail) {
      if (badgeTitleAConfirmer) {
        badgeTitleAConfirmer.textContent = `${nbrAConfirmer} à confirmer`;
        badgeTitleAConfirmer.style.display = 'inline-block';
      }
    } else {
      if (badgeTitleAConfirmer) {
        badgeTitleAConfirmer.style.display = 'none';
      }
    }

    // 1. SÉJOURS EN DEMANDE
    if (sejoursDemande.length > 0) {
      const groupDemande = document.createElement('div');
      groupDemande.className = 'sejours-group-box';
      groupDemande.innerHTML = `<div class="sejours-subgroup-title demande">🟠 En attente de ta confirmation (${sejoursDemande.length})</div>`;

      sejoursDemande.forEach(sej => {
        const item = document.createElement('div');
        item.className = 'sejour-item-recap demande-card';
        const dateAffichage = formaterPlageDates(sej.date, sej.dateFin, sej.moisNom);
        const badgeConfirme = sej.estConfirmeSejourSheet ? `<span class="badge-statut-confirme">🟢 Voyage assuré</span>` : ``;

        item.innerHTML = `
          <div class="sejour-nom-text">
            <span>${sej.nom}</span>
            ${badgeConfirme}
          </div>
          <div class="sejour-details-pills">
            <div class="sejour-date-tag">${dateAffichage}</div>
            <button class="btn-repondre-sejour" onclick="ouvrirPopinDetailSejour('${sej.semCode}', false)">Répondre</button>
          </div>
        `;
        groupDemande.appendChild(item);
      });

      sejoursListContainer.appendChild(groupDemande);
    }

    // 2. SÉJOURS ATTRIBUÉS
    if (sejoursAttribue.length > 0) {
      const groupAttrib = document.createElement('div');
      groupAttrib.className = 'sejours-group-box';
      groupAttrib.innerHTML = `<div class="sejours-subgroup-title confirme">🟢 Séjours attribués (${sejoursAttribue.length})</div>`;

      sejoursAttribue.forEach(sej => {
        const item = document.createElement('div');
        item.className = 'sejour-item-recap';
        const dateAffichage = formaterPlageDates(sej.date, sej.dateFin, sej.moisNom);
        const badgeConfirme = sej.estConfirmeSejourSheet ? `<span class="badge-statut-confirme">🟢 Voyage assuré</span>` : ``;

        item.innerHTML = `
          <div class="sejour-nom-text">
            <span>${sej.nom}</span>
            ${badgeConfirme}
          </div>
          <div class="sejour-details-pills">
            <div class="sejour-date-tag">${dateAffichage}</div>
            <button class="btn-detail-sejour" onclick="ouvrirPopinDetailSejour('${sej.semCode}', true)">Voir détail</button>
          </div>
        `;
        groupAttrib.appendChild(item);
      });

      sejoursListContainer.appendChild(groupAttrib);
    }

    // 3. SÉJOURS REFUSÉS (Masqué par défaut, aucun bouton d'action)
    if (sejoursRefuse.length > 0) {
      const groupRefuse = document.createElement('div');
      groupRefuse.className = 'sejours-group-box';
      groupRefuse.innerHTML = `
        <div class="sejours-subgroup-title refuse" onclick="toggleSubgroupRefuses()">
          <span>🔴 Séjours refusés (${sejoursRefuse.length})</span>
          <span id="arrow-subgroup-refuses" style="font-size:0.65rem; margin-left:4px;">▼</span>
        </div>
      `;

      const listRefusesContainer = document.createElement('div');
      listRefusesContainer.id = 'subgroup-refuses-list';
      listRefusesContainer.style.display = 'none'; 
      listRefusesContainer.style.flexDirection = 'column';
      listRefusesContainer.style.gap = '6px';
      listRefusesContainer.style.width = '100%';

      sejoursRefuse.forEach(sej => {
        const item = document.createElement('div');
        item.className = 'sejour-item-recap refuse-card';
        const dateAffichage = formaterPlageDates(sej.date, sej.dateFin, sej.moisNom);

        item.innerHTML = `
          <div class="sejour-nom-text text-secondary">
            <span>${sej.nom}</span>
          </div>
          <div class="sejour-details-pills">
            <div class="sejour-date-tag text-danger">${dateAffichage}</div>
          </div>
        `;
        listRefusesContainer.appendChild(item);
      });

      groupRefuse.appendChild(listRefusesContainer);
      sejoursListContainer.appendChild(groupRefuse);
    }

  } else {
    topRow.style.display = 'none';
    btnEspaceAzimut.style.display = 'none';
    if (badgeTitleAConfirmer) badgeTitleAConfirmer.style.display = 'none';
  }
}

function renderMonthsHTML() {
  const container = document.getElementById('months-wrapper');
  container.innerHTML = '';

  structureMois.forEach((m, index) => {
    const card = document.createElement('div');
    card.id = `month-card-${index}`;
    card.className = `month-card`;

    const nomMoisMinuscule = m.nom.toLowerCase();

    card.innerHTML = `
      <div class="month-header">
        <div class="month-title">${m.nom}</div>
        <div class="header-actions">
          <span id="badge-${index}" class="status-pill">En attente</span>
          <button id="btn-edit-${index}" class="btn-edit" onclick="clicBoutonEditer(${index})">✏️ Modifier</button>
        </div>
      </div>

      <div id="reminder-card-banner-${index}" class="reminder-card-banner">
        💡 Pour sauvegarder tes nouvelles dispos, n'oublie pas de cliquer sur « Enregistrer mes modifications » tout en bas !
      </div>

      <div id="month-body-${index}" class="month-body">
        <div id="month-choices-top-${index}" class="month-choices-top">
          <button id="btn-choice-occupe-${index}" class="btn-month-choice occupe" onclick="choixGlobalMois(${index}, 'Occupé')">Indisponible tout le mois</button>
          <button id="btn-choice-dispo-${index}" class="btn-month-choice dispo" onclick="choixGlobalMois(${index}, 'Disponible')">Disponible tout le mois</button>
        </div>
        
        <div id="month-choices-bottom-${index}" class="month-choices-bottom">
          <button id="btn-choice-custom-${index}" class="btn-month-choice btn-custom" onclick="ouvrirDetailMois(${index})">Ajuster semaine par semaine</button>
        </div>

        <div id="detail-${index}" class="weeks-detail">
          <div class="grid-weeks" id="grid-${index}"></div>
        </div>

        <div id="month-comment-wrapper-${m.id}">
          <button id="btn-toggle-com-${m.id}" class="comment-toggle-btn" onclick="toggleOuSupprimerCommentaire('${m.id}')">💬 Ajouter une remarque pour ${nomMoisMinuscule}</button>
          
          <div id="comment-box-${m.id}" class="comment-container">
            <div class="comment-row">
              <textarea id="comment-${m.id}" class="comment-textarea" placeholder="Ex: Disponible seulement à partir du 15, préférences stages..." oninput="saisieCommentaire('${m.id}', this.value)"></textarea>
              <button id="btn-action-com-${m.id}" class="btn-action-comment" onclick="actionBoutonCommentaire('${m.id}')" disabled>Valider ↵</button>
            </div>
          </div>
        </div>

        <div id="wrapper-next-${index}" class="next-btn-wrapper">
          <div id="bubble-incomplet-${index}" class="incomplet-tooltip-bubble" style="display: none;">
            Merci de renseigner toutes tes disponibilités pour valider ce mois.
          </div>
          <button id="btn-next-${index}" class="btn-next btn-next-disabled" onclick="validerEtSuivant(${index})">Valider ${m.nom} →</button>
        </div>
        <div style="clear:both;"></div>
      </div>
    `;

    container.appendChild(card);
  });
}

function toggleOuSupprimerCommentaire(moisId) {
  const box = document.getElementById(`comment-box-${moisId}`);
  const btnToggle = document.getElementById(`btn-toggle-com-${moisId}`);
  const txtArea = document.getElementById(`comment-${moisId}`);
  const btnAction = document.getElementById(`btn-action-com-${moisId}`);
  const mois = structureMois.find(m => m.id === moisId);
  const nomMoisMinuscule = mois ? mois.nom.toLowerCase() : "";

  const estOuvertOuRenseigne = box.classList.contains('open');

  if (!estOuvertOuRenseigne) {
    box.classList.add('open');
    btnToggle.textContent = `🗑️ Supprimer ma remarque`;
    if (txtArea && !txtArea.disabled) txtArea.focus();
  } else {
    commentairesMois[moisId] = "";
    commentairesValidesMois[moisId] = false;

    if (txtArea) {
      txtArea.value = "";
      txtArea.disabled = false;
    }

    if (btnAction) {
      btnAction.textContent = 'Valider ↵';
      btnAction.disabled = true;
      btnAction.classList.remove('validated-mode');
    }

    box.classList.remove('open');
    btnToggle.textContent = `💬 Ajouter une remarque pour ${nomMoisMinuscule}`;

    aDesModifications = true;
    actualiserRecap();
    actualiserEtatBouton();
  }
}

function saisieCommentaire(moisId, texte) {
  commentairesMois[moisId] = texte;
  const btnAction = document.getElementById(`btn-action-com-${moisId}`);

  if (btnAction && !commentairesValidesMois[moisId]) {
    btnAction.disabled = (texte.trim() === "");
  }

  aDesModifications = true;
  actualiserRecap();
  actualiserEtatBouton();
}

function actionBoutonCommentaire(moisId) {
  const txtArea = document.getElementById(`comment-${moisId}`);
  const btnAction = document.getElementById(`btn-action-com-${moisId}`);
  const estActuellementValide = commentairesValidesMois[moisId];

  if (!estActuellementValide) {
    if (!txtArea || txtArea.value.trim() === "") return;

    commentairesValidesMois[moisId] = true;
    txtArea.disabled = true;

    if (btnAction) {
      btnAction.textContent = '✏️ Modifier';
      btnAction.disabled = false;
      btnAction.classList.add('validated-mode');
    }
  } else {
    commentairesValidesMois[moisId] = false;
    if (txtArea) {
      txtArea.disabled = false;
      txtArea.focus();
    }

    if (btnAction) {
      btnAction.textContent = 'Valider ↵';
      btnAction.disabled = (txtArea.value.trim() === "");
      btnAction.classList.remove('validated-mode');
    }
  }

  aDesModifications = true;
  actualiserRecap();
  actualiserEtatBouton();
}

function reinitialiserClassesBoutonsGlooobaux(indexMois) {
  const btnOccupe = document.getElementById(`btn-choice-occupe-${indexMois}`);
  const btnDispo = document.getElementById(`btn-choice-dispo-${indexMois}`);
  const btnCustom = document.getElementById(`btn-choice-custom-${indexMois}`);

  if (btnOccupe) btnOccupe.classList.remove('selected-occupe');
  if (btnDispo) btnDispo.classList.remove('selected-dispo');
  if (btnCustom) btnCustom.classList.remove('selected-custom');
}

function choixGlobalMois(indexMois, statut) {
  const mois = structureMois[indexMois];
  
  const aUnSejour = mois.semaines.some(sem => {
    const sej = sejoursAgence[sem.code];
    const stG = sej ? String(sej.statutGuide || "").toLowerCase() : "";
    return sej && !stG.includes("refusé") && !stG.includes("refuse");
  });
  if (aUnSejour) return;

  mois.semaines.forEach(sem => {
    disposGuide[sem.code] = statut;
  });

  aDesModifications = true;

  document.getElementById(`detail-${indexMois}`).classList.remove('open');

  const monthCommentWrapper = document.getElementById(`month-comment-wrapper-${mois.id}`);
  if (monthCommentWrapper) monthCommentWrapper.style.display = 'block';

  reinitialiserClassesBoutonsGlooobaux(indexMois);
  if (statut === 'Occupé') {
    document.getElementById(`btn-choice-occupe-${indexMois}`)?.classList.add('selected-occupe');
  } else if (statut === 'Disponible') {
    document.getElementById(`btn-choice-dispo-${indexMois}`)?.classList.add('selected-dispo');
  }

  const badge = document.getElementById(`badge-${indexMois}`);
  if (badge) {
    badge.textContent = genererTexteBadgeMois(mois);
  }

  actualiserEtatValidationMois(indexMois);
  actualiserRecap();
  actualiserEtatBouton();
}

function ouvrirDetailMois(indexMois) {
  const mois = structureMois[indexMois];
  document.getElementById(`detail-${indexMois}`).classList.add('open');

  const monthCommentWrapper = document.getElementById(`month-comment-wrapper-${mois.id}`);
  if (monthCommentWrapper) {
    monthCommentWrapper.style.display = 'none';
  }

  const comMoisExistant = (commentairesMois[mois.id] || "").trim();
  if (comMoisExistant !== "") {
    mois.semaines.forEach(sem => {
      if (!commentairesSemaines[sem.code] || commentairesSemaines[sem.code].trim() === "") {
        commentairesSemaines[sem.code] = comMoisExistant;
      }
    });
    commentairesMois[mois.id] = "";
    commentairesValidesMois[mois.id] = false;
  }

  renderGridSemaines(indexMois);

  reinitialiserClassesBoutonsGlooobaux(indexMois);
  const btnCustom = document.getElementById(`btn-choice-custom-${indexMois}`);
  if (btnCustom) btnCustom.classList.add('selected-custom');

  actualiserEtatValidationMois(indexMois);

  setTimeout(() => {
    document.getElementById(`detail-${indexMois}`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 80);
}

function renderGridSemaines(indexMois) {
  const mois = structureMois[indexMois];
  const grid = document.getElementById(`grid-${indexMois}`);
  grid.innerHTML = '';

  mois.semaines.forEach(sem => {
    const sejour = sejoursAgence[sem.code];
    const stGuideLower = sejour ? String(sejour.statutGuide || "").toLowerCase() : "";
    const estRefuse = stGuideLower.includes("refusé") || stGuideLower.includes("refuse");

    const div = document.createElement('div');

    if (sejour && !estRefuse) {
      div.className = `week-card sejour-engagé`;
      
      const plageDates = formaterPlageDates(sejour.date, sejour.dateFin, "");
      const mentionDate = plageDates ? ` (${plageDates})` : '';

      const labelSejourPrincipal = sejour.nbSejours > 1 
        ? `🔒 ${sejour.nbSejours} séjours attribués${mentionDate}`
        : `🔒 1 séjour attribué${mentionDate}`;

      div.innerHTML = `
        <div class="week-title">
          ${sem.label}<span class="info-bubble-trigger" data-tooltip="Si le séjour débute un dimanche, il est affiché sur la semaine suivante">?</span>
        </div>
        <div class="sejour-badge-locked">
          <span class="sejour-text-main">${labelSejourPrincipal}</span>
          <span class="sejour-text-sub" data-tooltip="Les semaines avec des séjours attribués ne sont pas modifiables : contacte Azimut s'il y a une erreur ou un problème !">
            <span>Non modifiable</span>
            <svg class="sejour-icon-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </span>
        </div>
      `;
    } else {
      const statut = disposGuide[sem.code];
      const classStatut = statut ? statut.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
      const valCom = commentairesSemaines[sem.code] || "";

      div.className = `week-card ${classStatut}`;
      div.innerHTML = `
        <div class="week-title">${sem.label}</div>
        <div class="status-options">
          <button class="opt-btn" data-type="Disponible" onclick="setSemaineStatut('${sem.code}', 'Disponible', ${indexMois})">Dispo</button>
          <button class="opt-btn" data-type="Occupé" onclick="setSemaineStatut('${sem.code}', 'Occupé', ${indexMois})">Occupé</button>
          <button class="opt-btn" data-type="Option" onclick="setSemaineStatut('${sem.code}', 'Option', ${indexMois})">Peut-être</button>
        </div>
        <input type="text" class="week-comment-input" placeholder="💬 Remarque..." value="${valCom.replace(/"/g, '&quot;')}" oninput="saisieCommentaireSemaine('${sem.code}', this.value)">
      `;
    }

    grid.appendChild(div);
  });
}

function saisieCommentaireSemaine(semaineCode, texte) {
  commentairesSemaines[semaineCode] = texte;
  aDesModifications = true;
  actualiserEtatBouton();
}

function setSemaineStatut(semaineCode, statut, indexMois) {
  const sejour = sejoursAgence[semaineCode];
  const stGuideLower = sejour ? String(sejour.statutGuide || "").toLowerCase() : "";
  if (sejour && !stGuideLower.includes("refusé") && !stGuideLower.includes("refuse")) return;

  disposGuide[semaineCode] = statut;
  aDesModifications = true;
  renderGridSemaines(indexMois);
  actualiserEtatValidationMois(indexMois);
  actualiserRecap();
  actualiserEtatBouton();
}

function afficherBulleMoisIncomplet(indexMois) {
  masquerToutesLesBullesIncomplets();
  const bubble = document.getElementById(`bubble-incomplet-${indexMois}`);
  if (bubble) {
    bubble.style.display = 'block';
    clearTimeout(timerBulleIncomplet);
    timerBulleIncomplet = setTimeout(() => {
      bubble.style.display = 'none';
    }, 3500);
  }
}

function masquerBulleMoisIncomplet(indexMois) {
  const bubble = document.getElementById(`bubble-incomplet-${indexMois}`);
  if (bubble) bubble.style.display = 'none';
}

function masquerToutesLesBullesIncomplets() {
  structureMois.forEach((_, idx) => masquerBulleMoisIncomplet(idx));
}

function validerEtSuivant(indexMois) {
  if (!estMoisCompletementRenseigne(indexMois)) {
    afficherBulleMoisIncomplet(indexMois);
    return;
  }

  masquerBulleMoisIncomplet(indexMois);
  const mois = structureMois[indexMois];
  aDesModifications = true;
  
  const résuméText = genererTexteBadgeMois(mois);

  marquerMoisTermine(indexMois, résuméText);

  if (aDesDonneesEnregistrees && !aEteAvertiSauvegarde) {
    aEteAvertiSauvegarde = true;

    const banner = document.getElementById(`reminder-card-banner-${indexMois}`);
    if (banner) {
      banner.style.display = 'block';
      setTimeout(() => { banner.style.display = 'none'; }, 6000);
    }
  }

  debloquerMoisSuivant(indexMois);
  actualiserRecap();
  actualiserEtatBouton();
}

function marquerMoisTermine(indexMois, texteBadge) {
  const card = document.getElementById(`month-card-${indexMois}`);
  if (card) card.classList.add('completed');
  
  const body = document.getElementById(`month-body-${indexMois}`);
  if (body) body.style.display = 'none';

  actualiserVisibiliteBadgeRecap(indexMois);

  const badge = document.getElementById(`badge-${indexMois}`);
  if (badge) {
    badge.textContent = texteBadge;

    if (texteBadge.includes('séjour')) {
      badge.style.color = '#1e40af';
      badge.style.background = '#eff6ff';
    } else {
      badge.style.color = '#15803d';
      badge.style.background = '#dcfce7';
    }
  }

  const btnEdit = document.getElementById(`btn-edit-${indexMois}`);
  if (btnEdit) {
    btnEdit.style.display = 'inline-block';
    btnEdit.textContent = '✏️ Modifier';
  }

  if (moisOuvertEnEdition === indexMois) {
    moisOuvertEnEdition = null;
  }

  actualiserVerrouillageModifier();
}

function clicBoutonEditer(indexMois) {
  if (moisOuvertEnEdition !== null && moisOuvertEnEdition !== indexMois) {
    return; 
  }

  const body = document.getElementById(`month-body-${indexMois}`);
  const isCurrentlyOpen = (body && body.style.display === 'block');

  if (isCurrentlyOpen) {
    fermerMoisSansModifier(indexMois);
  } else {
    rouvrirMois(indexMois);
  }
}

function fermerMoisSansModifier(indexMois) {
  const mois = structureMois[indexMois];
  const résuméText = genererTexteBadgeMois(mois);
  marquerMoisTermine(indexMois, résuméText);
}

function rouvrirMois(indexMois) {
  moisOuvertEnEdition = indexMois;

  const body = document.getElementById(`month-body-${indexMois}`);
  body.style.display = 'block';

  actualiserVisibiliteBadgeRecap(indexMois);

  const btnEdit = document.getElementById(`btn-edit-${indexMois}`);
  if (btnEdit) {
    btnEdit.style.display = 'inline-block';
    btnEdit.textContent = 'Annuler';
  }
  
  const card = document.getElementById(`month-card-${indexMois}`);
  if (card) card.classList.remove('completed');

  configurerBoutonsGlobauxMois(indexMois);
  actualiserEtatValidationMois(indexMois);
  actualiserVerrouillageModifier();
  actualiserEtatBouton();
}

function configurerBoutonsGlobauxMois(indexMois) {
  const mois = structureMois[indexMois];
  const aUnSejour = mois.semaines.some(sem => {
    const sej = sejoursAgence[sem.code];
    const stG = sej ? String(sej.statutGuide || "").toLowerCase() : "";
    return sej && !stG.includes("refusé") && !stG.includes("refuse");
  });

  const choicesTopContainer = document.getElementById(`month-choices-top-${indexMois}`);
  const choicesBottomContainer = document.getElementById(`month-choices-bottom-${indexMois}`);
  const btnCustom = document.getElementById(`btn-choice-custom-${indexMois}`);

  if (aUnSejour) {
    if (choicesTopContainer) choicesTopContainer.style.display = 'none';
    if (choicesBottomContainer) choicesBottomContainer.style.display = 'none';

    reinitialiserClassesBoutonsGlooobaux(indexMois);
    if (btnCustom) btnCustom.classList.add('selected-custom');
    ouvrirDetailMois(indexMois);

  } else {
    if (choicesTopContainer) choicesTopContainer.style.display = 'grid';
    if (choicesBottomContainer) choicesBottomContainer.style.display = 'flex';

    reinitialiserClassesBoutonsGlooobaux(indexMois);

    let dispoCount = 0, occupeCount = 0, totalSemaines = mois.semaines.length;
    let nonRenseigneCount = 0;

    mois.semaines.forEach(sem => {
      const s = disposGuide[sem.code];
      if (s === "Disponible") dispoCount++;
      else if (s === "Occupé") occupeCount++;
      else if (!s) nonRenseigneCount++;
    });

    const listeCommsSemaines = mois.semaines.map(sem => (commentairesSemaines[sem.code] || "").trim());
    const premierCom = listeCommsSemaines[0];
    const tousLesCommsIdentiques = listeCommsSemaines.every(com => com === premierCom);

    const btnOccupe = document.getElementById(`btn-choice-occupe-${indexMois}`);
    const btnDispo = document.getElementById(`btn-choice-dispo-${indexMois}`);

    if (!tousLesCommsIdentiques) {
      if (btnCustom) btnCustom.classList.add('selected-custom');
      ouvrirDetailMois(indexMois);
    } else if (nonRenseigneCount === totalSemaines) {
      document.getElementById(`detail-${indexMois}`).classList.remove('open');
    } else if (occupeCount === totalSemaines) {
      if (btnOccupe) btnOccupe.classList.add('selected-occupe');
      document.getElementById(`detail-${indexMois}`).classList.remove('open');
    } else if (dispoCount === totalSemaines) {
      if (btnDispo) btnDispo.classList.add('selected-dispo');
      document.getElementById(`detail-${indexMois}`).classList.remove('open');
    } else {
      if (btnCustom) btnCustom.classList.add('selected-custom');
      ouvrirDetailMois(indexMois);
    }
  }

  actualiserEtatValidationMois(indexMois);
}

function debloquerMoisSuivant(indexMois) {
  const indexSuivant = indexMois + 1;

  if (indexSuivant < structureMois.length) {
    const cardSuivante = document.getElementById(`month-card-${indexSuivant}`);
    if (cardSuivante) {
      cardSuivante.classList.add('active');
      configurerBoutonsGlobauxMois(indexSuivant);
      moisOuvertEnEdition = null;
      actualiserVerrouillageModifier();
      setTimeout(() => {
        cardSuivante.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  } else {
    moisOuvertEnEdition = null;
    actualiserVerrouillageModifier();
    
    if (!aDesDonneesEnregistrees && modalConfirmationEndInstance) {
      modalConfirmationEndInstance.show();
    } else {
      scrollerEtMettreEnValeurBoutonSave();
    }
  }
}

function fermerModalEtScroller() {
  if (modalConfirmationEndInstance) {
    modalConfirmationEndInstance.hide();
  }
  setTimeout(() => {
    scrollerEtMettreEnValeurBoutonSave();
  }, 200);
}

function scrollerEtMettreEnValeurBoutonSave() {
  const btnSave = document.getElementById('save-btn');
  if (!btnSave) return;

  document.body.classList.add('selection-finished');

  btnSave.scrollIntoView({ behavior: 'smooth', block: 'center' });
  btnSave.classList.add('highlight-pulse');

  if (!ecouteurPremierClicPostPopin) {
    ecouteurPremierClicPostPopin = true;
    const reinitialiserSurlignageEtGriser = () => {
      btnSave.classList.remove('highlight-pulse');
      document.body.classList.remove('selection-finished');
      window.removeEventListener('click', reinitialiserSurlignageEtGriser, true);
      ecouteurPremierClicPostPopin = false;
    };
    setTimeout(() => {
      window.addEventListener('click', reinitialiserSurlignageEtGriser, true);
    }, 100);
  }
}

// CHARGEMENT VIA GOOGLE APPS SCRIPT
async function chargerDonneesGoogleSheets() {
  const inlineLoader = document.getElementById('inline-loader');
  if (inlineLoader) inlineLoader.classList.add('active');

  if (!guideTokenParam) {
    if (inlineLoader) inlineLoader.classList.remove('active');
    document.getElementById('guide-info').innerHTML = '<span class="guide-label">Accès :</span> <span class="guide-name">Refusé</span>';
    document.getElementById('months-wrapper').style.display = 'none';
    document.getElementById('save-btn').style.display = 'none';
    document.getElementById('summary-section').style.display = 'none';
    document.getElementById('welcome-notice').style.display = 'none';
    document.getElementById('start-btn').style.display = 'none';
    afficherMessage("⛔ Lien invalide ou expiré. L'accès nécessite un token individuel sécurisé.", "error");
    return;
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getGuideData&token=${encodeURIComponent(guideTokenParam)}`);
    const result = await response.json();

    if (result.status !== "success") {
      if (inlineLoader) inlineLoader.classList.remove('active');
      document.getElementById('guide-info').innerHTML = '<span class="guide-label">Accès :</span> <span class="guide-name">Refusé</span>';
      document.getElementById('months-wrapper').style.display = 'none';
      document.getElementById('save-btn').style.display = 'none';
      document.getElementById('summary-section').style.display = 'none';
      document.getElementById('welcome-notice').style.display = 'none';
      document.getElementById('start-btn').style.display = 'none';
      afficherMessage("⛔ Lien invalide ou expiré. L'accès nécessite un token individuel sécurisé.", "error");
      return;
    }

    const nomGuideCherche = result.guideName;
    document.getElementById('guide-info').innerHTML = `
      <span class="status-dot"></span>
      <span class="guide-label">Guide :</span>
      <span class="guide-name">${nomGuideCherche}</span>
      <button id="btn-edit-profile" class="btn-edit-profile-tag" onclick="ouvrirProfilEdit()">✏️ Éditer mon profil</button>
    `;

    profilRenseigneSurServeur = false;
    if (result.profile) {
      if (result.profile.qualification) {
        const r1 = document.querySelector(`input[name="q1_qualification"][value="${result.profile.qualification}"]`);
        if (r1) r1.checked = true;
      }
      if (result.profile.preferenceSejour) {
        const r2 = document.querySelector(`input[name="q2_pref"][value="${result.profile.preferenceSejour}"]`);
        if (r2) r2.checked = true;
      }
      if (result.profile.anglophones) {
        const r3 = document.querySelector(`input[name="q3_anglo"][value="${result.profile.anglophones}"]`);
        if (r3) r3.checked = true;
      }
      profilRenseigneSurServeur = verifierFormulaireProfilComplet();
    }

    const btnEditProfile = document.getElementById('btn-edit-profile');
    if (profilRenseigneSurServeur && btnEditProfile) {
      btnEditProfile.style.display = 'inline-block';
    }

    let aAussiDesDisposAuteursGuide = false;

    if (result.dispos && result.dispos.length > 0) {
      result.dispos.forEach(row => {
        const valSemaine = row.semaine;
        const valStatut = row.statut;
        
        const sejourVal = row.nomSejour || row.idSejour || row.sejour || "";
        const idSejourVal = row.idSejour || "";
        const dateDepartVal = row.dateDepart || "";
        const dateFinVal = row.dateFin || "";
        const dureeVal = row.duree || "";
        const comVal = row.commentaire || "";
        const inscritsVal = row.inscritsReel !== undefined ? row.inscritsReel : (row.inscrits !== undefined ? row.inscrits : undefined);
        const paxMaxVal = row.paxMax !== undefined ? row.paxMax : undefined;
        const statutSejourVal = row.statutSejour || row.etatSejour || row.etat || "";
        const statutGuideVal = row.statutGuide || row.statut || "";
        const urlSejourVal = row.urlSejour || row.url || row.lienSejour || "";
        const urlFicheVal = row.urlFiche || row.urlFicheTechnique || row.ficheTechnique || "";

        if (valSemaine) {
          const codeSemaineRow = extraireCodeSemaine(valSemaine);
          
          structureMois.forEach(m => {
            m.semaines.forEach(semStructure => {
              const codeSemaineStructure = extraireCodeSemaine(semStructure.code);

              if (codeSemaineRow && codeSemaineRow === codeSemaineStructure) {
                
                if (sejourVal && sejourVal.trim() !== "") {
                  const estMultiple = sejourVal.includes(" / ");
                  const nbSejours = estMultiple ? sejourVal.split(" / ").length : 1;

                  sejoursAgence[semStructure.code] = {
                    nom: sejourVal,
                    idSejour: idSejourVal,
                    date: dateDepartVal,
                    dateFin: dateFinVal,
                    duree: dureeVal,
                    nbSejours: nbSejours,
                    inscrits: inscritsVal,
                    paxMax: paxMaxVal,
                    statut: statutSejourVal,
                    statutGuide: statutGuideVal,
                    urlSejour: urlSejourVal,
                    urlFiche: urlFicheVal
                  };
                } else if (valStatut) {
                  disposGuide[semStructure.code] = valStatut;
                  aAussiDesDisposAuteursGuide = true;
                }

                if (comVal && comVal.trim() !== "") {
                  commentairesSemaines[semStructure.code] = comVal;
                }
              }
            });
          });
        }
      });

      structureMois.forEach(m => {
        const commsDuMois = m.semaines.map(sem => (commentairesSemaines[sem.code] || "").trim());
        const premierComm = commsDuMois[0];
        const tousIdentiquesEtNonVides = premierComm !== "" && commsDuMois.every(c => c === premierComm);

        if (tousIdentiquesEtNonVides) {
          commentairesMois[m.id] = premierComm;
          commentairesValidesMois[m.id] = true;

          m.semaines.forEach(sem => {
            commentairesSemaines[sem.code] = "";
          });

          const txtArea = document.getElementById(`comment-${m.id}`);
          const box = document.getElementById(`comment-box-${m.id}`);
          const btnAction = document.getElementById(`btn-action-com-${m.id}`);
          const btnToggle = document.getElementById(`btn-toggle-com-${m.id}`);

          if (txtArea) {
            txtArea.value = premierComm;
            txtArea.disabled = true;
          }
          if (btnAction) {
            btnAction.textContent = '✏️ Modifier';
            btnAction.disabled = false;
            btnAction.classList.add('validated-mode');
          }
          if (btnToggle) btnToggle.textContent = '🗑️ Supprimer ma remarque';
          if (box) box.classList.add('open');
        }
      });
    }

    aEteAvertiSauvegarde = false;

    if (aAussiDesDisposAuteursGuide) {
      aDesDonneesEnregistrees = true;
      document.getElementById('start-btn').style.display = 'none';
      document.getElementById('save-btn').style.display = 'block';
      
      const sectionTitle = document.getElementById('section-dispos-title');
      if (sectionTitle) sectionTitle.style.display = 'block';

      restaurerAffichageMois();
      actualiserRecap();
      afficherMessage("ℹ️ Tes disponibilités enregistrées ont été chargées. Tu peux les modifier et valider tes changements à tout moment.", "success");
      
      document.getElementById('dispos-full-wrapper').style.display = 'none';
    } else {
      aDesDonneesEnregistrees = false;
      reinitialiserProgressionVierge();
      actualiserRecap();
    }

    actualiserVerrouillageModifier();
    actualiserEtatBouton();

    if (inlineLoader) inlineLoader.classList.remove('active');

  } catch (err) {
    console.error("Erreur de lecture Google Sheets :", err);
    if (inlineLoader) inlineLoader.classList.remove('active');
    afficherMessage("Erreur de connexion au serveur.", "error");
  }
}

function reinitialiserProgressionVierge() {
  document.getElementById('start-btn').style.display = 'block';
  document.getElementById('save-btn').style.display = 'none';
  document.getElementById('dispos-full-wrapper').style.display = 'block';
  
  const sectionTitle = document.getElementById('section-dispos-title');
  if (sectionTitle) sectionTitle.style.display = 'none';

  moisOuvertEnEdition = null;

  structureMois.forEach((_, index) => {
    const card = document.getElementById(`month-card-${index}`);
    if (card) {
      card.classList.remove('active');
      card.classList.remove('completed');
    }
    
    const body = document.getElementById(`month-body-${index}`);
    if (body) body.style.display = 'block';

    actualiserVisibiliteBadgeRecap(index);

    const badge = document.getElementById(`badge-${index}`);
    if (badge) {
      badge.textContent = 'En attente';
      badge.style.background = '#f1f5f9';
      badge.style.color = '#64748b';
    }

    const btnEdit = document.getElementById(`btn-edit-${index}`);
    if (btnEdit) btnEdit.style.display = 'none';
  });
}

function restaurerAffichageMois() {
  structureMois.forEach((m, index) => {
    const résuméText = genererTexteBadgeMois(m);
    
    const card = document.getElementById(`month-card-${index}`);
    if (card) {
      card.classList.add('active');
      marquerMoisTermine(index, résuméText);
    }
  });
}

async function enregistrerDispos() {
  const btn = document.getElementById('save-btn');
  const overlay = document.getElementById('loading-overlay');

  if (overlay) overlay.classList.add('active');

  estBoutonSauvegardePret = false;
  btn.classList.remove('highlight-pulse');

  try {
    const payloadDispos = [];

    structureMois.forEach(mois => {
      const comMois = commentairesMois[mois.id] || "";

      mois.semaines.forEach(sem => {
        const sejour = sejoursAgence[sem.code];
        const stGuideLower = sejour ? String(sejour.statutGuide || "").toLowerCase() : "";
        const estRefuse = stGuideLower.includes("refusé") || stGuideLower.includes("refuse");

        if (!sejour || estRefuse) {
          const comSem = commentairesSemaines[sem.code] || "";
          const codeClean = extraireCodeSemaine(sem.code);

          payloadDispos.push({
            semaine: codeClean ? codeClean : sem.code,
            statut: disposGuide[sem.code] || "Disponible",
            commentaire: comSem !== "" ? comSem : comMois
          });
        }
      });
    });

    const postBody = {
      action: "saveDisposGuide",
      token: guideTokenParam,
      dispos: payloadDispos
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(postBody)
    });

    aDesModifications = false;
    aDesDonneesEnregistrees = true;
    aEteAvertiSauvegarde = false;
    if (overlay) overlay.classList.remove('active');

    actualiserRecap();

    document.getElementById('dispos-full-wrapper').style.display = 'none';
    
    btn.className = "btn-save success-state";
    btn.textContent = "✓ Disponibilités enregistrées";
    afficherMessage(`✓ Tes disponibilités et tes remarques ont été enregistrées avec succès ! Tu peux modifier tes choix à tout moment depuis ce même lien.`, "success");

    const summaryBox = document.getElementById('summary-section');
    setTimeout(() => {
      summaryBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

  } catch (err) {
    console.error("Erreur enregistrement :", err);
    if (overlay) overlay.classList.remove('active');
    afficherMessage("Erreur réseau lors de l'enregistrement.", "error");
    actualiserEtatBouton();
  }
}

function afficherMessage(txt, type) {
  const b = document.getElementById('banner');
  b.textContent = txt;
  b.className = `status-banner ${type}`;
}

window.onload = initApp;