<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // API de administración: holgada para el uso real, pero frena el
        // martilleo por fuerza bruta del token Bearer.
        RateLimiter::for('admin-api', fn (Request $request) => Limit::perMinute(120)->by($request->ip()));

        // El buzón de preguntas es público y sin autenticar: es la única puerta
        // por la que un desconocido puede escribir en la base. Tres por minuto
        // alcanza de sobra para quien de verdad tiene una duda, y le quita la
        // gracia a quien quiera llenarla de basura.
        RateLimiter::for('consultas', fn (Request $request) => [
            Limit::perMinute(3)->by($request->ip()),
            Limit::perDay(20)->by($request->ip()),
        ]);

    }
}
