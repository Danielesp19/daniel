<?php

use App\Http\Middleware\AdminToken;
use App\Http\Middleware\CorsMiddleware;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(CorsMiddleware::class);
        $middleware->append(SecurityHeaders::class);
        $middleware->alias([
            'admin.token' => AdminToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Red de seguridad: si a algún endpoint admin se le escapa una
        // violación de restricción única/foránea sin validar antes (como pasó
        // con categorías duplicadas), que el usuario vea un mensaje claro en
        // vez de un 500 genérico. La validación específica en el controller
        // sigue siendo lo ideal (mejor mensaje); esto es el respaldo.
        $exceptions->render(function (QueryException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            // SQLSTATE 23000 = violación de restricción de integridad (única o
            // foránea). El código es el mismo en MySQL, Postgres y SQLite —a
            // diferencia del código numérico del driver, que varía entre ellos—
            // así que basta este chequeo para cubrir los tres motores.
            if ($e->getCode() === '23000') {
                return response()->json([
                    'error' => 'Ya existe un registro con esos datos.',
                ], 422);
            }

            return null; // deja que Laravel maneje cualquier otro caso normalmente
        });
    })->create();
