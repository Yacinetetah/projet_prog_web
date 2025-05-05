<?php
// controllers/CommentController.php

class CommentController {
    // Charge les commentaires depuis le fichier JSON
    private function loadComments() {
        $file = __DIR__ . '/../data/comments.json';
        if (!file_exists($file)) return [];
        return json_decode(file_get_contents($file), true);
    }
    
    // Sauvegarde les commentaires dans le fichier JSON
    private function saveComments($comments) {
        $file = __DIR__ . '/../data/comments.json';
        file_put_contents($file, json_encode($comments, JSON_PRETTY_PRINT));
    }

    // GET /comments/{recipe_id} : Renvoie les commentaires d'une recette
    public function getByRecipe($params = []) {
        if (!isset($params[0])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Recipe ID missing"]);
            return;
        }
        $recipeId = $params[0];
        $comments = $this->loadComments();
        $result = [];
        foreach ($comments as $commentId => $comment) {
            if ($comment['recipe_id'] === $recipeId) {
                $result[$commentId] = $comment;
            }
        }
        echo json_encode($result);
    }

    // POST /recipes/{id}/comments : Ajoute un commentaire à une recette
    public function create($params = []) {
        if (!isset($params[0])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Recipe ID missing"]);
            return;
        }
        $recipeId = $params[0];
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['user_id']) || !isset($data['text'])) {
            header("HTTP/1.0 400 Bad Request");
            echo json_encode(["error" => "Missing comment data"]);
            return;
        }
        $comments = $this->loadComments();
        $newCommentId = "comment_" . (count($comments) + 1);
        $newComment = [
            "recipe_id" => $recipeId,
            "user_id" => $data['user_id'],
            "text" => $data['text'],
            "date" => date("Y-m-d H:i:s")
        ];
        $comments[$newCommentId] = $newComment;
        $this->saveComments($comments);
        echo json_encode(["message" => "Comment added", "comment_id" => $newCommentId]);
    }
}
