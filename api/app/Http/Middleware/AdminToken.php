<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminToken
{
    public function handle(Request $request, Closure $next): mixed
    {
        $expected = (string) config('tienda.admin_token');
        $provided = (string) $request->bearerToken();

        // Comparación en tiempo constante (evita timing attacks). config() en vez de
        // env() para que siga funcionando con `php artisan config:cache` en producción.
        if ($expected === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $next($request);
    }
}
