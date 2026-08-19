<?php

use App\Http\Controllers\Admin\AvisoAdminController;
use App\Http\Controllers\Admin\CategoriaAdminController;
use App\Http\Controllers\Admin\HeroAdminController;
use App\Http\Controllers\Admin\PreguntaAdminController;
use App\Http\Controllers\Admin\ProductoAdminController;
use App\Http\Controllers\Admin\RecetaAdminController;
use App\Http\Controllers\Admin\SedeAdminController;
use App\Http\Controllers\CatalogoController;
use App\Http\Controllers\ChatbotWebhookController;
use Illuminate\Support\Facades\Route;

// ── Catálogo público ────────────────────────────────────────────────────────
Route::prefix('catalogo')->group(function () {
    Route::get('/', [CatalogoController::class, 'index']);
    Route::get('/stock', [CatalogoController::class, 'stock']);
    Route::get('/sedes', [CatalogoController::class, 'sedes']);
    Route::get('/hero', [CatalogoController::class, 'hero']);
    Route::get('/aviso', [CatalogoController::class, 'aviso']);
    Route::get('/recetas', [CatalogoController::class, 'recetas']);
    Route::get('/preguntas', [CatalogoController::class, 'preguntas']);
    Route::get('/productos/{producto}', [CatalogoController::class, 'show']);
});

// ── Administración ──────────────────────────────────────────────────────────
// La usan el panel del frontend (/admin) y el chatbot de WhatsApp, los dos con
// el mismo token Bearer y con límite por IP. Es la única forma de tocar el
// catálogo desde afuera: si algo de aquí se rompe, la tienda se queda sin
// quien la administre.
Route::middleware(['throttle:admin-api', 'admin.token'])->prefix('admin')->group(function () {
    // ── Productos ───────────────────────────────────────────────────────────
    // Las rutas de palabra fija van ANTES que '{producto}': si no, el
    // enrutador intenta resolver "resumen" como un id y devuelve 404.
    Route::get('productos/resumen', [ProductoAdminController::class, 'resumen']);
    Route::post('productos/reordenar', [ProductoAdminController::class, 'reordenar']);
    Route::get('productos', [ProductoAdminController::class, 'index']);
    Route::post('productos', [ProductoAdminController::class, 'store']);
    Route::get('productos/{producto}', [ProductoAdminController::class, 'show']);
    // El panel manda FormData con `_method=PATCH` cuando hay archivos: Laravel
    // lo traduce solo a esta misma ruta.
    Route::patch('productos/{producto}', [ProductoAdminController::class, 'update']);
    Route::delete('productos/{producto}', [ProductoAdminController::class, 'destroy']);
    Route::patch('productos/{producto}/stock', [ProductoAdminController::class, 'stock']);
    Route::delete('productos/{producto}/imagenes/{imagen}', [ProductoAdminController::class, 'borrarImagen']);

    // ── Categorías ──────────────────────────────────────────────────────────
    Route::post('categorias/reordenar', [CategoriaAdminController::class, 'reordenar']);
    Route::get('categorias', [CategoriaAdminController::class, 'index']);
    Route::post('categorias', [CategoriaAdminController::class, 'store']);
    Route::put('categorias/{categoria}', [CategoriaAdminController::class, 'update']);
    Route::delete('categorias/{categoria}', [CategoriaAdminController::class, 'destroy']);

    // ── Sedes ───────────────────────────────────────────────────────────────
    // El chatbot usa el listado para saber qué sedes puede nombrar cuando tiene
    // que preguntar en cuál mover el inventario.
    Route::get('sedes', [SedeAdminController::class, 'index']);
    Route::post('sedes', [SedeAdminController::class, 'store']);
    Route::put('sedes/{sede}', [SedeAdminController::class, 'update']);
    Route::delete('sedes/{sede}', [SedeAdminController::class, 'destroy']);

    // ── Portada y aviso ─────────────────────────────────────────────────────
    Route::get('hero', [HeroAdminController::class, 'show']);
    Route::post('hero', [HeroAdminController::class, 'update']);
    Route::get('aviso', [AvisoAdminController::class, 'show']);
    Route::post('aviso', [AvisoAdminController::class, 'update']);

    // ── Recetas ─────────────────────────────────────────────────────────────
    Route::post('recetas/reordenar', [RecetaAdminController::class, 'reordenar']);
    Route::get('recetas', [RecetaAdminController::class, 'index']);
    Route::post('recetas', [RecetaAdminController::class, 'store']);
    Route::patch('recetas/{receta}', [RecetaAdminController::class, 'update']);
    Route::delete('recetas/{receta}', [RecetaAdminController::class, 'destroy']);

    // ── Preguntas frecuentes ────────────────────────────────────────────────
    Route::post('preguntas/reordenar', [PreguntaAdminController::class, 'reordenar']);
    Route::get('preguntas', [PreguntaAdminController::class, 'index']);
    Route::post('preguntas', [PreguntaAdminController::class, 'store']);
    Route::put('preguntas/{pregunta}', [PreguntaAdminController::class, 'update']);
    Route::delete('preguntas/{pregunta}', [PreguntaAdminController::class, 'destroy']);
});

// ── Webhook del chatbot ─────────────────────────────────────────────────────
// Sin 'admin.token': quien llama es WhatsApp, no nosotros. Se autentica con la
// firma HMAC del cuerpo y con la lista blanca de números (ver el controlador).
Route::get('/chatbot/webhook', [ChatbotWebhookController::class, 'verificar']);
Route::post('/chatbot/webhook', [ChatbotWebhookController::class, 'recibir'])
    ->middleware('throttle:chatbot');

// Preflight OPTIONS para CORS (sin autenticación)
Route::options('{any}', fn () => response('', 204))->where('any', '.*');
