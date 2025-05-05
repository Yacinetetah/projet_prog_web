<?php
// controllers/UserController.php

class UserController {
    private function loadUsers() {
        $file = __DIR__ . '/../data/users.json';
        if (!file_exists($file)) return [];
        return json_decode(file_get_contents($file), true);
    }
    
    private function saveUsers($users) {
        $file = __DIR__ . '/../data/users.json';
        file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT));
    }

    // GET /users : Renvoie la liste des utilisateurs
    public function getAll($params = []) {
        $users = $this->loadUsers();
        echo json_encode($users);
    }

    // POST /users/{id}/role : Met à jour le rôle d'un utilisateur
    public function updateRole($params = []) {
        if (!isset($params[0])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "User ID missing"]);
            return;
        }
        $userId = $params[0];
        $data = json_decode(file_get_contents('php://input'), true);
        $newRole = $data['role'] ?? '';

        if (!$newRole) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "New role missing"]);
            return;
        }

        $users = $this->loadUsers();
        if (!isset($users[$userId])) {
            header("HTTP/1.0 404 Not Found");
            echo json_encode(["error" => "User not found"]);
            return;
        }

        $users[$userId]['role'] = $newRole;
        $this->saveUsers($users);
        echo json_encode(["message" => "User role updated"]);
    }
}
