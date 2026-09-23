<?php

use App\Http\Middleware\AdminToken;
use App\Http\Middleware\CorsMiddleware;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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
        // violación de integridad sin validar antes, que el usuario vea un
        // mensaje claro en vez de un 500 genérico. La validación específica en
        // el controller sigue siendo lo ideal (mejor mensaje); esto es el
        // respaldo.
        $exceptions->render(function (QueryException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            // La clase 23 de SQLSTATE es "violación de restricción de
            // integridad". SE COMPARAN LOS DOS PRIMEROS CARACTERES Y NO EL
            // CÓDIGO COMPLETO, que es donde estaba el error: SQLite y MySQL
            // devuelven '23000' para todas, pero Postgres usa un código por
            // cada tipo —23505 única, 23503 foránea, 23502 nulo— y ninguno de
            // ellos es '23000'. En local (SQLite) la red atrapaba el caso y en
            // producción (Postgres) lo dejaba pasar como 500, que es
            // justamente donde se veía el error.
            $sqlstate = (string) $e->getCode();

            if (! str_starts_with($sqlstate, '23')) {
                return null; // cualquier otro problema de base lo maneja Laravel
            }

            $mensaje = match (true) {
                // Postgres nombra el tipo; SQLite y MySQL lo dicen en el texto.
                $sqlstate === '23503',
                str_contains($e->getMessage(), 'FOREIGN KEY'),
                str_contains($e->getMessage(), 'foreign key') => 'No se puede hacer eso porque el registro '
                    .'está siendo usado por otro. Quítalo de donde está antes de borrarlo.',

                $sqlstate === '23502',
                str_contains($e->getMessage(), 'NOT NULL'),
                str_contains($e->getMessage(), 'not-null') => 'Falta un dato obligatorio.',

                default => 'Ya existe un registro con esos datos.',
            };

            Log::warning('Violación de integridad servida como 422', [
                'sqlstate' => $sqlstate,
                'ruta' => $request->path(),
            ]);

            return response()->json(['error' => $mensaje], 422);
        });
    })->create();
