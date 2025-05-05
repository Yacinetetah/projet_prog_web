<?php
// controllers/AuthController.php

class AuthController {
    // Charge les utilisateurs depuis le fichier JSON
    private function loadUsers() {
        $file = __DIR__ . '/../data/users.json';
        if (!file_exists($file)) return [];
        return json_decode(file_get_contents($file), true);
    }

    // Sauvegarde les utilisateurs dans le fichier JSON
    private function saveUsers($users) {
        $file = __DIR__ . '/../data/users.json';
        file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT));
    }

    // POST /login : Authentification d'un utilisateur
    public function login($params = []) {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        $users = $this->loadUsers();
        foreach ($users as $id => $user) {
            if ($user['email'] === $email && $user['password'] === $password) {
                // Authentification réussie : on renvoie l'ID, le rôle et le nom
                echo json_encode([
                    'user_id' => $id,
                    'role' => $user['role'],
                    'name' => $user['name']
                ]);
                return;
            }
        }
        // Identifiants incorrects
        header("HTTP/1.0 401 Unauthorized");
        echo json_encode(["error" => "Invalid credentials"]);
    }

    // POST /register : Inscription d'un nouvel utilisateur
    public function register($params = []) {
        $data = json_decode(file_get_contents('php://input'), true);
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $roleDemand = $data['roleDemand'] ?? '';

        if (!$name || !$email || !$password) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Missing fields"]);
            return;
        }

        $users = $this->loadUsers();
        // Vérifie si l'email existe déjà
        foreach ($users as $user) {
            if ($user['email'] === $email) {
                header("HTTP/1.0 400 Bad Request");
                echo json_encode(["error" => "Email already exists"]);
                return;
            }
        }

        // Génère un nouvel ID utilisateur
        $newUserId = "user_" . (count($users) + 1);
        // Le rôle par défaut est 'cuisinier'. Si une demande est faite, on stocke une demande.
        $role = 'cuisinier';
        if ($roleDemand === 'chef') {
            $role = 'demandeChef';
        } elseif ($roleDemand === 'traducteur') {
            $role = 'demandeTraducteur';
        }

        $users[$newUserId] = [
            "email" => $email,
            "password" => $password,
            "name" => $name,
            "role" => $role
        ];

        $this->saveUsers($users);
        echo json_encode(["user_id" => $newUserId]);
    }
}
