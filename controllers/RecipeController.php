<?php
// controllers/RecipeController.php

class RecipeController {
    // Charge les recettes depuis le fichier JSON
    private function loadRecipes() {
        $file = __DIR__ . '/../data/recipes.json';
        if (!file_exists($file)) return [];
        $content = file_get_contents($file);
        if (empty($content)) return [];
        return json_decode($content, true);
    }

    // Sauvegarde les recettes dans le fichier JSON
    private function saveRecipes($recipes) {
        $file = __DIR__ . '/../data/recipes.json';
        file_put_contents($file, json_encode($recipes, JSON_PRETTY_PRINT));
    }

    // Charge les utilisateurs pour vérifier les rôles
    private function loadUsers() {
        $file = __DIR__ . '/../data/users.json';
        if (!file_exists($file)) return [];
         $content = file_get_contents($file);
        if (empty($content)) return [];
        return json_decode($content, true);
    }

    // Récupère le rôle d'un utilisateur par son ID
    private function getUserRole($userId) {
        $users = $this->loadUsers();
        return $users[$userId]['role'] ?? null;
    }

    // GET /recipes : Renvoie la liste des recettes en fonction du rôle de l'utilisateur
    public function getAll($params = []) {
        // Récupérer l'ID utilisateur et le rôle de l'utilisateur connecté
        // (Simulé ici, dans une vraie app, ça viendrait de la session serveur)
        $headers = getallheaders();
        $currentUserId = $headers['X-User-Id'] ?? null;
        $currentUserRole = $headers['X-User-Role'] ?? 'cuisinier';

        $recipes = $this->loadRecipes();
        $filteredRecipes = [];

        foreach ($recipes as $id => $recipe) {
            $includeRecipe = false;
            $isPublished = ($recipe['status'] ?? 'draft') === 'publiee';
            $isMyRecipe = ($recipe['author'] ?? null) === $currentUserId;
            $isAdmin = $currentUserRole === 'admin';
            $isChef = $currentUserRole === 'chef';

            // Les recettes publiées sont visibles par tout le monde (connecté)
            if ($isPublished) {
                $includeRecipe = true;
            }

            // Les administrateurs voient toutes les recettes
            if ($isAdmin) {
                $includeRecipe = true;
            }

            // Les chefs voient leurs propres recettes, même si elles ne sont pas publiées
            if ($isChef && $isMyRecipe) {
                 $includeRecipe = true;
            }

            // Les recettes non publiées ne sont visibles que par l'admin ou l'auteur (si c'est un chef)
            if (!$isPublished && ($isAdmin || ($isChef && $isMyRecipe))) {
                $includeRecipe = true;
            }


            if ($includeRecipe) {
                $filteredRecipes[$id] = $recipe;
            }
        }

        // Envoyer les headers pour éviter les problèmes de CORS en développement si nécessaire
        header('Content-Type: application/json');
        // header('Access-Control-Allow-Origin: *'); // À restreindre en production
        echo json_encode($filteredRecipes);
    }

    // POST /recipes : Crée une nouvelle recette (vérifie si l'utilisateur est chef ou admin)
    public function create($params = []) {
        $data = json_decode(file_get_contents('php://input'), true);
        // L'auteur devrait être passé depuis le front (stocké en localStorage)
         $authorId = $data['author'] ?? null;

         if (!$authorId) {
            header("HTTP/1.0 401 Unauthorized");
            echo json_encode(["error" => "User ID missing in request data."]); // Message plus précis
            return;
         }

         $authorRole = $this->getUserRole($authorId);

         // Seuls les chefs et admins peuvent créer des recettes
        if ($authorRole !== 'chef' && $authorRole !== 'admin') {
            header("HTTP/1.0 403 Forbidden");
            echo json_encode(["error" => "You do not have the necessary role (Chef or Admin) to create recipes. Your current role is: " . ($authorRole ?? 'unknown')]); // Message plus informatif
            return;
        }


        // Vérification des champs obligatoires (au moins un titre et les listes d'ingrédients et d'étapes)
        if ((!isset($data['title_fr']) || empty($data['title_fr'])) && (!isset($data['title_en']) || empty($data['title_en']))) {
             header("HTTP/1.0 400 Bad Request");
             echo json_encode(["error" => "At least one title (fr or en) is required."]);
             return;
        }
         if (!isset($data['ingredients_fr']) || !isset($data['ingredients_en']) ||
            !isset($data['steps_fr']) || !isset($data['steps_en'])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Missing required fields (ingredients_fr, ingredients_en, steps_fr, steps_en are needed)."]); // Message plus précis
            return;
        }


        $recipes = $this->loadRecipes();
        // Générer un ID unique (plus robuste qu'un simple compteur)
        $newRecipeId = uniqid('recipe_', true);
        while(isset($recipes[$newRecipeId])) {
            $newRecipeId = uniqid('recipe_', true);
        }


        // Création de la recette avec les données fournies
        $newRecipe = [
            "title_fr" => $data['title_fr'] ?? null,
            "title_en" => $data['title_en'] ?? null,
            "ingredients_fr" => $data['ingredients_fr'] ?? [],
            "ingredients_en" => $data['ingredients_en'] ?? [],
            "steps_fr" => $data['steps_fr'] ?? [],
            "steps_en" => $data['steps_en'] ?? [],
            "author" => $authorId, // L'auteur est l'utilisateur connecté
            "photo" => $data['photo'] ?? null,
            "status" => "draft", // Nouvelle recette est toujours en statut "draft" initialement
            "likes" => 0,
            "liked_by" => []
        ];
        $recipes[$newRecipeId] = $newRecipe;
        $this->saveRecipes($recipes);
        header('Content-Type: application/json');
        echo json_encode(["message" => "Recipe created", "recipe_id" => $newRecipeId]);
    }

    // PUT /recipes/{id} : Met à jour une recette (vérifie les permissions)
    public function update($params = []) {
        if (!isset($params[0])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Recipe ID missing"]);
            return;
        }
        $recipeId = $params[0];
        $data = json_decode(file_get_contents('php://input'), true);

        // Récupérer l'ID et le rôle de l'utilisateur connecté (simulé)
        $headers = getallheaders();
        $currentUserId = $headers['X-User-Id'] ?? null;
        $currentUserRole = $headers['X-User-Role'] ?? null;

        if (!$currentUserId || !$currentUserRole) {
             header("HTTP/1.0 401 Unauthorized");
             echo json_encode(["error" => "User not authenticated"]);
             return;
        }


        $recipes = $this->loadRecipes();
        if (!isset($recipes[$recipeId])) {
            header("HTTP/1.0 404 Not Found");
            echo json_encode(["error" => "Recipe not found"]);
            return;
        }

        $recipe = $recipes[$recipeId];

        // Vérifier les permissions de modification
        $canEdit = false;
        if ($currentUserRole === 'admin') {
            $canEdit = true; // L'admin peut tout modifier
        } elseif ($currentUserRole === 'chef' && isset($recipe['author']) && $recipe['author'] === $currentUserId) {
            $canEdit = true; // Un chef peut modifier sa propre recette
        } elseif ($currentUserRole === 'traducteur') {
             // Logique de traduction : peut modifier un champ si et seulement si ce champ est vide
             // ET que le champ équivalent dans l'autre langue est rempli.
             // Cette logique doit être implémentée ici si vous voulez que les traducteurs
             // puissent utiliser cette route PUT pour leurs modifications.
             // Pour l'instant, seuls Admin et Chef peuvent utiliser cette route PUT.
        }

        if (!$canEdit) {
            header("HTTP/1.0 403 Forbidden");
            echo json_encode(["error" => "You do not have permission to edit this recipe."]);
            return;
        }

        // Appliquer les modifications si l'utilisateur a la permission
        // On ne veut pas permettre de changer l'auteur via PUT
        $fieldsToUpdate = ['title_fr', 'title_en', 'ingredients_fr', 'ingredients_en', 'steps_fr', 'steps_en', 'photo', 'status'];
        foreach ($fieldsToUpdate as $field) {
            // On vérifie si la clé existe dans les données reçues avant de l'écraser
            // Permettre à l'admin de changer le statut
            if (array_key_exists($field, $data)) {
                 $recipes[$recipeId][$field] = $data[$field];
            }
        }

        $this->saveRecipes($recipes);
        header('Content-Type: application/json');
        echo json_encode(["message" => "Recipe updated"]);
    }

     // DELETE /recipes/{id} : Supprime une recette (réservé à l'admin)
    public function delete($params = []) {
        if (!isset($params[0])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Recipe ID missing"]);
            return;
        }
        $recipeId = $params[0];

        // Récupérer le rôle de l'utilisateur connecté (simulé)
        $headers = getallheaders();
        $currentUserRole = $headers['X-User-Role'] ?? null;

        if ($currentUserRole !== 'admin') {
             header("HTTP/1.0 403 Forbidden");
             echo json_encode(["error" => "Only administrators can delete recipes."]);
             return;
        }

        $recipes = $this->loadRecipes();
        if (!isset($recipes[$recipeId])) {
            header("HTTP/1.0 404 Not Found");
            echo json_encode(["error" => "Recipe not found."]);
            return;
        }

        // Supprimer la recette
        unset($recipes[$recipeId]);

        $this->saveRecipes($recipes);
        header('Content-Type: application/json');
        echo json_encode(["message" => "Recipe deleted."]);
    }


    // POST /recipes/{id}/like : Ajoute ou retire un like à une recette
    public function like($params = []) {
        if (!isset($params[0])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Recipe ID missing"]);
            return;
        }
        $recipeId = $params[0];
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;

        if (!$userId) {
             header("HTTP/1.0 401 Unauthorized"); // User must be logged in to like
             echo json_encode(["error" => "User ID missing. You must be logged in to like a recipe."]);
             return;
        }

        $recipes = $this->loadRecipes();
        if (!isset($recipes[$recipeId])) {
            header("HTTP/1.0 404 Not Found");
            echo json_encode(["error" => "Recipe not found"]);
            return;
        }

        // Initialise 'likes' et 'liked_by' si elles n'existent pas
        if (!isset($recipes[$recipeId]['likes'])) {
            $recipes[$recipeId]['likes'] = 0;
        }
        if (!isset($recipes[$recipeId]['liked_by'])) {
            $recipes[$recipeId]['liked_by'] = [];
        }

        // Vérifie si l'utilisateur a déjà liké
        $likedKey = array_search($userId, $recipes[$recipeId]['liked_by']);

        if ($likedKey !== false) {
            // L'utilisateur a déjà liké, on retire le like
            unset($recipes[$recipeId]['liked_by'][$likedKey]);
            $recipes[$recipeId]['likes']--;
            $message = "Like removed";
        } else {
            // L'utilisateur n'a pas encore liké, on ajoute le like
            $recipes[$recipeId]['liked_by'][] = $userId;
            $recipes[$recipeId]['likes']++;
            $message = "Recipe liked";
        }

        // Ré-indexer le tableau liked_by après unset pour éviter les index non consécutifs
        $recipes[$recipeId]['liked_by'] = array_values($recipes[$recipeId]['liked_by']);

        $this->saveRecipes($recipes);

        // Renvoie le nouveau nombre de likes pour mise à jour côté client
        header('Content-Type: application/json');
        echo json_encode(["message" => $message, "likes" => $recipes[$recipeId]['likes']]);
    }
}