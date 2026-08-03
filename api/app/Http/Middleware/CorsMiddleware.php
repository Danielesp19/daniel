<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $origin = $request->header('Origin', '');

        // Orígenes permitidos: los configurados (CORS_ALLOWED_ORIGINS) en cualquier
        // entorno, y además localhost en cualquier puerto cuando NO es producción.
        $configured = config('tienda.cors_origins', []);
        $allowed = $origin !== '' && (
            in_array($origin, $configured, true)
            || (! app()->isProduction() && preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin))
        );

        if ($request->isMethod('OPTIONS')) {
            return response('', 204)
                ->header('Access-Control-Allow-Origin', $allowed ? $origin : '')
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Requested-With')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        if ($allowed) {
            $response->header('Access-Control-Allow-Origin', $origin);
            $response->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->header('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Requested-With');
        }

        return $response;
    }
}
