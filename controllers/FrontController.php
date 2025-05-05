<?php
// controllers/FrontController.php
class FrontController {
  public static function serveIndex() {
    // Désactiver le header JSON et servir le HTML
    header('Content-Type: text/html; charset=utf-8');
    include __DIR__ . '/../front/index.html';
    exit;
  }
}