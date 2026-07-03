# Signal Clone — démo pédagogique

Messagerie avec chiffrement de bout en bout basé sur le vrai protocole Signal
(X3DH + Double Ratchet), via la librairie officielle
`@privacyresearch/libsignal-protocol-typescript`.

## Prérequis

- Node.js installé sur votre PC (https://nodejs.org, version LTS)

## Installation (à faire une seule fois)

Ouvrez un terminal dans ce dossier et lancez :

```bash
npm install
npm run build
```

## Lancer l'application

```bash
npm start
```

Puis ouvrez votre navigateur à l'adresse : http://localhost:3000

## Tester le chiffrement de bout en bout

1. Ouvrez **deux onglets** (ou deux navigateurs) sur http://localhost:3000
2. Dans l'onglet 1 : inscrivez-vous avec le pseudo `alice`
3. Dans l'onglet 2 : inscrivez-vous avec le pseudo `bob`
4. Dans l'onglet 1 : tapez `bob` comme destinataire et envoyez un message
5. Le message apparaît en clair dans l'onglet 2, mais transite chiffré
   sur le réseau (regardez l'onglet Réseau des outils développeur : vous
   ne verrez que du texte chiffré illisible)

## Ce qui EST couvert (niveau Signal réel)

- Vraie implémentation X3DH (échange de clés initial)
- Vrai Double Ratchet (une nouvelle clé de chiffrement à chaque message)
- Clés privées qui ne quittent jamais le navigateur
- Serveur "aveugle" qui ne voit que du texte chiffré

## Ce qui N'EST PAS couvert (limites de cette démo)

Pour une vraie mise en production sécurisée, il manque :

- **Persistance chiffrée des clés** : actuellement en mémoire JS, tout est
  perdu au rechargement de la page. Il faudrait du IndexedDB chiffré par
  un mot de passe utilisateur.
- **Vérification des empreintes de sécurité** ("safety numbers") : sans
  ça, un serveur malveillant pourrait théoriquement substituer les clés
  publiques d'un contact (attaque de l'homme du milieu). Signal affiche
  un code que les deux utilisateurs comparent en personne ou via un
  canal séparé.
- **Authentification des utilisateurs** : ici, n'importe qui peut
  s'inscrire sous n'importe quel pseudo. Il faudrait un vrai système de
  comptes (mot de passe, numéro de téléphone vérifié, etc.)
- **HTTPS/WSS** : en production, tout doit passer en connexion chiffrée
  au niveau transport (en plus du chiffrement de bout en bout).
- **Base de données persistante** côté serveur (actuellement tout est en
  mémoire, effacé au redémarrage).
- **Gestion des groupes**, rotation des préclés épuisées, messages hors
  ligne, etc.

Ce projet est un point de départ pédagogique fidèle au protocole, pas un
produit prêt pour de vraies conversations sensibles.
