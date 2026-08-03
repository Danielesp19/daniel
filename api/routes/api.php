<?php

use App\Http\Controllers\Admin\ProductoAdminController;
use App\Http\Controllers\CatalogoController;
use App\Http\Controllers\ChatbotWebhookController;
use Illuminate\Support\Facades\Route;

// ── Catálogo público ────────────────────────────────────────────────────────
Route::prefix('catalogo')->group(function () {
    Route::get('/', [CatalogoController::class, 'index']);
    Route::get('/stock', [CatalogoController::class, 'stock']);
    Route::get('/hero', [CatalogoController::class, 'hero']);
    Route::get('/productos/{producto}', [CatalogoController::class, 'show']);
});

// ── Administración (la usa el chatbot) ──────────────────────────────────────
// Token Bearer + límite por IP. La carga de fotos y videos NO vive aquí: eso
// es del panel de Filament en /admin.
Route::middleware(['throttle:admin-api', 'admin.token'])->prefix('admin')->group(function () {
    // 'resumen' antes que '{producto}': si no, el enrutador intenta resolver
    // "resumen" como un id de producto y devuelve 404.
    Route::get('productos/resumen', [ProductoAdminController::class, 'resumen']);
    Route::get('productos', [ProductoAdminController::class, 'index']);
    Route::get('productos/{producto}', [ProductoAdminController::class, 'show']);
    Route::patch('productos/{producto}', [ProductoAdminController::class, 'update']);
    Route::patch('productos/{producto}/stock', [ProductoAdminController::class, 'stock']);
    Route::get('categorias', [ProductoAdminController::class, 'categorias']);
});

// ── Webhook del chatbot ─────────────────────────────────────────────────────
// Sin 'admin.token': quien llama es WhatsApp, no nosotros. Se autentica con la
// firma HMAC del cuerpo y con la lista blanca de números (ver el controlador).
Route::get('/chatbot/webhook', [ChatbotWebhookController::class, 'verificar']);
Route::post('/chatbot/webhook', [ChatbotWebhookController::class, 'recibir'])
    ->middleware('throttle:chatbot');

// Preflight OPTIONS para CORS (sin autenticación)
Route::options('{any}', fn () => response('', 204))->where('any', '.*');
