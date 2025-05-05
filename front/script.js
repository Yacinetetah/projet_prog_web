// front/script.js

/***********************************************
 * 1) GESTION DE LA SESSION (login, logout)
 ***********************************************/
function setUserSession(userId, role, name) {
    localStorage.setItem('user_id', userId);
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
}

function getCurrentUserId() {
    return localStorage.getItem('user_id');
}

function getCurrentUserRole() {
    return localStorage.getItem('role');
}

function getCurrentUserName() {
    return localStorage.getItem('name');
}

function isLoggedIn() {
    return !!getCurrentUserId();
}

function logout() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    window.location.href = "/front/connexion.html";
}

/***********************************************
 * 2) FONCTION AJAX UTILITAIRE
 ***********************************************/
async function ajaxRequest(method, url, bodyObj = null) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        // Ajout des headers X-User-Id et X-User-Role pour simuler l'authentification côté serveur
        // **ATTENTION : CECI N'EST PAS SÉCURISÉ EN PRODUCTION. UTILISER DES SESSIONS SERVEUR.**
        if (isLoggedIn()) {
            xhr.setRequestHeader('X-User-Id', getCurrentUserId());
            xhr.setRequestHeader('X-User-Role', getCurrentUserRole());
        }

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                let resp;
                try {
                    // Tenter de parser la réponse JSON même en cas d'erreur HTTP
                    resp = JSON.parse(xhr.responseText || '{}');
                } catch (e) {
                    // Si la réponse n'est pas du JSON valide, utiliser un objet vide ou un message par défaut
                    resp = { error: xhr.responseText || 'Unknown error' };
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({ ok: true, status: xhr.status, data: resp });
                } else {
                    // Inclure le statut HTTP en cas d'erreur
                    resolve({ ok: false, status: xhr.status, data: resp });
                }
            }
        };
        if (bodyObj) {
            xhr.send(JSON.stringify(bodyObj));
        } else {
            xhr.send();
        }
    });
}

/***********************************************
 * 3) AUTHENTIFICATION (LOGIN, REGISTER)
 ***********************************************/
async function login(email, password) {
    const { ok, data, status } = await ajaxRequest('POST', '/login', { email, password });
    if (!ok) {
        // Afficher l'erreur du serveur ou un message générique en cas d'échec
        alert("Erreur de connexion (" + status + "): " + (data.error || ''));
    } else {
        // alert("Bienvenue " + data.name + ", rôle: " + data.role); // Retirer cette alerte
        setUserSession(data.user_id, data.role, data.name);
        window.location.href = "/front/index.html"; // Rediriger vers la page des recettes
    }
}

async function registerUser(name, email, password, roleDemand) {
    const payload = { name, email, password };
    if (roleDemand) payload.roleDemand = roleDemand;
    const { ok, data, status } = await ajaxRequest('POST', '/register', payload);
    if (!ok) {
        alert("Erreur d'inscription (" + status + "): " + (data.error || ''));
    } else {
        alert("Inscription réussie! Votre ID: " + data.user_id + ". Vous pouvez maintenant vous connecter.");
        window.location.href = "/front/connexion.html";
    }
}

/***********************************************
 * 4) GESTION DES UTILISATEURS (ADMIN)
 ***********************************************/
async function loadUsers() {
     // Vérification côté client : seul l'admin peut voir la liste des utilisateurs
    if (getCurrentUserRole() !== 'admin') {
        // Cacher la section si l'utilisateur n'est pas admin
        const container = document.getElementById('user-list');
        if(container) container.style.display = 'none';
        alert("Vous n'êtes pas administrateur."); // Informer l'utilisateur
        return; // Arrêter la fonction
    }

    const { ok, data } = await ajaxRequest('GET', '/users');
    if (!ok) {
        alert("Erreur loadUsers: " + (data.error || ''));
    } else {
        renderUsers(data);
    }
}

function renderUsers(usersObj) {
    const container = document.getElementById('user-list');
    if (!container) return;
    container.style.display = 'block'; // S'assurer qu'elle est visible pour l'admin
    container.innerHTML = `<h2>Liste des utilisateurs</h2>`;
    // Convertir l'objet d'utilisateurs en tableau pour itérer plus facilement
    const usersArray = Object.entries(usersObj).map(([id, user]) => ({ id, ...user }));

     // Trier les utilisateurs par rôle ou nom si désiré
     // usersArray.sort((a, b) => a.role.localeCompare(b.role));


    usersArray.forEach(([userId, userData]) => { // Itérer sur le tableau
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
          <p><strong>ID:</strong> ${userId}</p>
          <p><strong>Nom:</strong> ${userData.name}</p>
          <p><strong>Email:</strong> ${userData.email}</p>
          <p><strong>Rôle actuel:</strong> ${userData.role}</p>
          <label>Choisir un nouveau rôle :</label>
          <select id="role-select-${userId}" class="input-text">
            <option value="admin" ${userData.role === 'admin' ? 'selected' : ''}>admin</option>
            <option value="chef" ${userData.role === 'chef' ? 'selected' : ''}>chef</option>
            <option value="traducteur" ${userData.role === 'traducteur' ? 'selected' : ''}>traducteur</option>
            <option value="cuisinier" ${userData.role === 'cuisinier' ? 'selected' : ''}>cuisinier</option>
            <option value="demandeChef" ${userData.role === 'demandeChef' ? 'selected' : ''}>demandeChef</option>
            <option value="demandeTraducteur" ${userData.role === 'demandeTraducteur' ? 'selected' : ''}>demandeTraducteur</option>
          </select>
          <button class="btn-update-role btn btn-small" data-id="${userId}">Mettre à jour</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.btn-update-role').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.dataset.id;
            const newRole = document.getElementById(`role-select-${userId}`).value;
            // Empêcher l'admin de changer son propre rôle (pour éviter de se bloquer)
            if (userId === getCurrentUserId() && newRole !== 'admin') {
                 alert("Vous ne pouvez pas changer votre propre rôle d'administrateur vers un autre rôle.");
                 // Réinitialiser la sélection
                 document.getElementById(`role-select-${userId}`).value = getCurrentUserRole();
                 return;
            }
            await updateUserRole(userId, newRole);
        });
    });
}

async function updateUserRole(userId, newRole) {
     // Vérification côté client (double sécurité avec le serveur)
    if (getCurrentUserRole() !== 'admin') {
        alert("Action réservée à l'administrateur.");
        return;
    }
    const { ok, data, status } = await ajaxRequest('POST', `/users/${userId}/role`, { role: newRole });
    if (!ok) {
        alert("Erreur mise à jour rôle (" + status + "): " + (data.error || ''));
    } else {
        alert(`Rôle de ${userId} mis à jour en ${newRole}`);
        // Si l'admin change son propre rôle (ce que le front empêche en partie), recharger pour mettre à jour l'affichage
        if (userId === getCurrentUserId()) {
             setUserSession(getCurrentUserId(), newRole, getCurrentUserName()); // Mettre à jour localStorage
             // Pas besoin de recharger la page entière, le header se mettra à jour si bien codé,
             // mais pour simplifier, on peut recharger la liste ou juste l'affichage du rôle.
             // Pour l'instant, on recharge la liste des utilisateurs pour voir le changement.
             loadUsers(); // Recharger la liste des utilisateurs
             // Si le rôle devient non-admin, la section utilisateur sera masquée au rechargement de la liste.
        } else {
            loadUsers(); // Recharger la liste des utilisateurs pour les autres
        }
    }
}

/***********************************************
 * 5) GESTION DES RECETTES
 ***********************************************/
let allRecipes = [];
let currentLanguage = 'fr'; // Langue par défaut
const toggleLangButton = document.getElementById('toggle-lang'); // Récupérer le bouton une seule fois

async function loadRecipes() {
    // Envoyer l'ID et le rôle de l'utilisateur connecté dans les headers pour que le serveur puisse filtrer
    // La fonction ajaxRequest le fait déjà automatiquement si l'utilisateur est connecté.
    const { ok, data, status } = await ajaxRequest('GET', '/recipes');
    if (!ok) {
        alert("Erreur loadRecipes (" + status + "): " + (data.error || ''));
        return;
    }
    // Convertit l'objet en tableau
    allRecipes = Object.entries(data).map(([id, recipe]) => ({ id, ...recipe }));
    renderRecipes(allRecipes); // Afficher les recettes reçues (déjà filtrées par le serveur)
}

function renderRecipes(recipes) {
    const container = document.getElementById('recipe-list');
    if (!container) return;
    container.innerHTML = ''; // Vider la liste actuelle
    const currentUserId = getCurrentUserId(); // Récupérer l'ID utilisateur actuel
    const currentUserRole = getCurrentUserRole(); // Récupérer le rôle utilisateur actuel

    if (recipes.length === 0) {
         container.innerHTML = '<p>Aucune recette disponible pour l\'instant selon votre rôle.</p>';
         return;
    }

    recipes.forEach(recipe => {
        // Le filtrage de visibilité est géré côté serveur dans RecipeController::getAll.
        // Ici, on affiche simplement les recettes qui ont été renvoyées par l'API.
        // Cependant, les permissions d'édition/suppression sont gérées à l'affichage côté client.

         const isMyRecipe = recipe.author === currentUserId;
         const isAdmin = currentUserRole === 'admin';
         const isChef = currentUserRole === 'chef';


        const title = (currentLanguage === 'fr')
            ? (recipe.title_fr || recipe.title || 'Recette sans titre FR')
            : (recipe.title_en || recipe.title || 'Untitled Recipe EN'); // Textes par défaut si null
        const ingredients = (currentLanguage === 'fr')
            ? (recipe.ingredients_fr || [])
            : (recipe.ingredients_en || []);
        const steps = (currentLanguage === 'fr')
            ? (recipe.steps_fr || [])
            : (recipe.steps_en || []);

        const div = document.createElement('div');
        div.className = 'recipe-item';
         // Ajouter une classe si la recette est non publiée pour la distinguer visuellement (optionnel)
        if ((recipe.status ?? 'draft') !== 'publiee') {
             div.classList.add('recipe-draft');
        }


        // Calcul du nombre de champs "null" (gardé pour l'info admin/chef/traducteur)
        // Utile pour l'interface traducteur ou chef
        let nullCount = 0;
         const fieldsToCheck = ['title_fr', 'title_en', 'ingredients_fr', 'ingredients_en', 'steps_fr', 'steps_en', 'photo'];
        for (const field of fieldsToCheck) {
            if (recipe[field] === null || (Array.isArray(recipe[field]) && recipe[field].length === 0)) {
                 nullCount++;
             }
        }


        // Déterminer si l'utilisateur actuel a liké la recette
        const hasLiked = recipe.liked_by && recipe.liked_by.includes(currentUserId);
        const likeButtonText = hasLiked ? '❤️' : '🤍'; // Utiliser un cœur plein ou vide
        const likesCount = recipe.likes || 0; // Assurez-vous que likes est au moins 0

        div.innerHTML = `
            <h2>${title}</h2>
            <p><strong>Auteur:</strong> ${recipe.author || 'Inconnu'}</p>
            <p><strong>Statut:</strong> ${recipe.status || 'draft'}</p>
            <p><strong>Ingrédients:</strong> ${Array.isArray(ingredients) && ingredients.length > 0 ? ingredients.join(', ') : 'Pas encore d\'ingrédients'}</p>
            <p><strong>Étapes:</strong> ${Array.isArray(steps) && steps.length > 0 ? steps.join(' | ') : 'Pas encore d\'étapes'}</p>
            ${recipe.photo ? `<img src="${recipe.photo}" alt="${title}" class="recipe-photo">` : ''}
             <p class="null-count">Champs vides : ${nullCount}</p> <div class="recipe-actions">
                <button class="btn-comments btn btn-small" data-id="${recipe.id}">Commentaires</button>
                <button class="btn-like btn btn-small" data-id="${recipe.id}">${likeButtonText} <span class="likes-count">${likesCount}</span></button> ${ (isChef && isMyRecipe) || isAdmin ? `
                     <button class="btn-edit btn btn-small" data-id="${recipe.id}">Modifier</button>
                 ` : '' }

                ${ isAdmin ? `
                     <button class="btn-delete btn btn-small" data-id="${recipe.id}">Supprimer</button>
                 ` : '' }

                ${ isAdmin ? `
                  <button class="btn-status btn btn-small" data-id="${recipe.id}" data-status="terminee">Marquer Terminée</button>
                  <button class="btn-status btn btn-small" data-id="${recipe.id}" data-status="publiee">Publier</button>
                ` : '' }
             </div>
        `;
        container.appendChild(div);
    });
    attachRecipeEvents(); // Rattacher les événements après le rendu
}

function attachRecipeEvents() {
    // Détacher les anciens écouteurs avant d'en attacher de nouveaux
    // C'est une bonne pratique si renderRecipes est appelé plusieurs fois
    // (bien que dans ce code, renderRecipes vide et recrée, donc les anciens listeners sont nettoyés)
    // Si vous réutilisiez des éléments DOM, il faudrait gérer le détachement.
    // Pour ce code, attacher directement après innerHTML = '' est suffisant.


    document.querySelectorAll('.btn-comments').forEach(btn => {
        btn.addEventListener('click', () => {
            showComments(btn.dataset.id);
        });
    });
    document.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', () => {
            likeRecipe(btn.dataset.id);
        });
    });
     document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', async () => {
            const recipeId = btn.dataset.id;
            const newStatus = btn.dataset.status;
             // Vérification du rôle côté client avant l'appel (sécurité supplémentaire)
            if (getCurrentUserRole() !== 'admin') {
                 alert("Action réservée à l'administrateur.");
                 return;
            }
            await setRecipeStatus(recipeId, newStatus);
        });
    });
     document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const recipeId = btn.dataset.id;
            // Appeler une fonction pour afficher le formulaire de modification
            showEditRecipeForm(recipeId);
        });
    });
     document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const recipeId = btn.dataset.id;
            // Vérification du rôle côté client
             if (getCurrentUserRole() !== 'admin') {
                 alert("Action réservée à l'administrateur.");
                 return;
            }
            if (confirm("Êtes-vous sûr de vouloir supprimer cette recette ? Cette action est irréversible.")) {
                await deleteRecipe(recipeId);
            }
        });
    });
}

async function setRecipeStatus(recipeId, newStatus) {
    // La vérification du rôle est déjà faite dans attachRecipeEvents et côté serveur.
    const { ok, data, status } = await ajaxRequest('PUT', `/recipes/${recipeId}`, { status: newStatus });
    if (!ok) {
        alert("Erreur mise à jour statut (" + status + "): " + (data.error || ''));
    } else {
        alert(`Statut de la recette ${recipeId} mis à jour en "${newStatus}"`);
        loadRecipes(); // Recharger les recettes pour voir le changement de statut
    }
}


async function likeRecipe(recipeId) {
    if (!isLoggedIn()) {
        alert("Connectez-vous pour liker.");
        return;
    }
    const userId = getCurrentUserId();
    // Envoyez l'ID de l'utilisateur qui like
    const { ok, data, status } = await ajaxRequest('POST', `/recipes/${recipeId}/like`, { user_id: userId });
    if (!ok) {
        alert("Erreur Like (" + status + "): " + (data.error || ''));
    } else {
        // alert(data.message); // Affiche si le like a été ajouté ou retiré
        // Plutôt que de recharger toutes les recettes, mettez à jour seulement l'affichage du like
        const likeButton = document.querySelector(`.btn-like[data-id="${recipeId}"]`);
        if (likeButton) {
            const likesCountSpan = likeButton.querySelector('.likes-count');
            likesCountSpan.textContent = data.likes; // Mettre à jour le compteur
            // Mettre à jour l'icône du cœur
            if (data.message === "Recipe liked") {
                likeButton.innerHTML = `❤️ <span class="likes-count">${data.likes}</span>`;
            } else { // Like removed
                 likeButton.innerHTML = `🤍 <span class="likes-count">${data.likes}</span>`;
            }
             // Mettez à jour l'objet allRecipes en mémoire pour que le rendu lors de la recherche soit correct
            const recipeIndex = allRecipes.findIndex(r => r.id === recipeId);
            if (recipeIndex !== -1) {
                 // Simuler l'ajout ou la suppression de l'ID utilisateur dans liked_by
                 if (data.message === "Recipe liked") {
                     if (!allRecipes[recipeIndex].liked_by) {
                         allRecipes[recipeIndex].liked_by = [];
                     }
                     if (!allRecipes[recipeIndex].liked_by.includes(userId)) {
                        allRecipes[recipeIndex].liked_by.push(userId);
                     }
                 } else { // Like removed
                     if (allRecipes[recipeIndex].liked_by) {
                         allRecipes[recipeIndex].liked_by = allRecipes[recipeIndex].liked_by.filter(id => id !== userId);
                     }
                 }
                 allRecipes[recipeIndex].likes = data.likes; // Mettre à jour le compteur dans l'objet
            }
        }
    }
}


/***********************************************
 * 6) COMMENTAIRES
 ***********************************************/
async function showComments(recipeId) {
    const { ok, data, status } = await ajaxRequest('GET', `/comments/${recipeId}`);
    if (!ok) {
        alert("Erreur chargement commentaires (" + status + "): " + (data.error || ''));
        return;
    }
    let commentsHtml = `<h3>Commentaires</h3>`;
    // Convertir l'objet de commentaires en tableau pour faciliter l'itération
    const commentsArray = Object.values(data);
     // Trier les commentaires par date (du plus récent au plus ancien)
    commentsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (commentsArray.length === 0) {
        commentsHtml += `<p>Aucun commentaire pour l'instant.</p>`;
    } else {
        commentsArray.forEach(comm => {
             commentsHtml += `
                <div class="comment-item">
                  <p><strong>Auteur:</strong> ${comm.user_id}</p>
                  <p>${comm.text}</p>
                  <small>${comm.date}</small>
                </div>
            `;
        });
    }


    if (isLoggedIn()) {
        commentsHtml += `
            <textarea id="comment-text" rows="3" class="input-text" placeholder="Ajouter un commentaire..." required></textarea><br>
            <button id="btn-add-comment" data-id="${recipeId}" class="btn">Ajouter</button>
        `;
    } else {
        commentsHtml += `<p>Connectez-vous pour commenter.</p>`;
    }
    // Création de l'overlay pour les commentaires
    const overlay = document.createElement('div');
    overlay.id = "comment-overlay";
    overlay.className = "overlay";
    overlay.innerHTML = `
        <div class="overlay-content">
            <button id="close-overlay" class="close-btn">X</button>
            ${commentsHtml}
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('close-overlay').addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    const addBtn = document.getElementById('btn-add-comment');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const text = document.getElementById('comment-text').value.trim();
            if (!text) {
                alert("Commentaire vide.");
                return;
            }
            const userId = getCurrentUserId();
            const { ok: okPost, data: dataPost, status: statusPost } = await ajaxRequest('POST', `/recipes/${recipeId}/comments`, { user_id: userId, text });
            if (!okPost) {
                alert("Erreur ajout commentaire (" + statusPost + "): " + (dataPost.error || ''));
            } else {
                // alert("Commentaire ajouté!"); // Retirer cette alerte
                document.body.removeChild(overlay);
                showComments(recipeId); // Recharger les commentaires pour afficher le nouveau
            }
        });
    }
}

/***********************************************
 * 7) CREATION D'UNE RECETTE
 ***********************************************/
async function createRecipe(data) {
     // Ajouter l'auteur à la data de la recette
     data.author = getCurrentUserId();
    const { ok, data: resData, status } = await ajaxRequest('POST', '/recipes', data);
    if (!ok) {
        alert("Erreur création recette (" + status + "): " + (resData.error || ''));
    } else {
        alert("Recette créée!");
        loadRecipes(); // Recharger les recettes pour afficher la nouvelle
    }
}

/***********************************************
 * 8) GESTION MODIFICATION/SUPPRESSION RECETTE
 ***********************************************/

 // Fonction pour afficher le formulaire de modification
 function showEditRecipeForm(recipeId) {
     // Trouver la recette dans le tableau allRecipes
     const recipeToEdit = allRecipes.find(recipe => recipe.id === recipeId);

     if (!recipeToEdit) {
         alert("Recette introuvable pour la modification.");
         return;
     }

     // Créer l'HTML pour le formulaire de modification dans un overlay
     const editFormHtml = `
         <h3>Modifier la recette : ${recipeToEdit.title_fr || recipeToEdit.title_en || 'Sans titre'}</h3>
         <form id="edit-recipe-form" data-id="${recipeId}" class="form-container">
            <label>Titre (FR):
                <input id="edit-title-fr" type="text" class="input-text" value="${recipeToEdit.title_fr || ''}">
            </label>
            <label>Titre (EN):
                <input id="edit-title-en" type="text" class="input-text" value="${recipeToEdit.title_en || ''}">
            </label>
            <label>Ingrédients (FR) (un par ligne):
                <textarea id="edit-ingredients-fr" rows="5" class="input-text">${(recipeToEdit.ingredients_fr || []).join('\n')}</textarea>
            </label>
            <label>Ingrédients (EN) (un par ligne):
                <textarea id="edit-ingredients-en" rows="5" class="input-text">${(recipeToEdit.ingredients_en || []).join('\n')}</textarea>
            </label>
            <label>Étapes (FR) (une par ligne):
                <textarea id="edit-steps-fr" rows="5" class="input-text">${(recipeToEdit.steps_fr || []).join('\n')}</textarea>
            </label>
            <label>Étapes (EN) (un par ligne):
                <textarea id="edit-steps-en" rows="5" class="input-text">${(recipeToEdit.steps_en || []).join('\n')}</textarea>
            </label>
            <label>URL photo:
                <input id="edit-photo-url" type="text" class="input-text" value="${recipeToEdit.photo || ''}">
            </label>
             ${ getCurrentUserRole() === 'admin' ? `
             <label>Statut:
                 <select id="edit-status" class="input-text">
                     <option value="draft" ${recipeToEdit.status === 'draft' ? 'selected' : ''}>draft</option>
                     <option value="terminee" ${recipeToEdit.status === 'terminee' ? 'selected' : ''}>terminee</option>
                     <option value="publiee" ${recipeToEdit.status === 'publiee' ? 'selected' : ''}>publiee</option>
                 </select>
             </label>
             ` : ''}
            <button type="submit" class="btn">Enregistrer les modifications</button>
        </form>
     `;

     // Création de l'overlay pour le formulaire de modification
     const overlay = document.createElement('div');
     overlay.id = "edit-recipe-overlay";
     overlay.className = "overlay";
     overlay.innerHTML = `
         <div class="overlay-content">
             <button id="close-edit-overlay" class="close-btn">X</button>
             ${editFormHtml}
         </div>
     `;
     document.body.appendChild(overlay);

     // Fermer l'overlay
     document.getElementById('close-edit-overlay').addEventListener('click', () => {
         document.body.removeChild(overlay);
     });

     // Gérer la soumission du formulaire de modification
     document.getElementById('edit-recipe-form').addEventListener('submit', async (e) => {
         e.preventDefault();
         const updatedRecipeId = e.target.dataset.id;
         const updatedData = {
             title_fr: document.getElementById('edit-title-fr').value.trim() || null,
             title_en: document.getElementById('edit-title-en').value.trim() || null,
             ingredients_fr: document.getElementById('edit-ingredients-fr').value.split('\n').map(line => line.trim()).filter(line => line !== '') || [],
             ingredients_en: document.getElementById('edit-ingredients-en').value.split('\n').map(line => line.trim()).filter(line => line !== '') || [],
             steps_fr: document.getElementById('edit-steps-fr').value.split('\n').map(line => line.trim()).filter(line => line !== '') || [],
             steps_en: document.getElementById('edit-steps-en').value.split('\n').map(line => line.trim()).filter(line => line !== '') || [],
             photo: document.getElementById('edit-photo-url').value.trim() || null,
         };

         // Ajouter le statut si l'utilisateur est admin
         if (getCurrentUserRole() === 'admin') {
             updatedData.status = document.getElementById('edit-status').value;
         }

        //  console.log("Sending update data:", updatedData); // Ajoutez pour vérifier

         const { ok, data, status } = await ajaxRequest('PUT', `/recipes/${updatedRecipeId}`, updatedData);

         if (!ok) {
             alert("Erreur lors de la mise à jour de la recette (" + status + "): " + (data.error || ''));
         } else {
             alert("Recette mise à jour avec succès !");
             document.body.removeChild(overlay); // Fermer l'overlay après succès
             loadRecipes(); // Recharger les recettes pour voir les modifications
         }
     });
 }

 // Fonction pour supprimer une recette
 async function deleteRecipe(recipeId) {
     const { ok, data, status } = await ajaxRequest('DELETE', `/recipes/${recipeId}`);
     if (!ok) {
         alert("Erreur suppression recette (" + status + "): " + (data.error || ''));
     } else {
         alert("Recette supprimée !");
         loadRecipes(); // Recharger les recettes après suppression
     }
 }


/***********************************************
 * 9) BASCULEMENT LANGUE FR/EN
 ***********************************************/
function toggleLanguage() {
    currentLanguage = (currentLanguage === 'fr') ? 'en' : 'fr';
    if (toggleLangButton) { // Vérifier si le bouton existe
        toggleLangButton.textContent = (currentLanguage === 'fr') ? 'Basculer FR/EN' : 'Switch EN/FR'; // Mise à jour du texte du bouton
    }
    renderRecipes(allRecipes);
}

/***********************************************
 * 10) INITIALISATION (DOMContentLoaded)
 ***********************************************/
document.addEventListener('DOMContentLoaded', () => {
    // Connexion
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await login(email, password);
        });
    }
    // Inscription
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const roleDemand = document.getElementById('role-demand')?.value || "";
            await registerUser(name, email, password, roleDemand);
        });
    }

    // Code spécifique à la page index.html
    if (document.getElementById('recipe-list')) {
        loadRecipes();

        // Affichage du rôle de l'utilisateur connecté
        const userRoleDisplay = document.getElementById('user-role-display');
        const currentUserRole = getCurrentUserRole();
        const currentUserName = getCurrentUserName();
        if (isLoggedIn() && userRoleDisplay) {
             userRoleDisplay.textContent = `Connecté en tant que : ${currentUserName} (${currentUserRole})`;
        }


        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                const keyword = e.target.value.toLowerCase();
                const filtered = allRecipes.filter(recipe => {
                    // Le filtrage de visibilité est géré côté serveur.
                    // La recherche s'applique sur les recettes déjà visibles.

                    // Recherche par mot-clé sur les champs pertinents
                    const titleFr = (recipe.title_fr || '').toLowerCase();
                    const titleEn = (recipe.title_en || '').toLowerCase();
                    const ing = currentLanguage === 'fr' ? recipe.ingredients_fr || [] : recipe.ingredients_en || [];
                    const stp = currentLanguage === 'fr' ? recipe.steps_fr || [] : recipe.steps_en || [];
                    const author = (recipe.author || '').toLowerCase();
                    const status = (recipe.status || '').toLowerCase(); // Permettre la recherche par statut

                     // Rechercher dans les tableaux d'ingrédients et d'étapes
                    const ingMatch = Array.isArray(ing) && ing.some(i => i.toLowerCase().includes(keyword));
                    const stpMatch = Array.isArray(stp) && stp.some(s => s.toLowerCase().includes(keyword));


                    return titleFr.includes(keyword) || titleEn.includes(keyword) ||
                           ingMatch || stpMatch ||
                           author.includes(keyword) ||
                           status.includes(keyword);
                });
                renderRecipes(filtered); // Rendre la liste filtrée par mot-clé (la visibilité est déjà gérée par loadRecipes)
            });
        }
        // Création de recette (accessible aux chefs/admin)
        const createRecipeSection = document.getElementById('create-recipe-section'); // Obtenez la section
        const createForm = document.getElementById('create-recipe-form');
        const currentUserRoleForCreation = getCurrentUserRole(); // Récupérer le rôle ici pour la création

        if (createForm) {
             // Afficher ou masquer la section en fonction du rôle
            if (currentUserRoleForCreation === 'chef' || currentUserRoleForCreation === 'admin') {
                createRecipeSection.style.display = 'block'; // Afficher la section si chef ou admin
                createForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    // Le contrôle du rôle est déjà fait avant d'afficher le formulaire,
                    // mais on peut le laisser ici pour une sécurité supplémentaire côté client.
                    if (currentUserRoleForCreation !== 'chef' && currentUserRoleForCreation !== 'admin') {
                        alert("Seul un chef ou un admin peut créer une recette.");
                        return;
                    }
                    const titleFr = document.getElementById('title-fr')?.value.trim() || null; // trim() pour enlever les espaces blancs
                    const titleEn = document.getElementById('title-en')?.value.trim() || null; // trim()
                    const ingredientsFr = document.getElementById('ingredients-fr')?.value.split('\n').map(line => line.trim()).filter(line => line !== '') || []; // trim() et filter
                    const ingredientsEn = document.getElementById('ingredients-en')?.value.split('\n').map(line => line.trim()).filter(line => line !== '') || []; // trim() et filter
                    const stepsFr = document.getElementById('steps-fr')?.value.split('\n').map(line => line.trim()).filter(line => line !== '') || []; // trim() et filter
                    const stepsEn = document.getElementById('steps-en')?.value.split('\n').map(line => line.trim()).filter(line => line !== '') || []; // trim() et filter
                    const photoUrl = document.getElementById('photo-url')?.value.trim() || null; // trim()
                    const recipeData = {
                        title_fr: titleFr,
                        title_en: titleEn,
                        ingredients_fr: ingredientsFr,
                        ingredients_en: ingredientsEn,
                        steps_fr: stepsFr,
                        steps_en: stepsEn,
                        // L'auteur sera ajouté dans la fonction createRecipe
                        photo: photoUrl
                    };
                    await createRecipe(recipeData);
                    createForm.reset();
                });
            } else {
                createRecipeSection.style.display = 'none'; // Masquer la section pour les autres rôles
            }
        }

        // Le bouton de langue est déjà récupéré en dehors de ce bloc
        if (toggleLangButton) {
            toggleLangButton.addEventListener('click', toggleLanguage);
             // Initialiser le texte du bouton en fonction de la langue par défaut
            toggleLangButton.textContent = (currentLanguage === 'fr') ? 'Basculer FR/EN' : 'Switch EN/FR';
        }


        const userList = document.getElementById('user-list');
        if (userList && getCurrentUserRole() === 'admin') {
            loadUsers();
        }
    }
    // Déconnexion
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});
