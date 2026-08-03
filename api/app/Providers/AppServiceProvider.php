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

        // Webhook del chatbot. La llave es el remitente del mensaje cuando se
        // puede leer, no la IP: todos los webhooks llegan desde el mismo puñado
        // de IPs de Meta, así que limitar por IP le pondría techo a TODOS los
        // admins juntos en vez de a cada uno. Cada respuesta del bot gasta
        // tokens de la API de Claude, y este límite es lo que impide que un
        // admin acelerado (o un bucle de reintentos de Meta) los queme.
        RateLimiter::for('chatbot', function (Request $request) {
            $de = data_get($request->json()->all(), 'entry.0.changes.0.value.messages.0.from');

            return [
                Limit::perMinute(20)->by('chat:'.($de ?: $request->ip())),
                Limit::perMinute(200)->by('ip:'.$request->ip()),
            ];
        });
    }
}
