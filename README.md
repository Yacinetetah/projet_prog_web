
# Projet Programmation Web

Ce projet est une application web de gestion de recettes de cuisine. Il est développé en PHP, Javascript et utilise des fichiers JSON pour stocker les données.

## Structure du Projet

Le projet est organisé en plusieurs dossiers :

- **projet-recees/** : Dossier racine du projet.
- **controllers/** : Fichiers PHP gérant la logique de l'application.
- **data/** : Fichiers JSON pour stocker les données (utilisateurs, recettes, commentaires, rôles).
- **front/** : Fichiers frontend (HTML, CSS, JavaScript, images).
- **index.php** : Point d'entrée principal (utilisé par le routeur).
- **router.php** : Gère les requêtes et les dirige vers les contrôleurs.

## Installation et Lancement

1. Clonez le projet depuis GitHub :

   ```bash
   git clone https://github.com/Yacinetetah/projet_prog_web.git
   ```

2. Lancez le serveur web intégré de PHP :

   ```bash
   php -S localhost:8000 -t .
   ```

   Cette commande démarre un serveur web local sur le port 8000, servant les fichiers depuis le répertoire courant (`.`).

## Tester l'Application

Une fois le serveur lancé, ouvrez votre navigateur et accédez aux pages suivantes :

- **Page de Connexion** : [http://localhost:8000/front/connexion.html](http://localhost:8000/front/connexion.html)
- **Page d'Inscription** : [http://localhost:8000/front/inscription.html](http://localhost:8000/front/inscription.html)
- **Page d'Accueil (Recettes)** : [http://localhost:8000/front/index.html](http://localhost:8000/front/index.html)

## Notes pour le Test

- Vous pouvez créer de nouveaux utilisateurs via la page d'inscription. Par défaut, un nouvel utilisateur a le rôle "cuisinier".
- Pour tester les rôles "chef" ou "administrateur", vous devrez :
  - Modifier manuellement le fichier `data/users.json`.
  - Ou utiliser la fonctionnalité de gestion des utilisateurs si vous avez un compte administrateur fonctionnel.
- Connectez-vous avec différents rôles pour observer les différences d'affichage et de fonctionnalités :
  - Création de recette disponible pour les rôles **chef** et **administrateur**.
  - Liste des utilisateurs réservée au rôle **administrateur**.
  - Les boutons "modifier" et "supprimer" apparaissent en fonction du rôle.
- Vérifiez les fichiers JSON dans le dossier `data/` après chaque action (inscription, création de recette, ajout de commentaire, mise à jour de rôle) pour observer comment les données sont stockées.
