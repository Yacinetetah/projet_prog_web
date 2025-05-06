<?php
// controllers/UserController.php

class UserController {
    private function loadUsers() {
        $file = __DIR__ . '/../data/users.json';
        if (!file_exists($file)) return [];
        $content = file_get_contents($file);
        if (empty($content)) return [];
        return json_decode($content, true);
    }

    private function saveUsers($users) {
        $file = __DIR__ . '/../data/users.json';
        file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT));
    }

    // GET /users : Renvoie la liste des utilisateurs (réservé à l'admin)
    public function getAll($params = []) {
        // Récupérer le rôle de l'utilisateur connecté (simulé via headers)
        // **ATTENTION : NE PAS FAIRE CELA EN PRODUCTION. UTILISER LES SESSIONS SERVEUR.**
        $headers = getallheaders();
        $currentUserRole = $headers['X-User-Role'] ?? null;

        // Vérifier si l'utilisateur est un administrateur
        if ($currentUserRole !== 'admin') {
             header("HTTP/1.0 403 Forbidden");
             header('Content-Type: application/json');
             echo json_encode(["error" => "Only administrators can view the user list."]);
             return;
        }

        // Si l'utilisateur est admin, charger et renvoyer la liste complète des utilisateurs
        $users = $this->loadUsers();
        header('Content-Type: application/json');
        echo json_encode($users);
    }

    // POST /users/{id}/role : Met à jour le rôle d'un utilisateur (réservé à l'admin)
    public function updateRole($params = []) {
        // Vérifier si l'ID utilisateur à modifier est présent dans l'URL
        if (!isset($params[0])) {
            header("HTTP/1.0 400 Bad Request");
            header('Content-Type: application/json');
            echo json_encode(["error" => "User ID missing"]);
            return;
        }
        $userId = $params[0]; // ID de l'utilisateur dont on veut changer le rôle

        // Récupérer les données envoyées dans le corps de la requête (le nouveau rôle)
        $data = json_decode(file_get_contents('php://input'), true);
        $newRole = $data['role'] ?? '';

        // Récupérer le rôle de l'utilisateur connecté (celui qui effectue l'action) (simulé via headers)
        // **ATTENTION : NE PAS FAIRE CELA EN PRODUCTION. UTILISER LES SESSIONS SERVEUR.**
        $headers = getallheaders();
        $currentUserRole = $headers['X-User-Role'] ?? null;

        // Vérifier si l'utilisateur connecté est un administrateur
        if ($currentUserRole !== 'admin') {
             header("HTTP/1.0 403 Forbidden");
             header('Content-Type: application/json');
             echo json_encode(["error" => "Only administrators can update user roles."]);
             return;
        }

        // Vérifier si le nouveau rôle est fourni
        if (!$newRole) {
            header("HTTP/1.0 400 Bad Request");
            header('Content-Type: application/json');
            echo json_encode(["error" => "New role missing"]);
            return;
        }

        // Charger la liste des utilisateurs
        $users = $this->loadUsers();

        // Vérifier si l'utilisateur à modifier existe
        if (!isset($users[$userId])) {
            header("HTTP/1.0 404 Not Found");
            header('Content-Type: application/json');
            echo json_encode(["error" => "User not found"]);
            return;
        }

         // Optionnel : Ajouter une validation pour s'assurer que le nouveau rôle est valide selon roles.json
         // (Pour ce simple exemple, on ne le fait pas, mais c'est recommandé)

        // Mettre à jour le rôle de l'utilisateur spécifié
        $users[$userId]['role'] = $newRole;

        // Sauvegarder la liste des utilisateurs modifiée
        $this->saveUsers($users);

        // Renvoyer une réponse de succès
        header('Content-Type: application/json');
        echo json_encode(["message" => "User role updated"]);
    }
}
