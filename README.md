# Orange FC — Gestion de club de football

Application web complète de gestion d'un club de football, avec thème **noir / orange / gris** en dégradé, **mode clair/sombre**, animations (Framer Motion), et bascule **Français / Arabe (RTL)**.

Les données sont **constantes (mock)** et persistées dans le navigateur (localStorage) : tout est cliquable et fonctionnel, sans backend.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production dans dist/
npm run preview  # prévisualiser le build
```

## Connexion

- **Compte démo (Admin)** : bouton « Connexion démo » sur la page de login — identifiants `demo` / `demo`.
- **Créer un compte admin** : nom, nom d'utilisateur, e-mail, mot de passe.
- **Voir le site web** : bouton menant à la page vitrine publique (`/website`).

## Interfaces (barre latérale)

| Module | Contenu |
|---|---|
| **Tableau de bord** | Statistiques + graphiques (revenus/dépenses, joueurs par catégorie, statut des paiements, alertes d'expiration). |
| **Planificateur** | Création de créneaux avec catégorie / groupe / sport / stade créables à la volée, sélection multi-jours, horaires. Nom auto-généré. Cartes + détails + **vue calendrier** + filtres. |
| **Abonnements** | Création (recherche de créneau, période, séances, prix unitaire/total), cartes, détails, édition, suppression. |
| **Joueurs** | Cartes, détails à onglets (infos + parent, abonnement, historique paiements), **assignation d'abonnement** (date de début → expiration auto, calcul du reste → créance/payé, frais d'inscription), **paiement de créance**, **carte joueur imprimable (QR / code-barres + photo)**, filtres complets, alertes d'expiration, envoi e-mail (PDF simulé). |
| **Parents** | Création avec recherche/liaison de plusieurs enfants, détails, envoi de rapport/message (PDF simulé). |
| **Entraîneurs** | Type de paiement (mensuel / pourcentage), assignation de créneaux, acomptes, absences, **paiement** (mois impayés ou % des abonnements avec détails), notifications d'expiration. |
| **Site web** | Gestion des **activités** (image/dégradé, nom, description) et des **contacts** (Facebook, Instagram, TikTok, Maps, téléphone, WhatsApp, e-mail). |
| **Employés** | Création (rôle créable, rémunération jour/mois, compte de connexion optionnel), **permissions** par interface et par action, acomptes, absences, paiement. |
| **Dépenses** | Création (catégorie créable), historique, édition, suppression, filtre. |
| **Caisse** | Transactions dépôt/retrait, journal des encaissements joueurs + dépenses, filtres par période (jour / semaine / mois / personnalisé), solde. |
| **Analyse** | Période + filtres (groupe, entraîneur) + bouton **Générer**, graphiques et tableau détaillé. |
| **Rapports** | Rapport de période détaillé et **imprimable** sur toutes les interfaces, avec sections dépliables et filtres. |
| **Paramètres** | Infos club (logo, NIF/NIS/Art/RC…), compte, **sauvegarde / restauration** de la base (JSON). |
| **Site public** | Page vitrine animée : logo, nom, description, activités, contacts (appel / WhatsApp direct). |

## Pile technique

React · TypeScript · Vite · Tailwind CSS · Framer Motion · React Router · i18next · Recharts · Lucide · qrcode.react · react-barcode · Day.js.

## Notes

- **E-mails / PDF** : simulés (confirmation visuelle) car l'application est 100 % front-end sans serveur d'envoi.
- **Réinitialiser** les données de démo : Paramètres → Base de données → « Réinitialiser ».
