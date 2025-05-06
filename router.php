<?php
// router.php

// Démarrer la session si elle ne l'est pas déjà (utile pour potentiellement stocker l'ID/rôle utilisateur)
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}


// Récupération de l'URI et du verbe HTTP
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Tableau des routes définies pour chaque méthode HTTP
$routes = [
    'POST' => [
        '/login' => 'AuthController@login',
        '/register' => 'AuthController@register',
        '/recipes' => 'RecipeController@create',
        '/recipes/{id}/comments' => 'CommentController@create',
        '/recipes/{id}/like' => 'RecipeController@like',
        '/users/{id}/role' => 'UserController@updateRole'
    ],
    'GET' => [
        '/users' => 'UserController@getAll',
        '/recipes' => 'RecipeController@getAll',
        '/comments/{id}' => 'CommentController@getByRecipe'
    ],
    'PUT' => [
        '/recipes/{id}' => 'RecipeController@update'
    ],
    'DELETE' => [ // Nouvelle route pour la suppression
        '/recipes/{id}' => 'RecipeController@delete'
    ]
];

// Fonction simple de correspondance de route
$found = false;
if (isset($routes[$requestMethod])) {
    foreach ($routes[$requestMethod] as $route => $action) {
        // Remplacement du paramètre {id} par une expression régulière incluant le point '.'
        // L'expression régulière (([a-zA-Z0-9_\.\-]+)) capture les lettres, chiffres, underscores, points et tirets.
        $pattern = preg_replace('/\{[a-zA-Z]+\}/', '([a-zA-Z0-9_\.\-]+)', $route);
        // Ajouter les ancres de début et fin et rendre le slash final optionnel (pour plus de flexibilité)
        $pattern = '#^' . $pattern . '/?$#';


        if (preg_match($pattern, $requestUri, $matches)) {
            $found = true;
            // On retire le match complet
            array_shift($matches);
            list($controllerName, $methodName) = explode('@', $action);
            require_once "controllers/{$controllerName}.php";
            $controller = new $controllerName();

            // **ATTENTION : Simule l'ajout de headers pour passer l'ID et le rôle utilisateur**
            // **Dans une application réelle, la vérification des permissions se ferait**
            // **en utilisant les informations de session serveur.**
             $userId = $_SESSION['user_id'] ?? null; // Utiliser la session si l'ID y est stocké après login
             $userRole = $_SESSION['role'] ?? null; // Utiliser la session pour le rôle

             // Si pas en session, essayer de lire depuis localStorage côté client (moins sécurisé)
             // Cette partie côté routeur PHP ne peut pas lire localStorage directement.
             // L'idée était de simuler dans le contrôleur qu'il reçoit ces infos.
             // La simulation via getallheaders() dans le contrôleur est plus directe pour ce setup.

            // Appel de la méthode du contrôleur avec les paramètres extraits
            // Les contrôleurs devront utiliser getallheaders() pour simuler la récupération de l'ID/Rôle.
            $controller->$methodName($matches);

            break;
        }
    }
}

if (!$found) {
    // Aucune route trouvée, on renvoie un 404
    header("HTTP/1.0 404 Not Found");
    header('Content-Type: application/json');
    echo json_encode(["error" => "Route not found"]);
}
