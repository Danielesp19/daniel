<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Le avisa al sitio que el catálogo cambió.
 *
 * El sitio se sirve cacheado desde el CDN y se regenera solo cada 60 segundos.
 * Para quien administra desde el celular ese minuto es una eternidad: cambia
 * un precio, abre la página, no ve nada y vuelve a cambiarlo. Este empujón
 * hace que la próxima visita ya vea lo nuevo.
 *
 * Es best-effort a propósito: si el sitio no responde, el cambio ya quedó
 * guardado en la base y el CDN lo tomará solo en menos de un minuto. Nunca
 * revienta la operación que lo llamó.
 */
class Sitio
{
    /**
     * Ya se avisó en este proceso.
     *
     * Sin esto, sembrar el catálogo o guardar diez productos seguidos manda
     * diez pings idénticos: el sitio regenera una sola página, así que el
     * primero ya hizo todo el trabajo. Es por proceso —cada petición web y
     * cada comando arrancan de cero— así que dos cambios separados en el
     * tiempo sí avisan las dos veces.
     */
    private static bool $avisado = false;

    public static function revalidar(): void
    {
        if (self::$avisado) {
            return;
        }
        self::$avisado = true;

        $url = rtrim((string) config('tienda.sitio_url'), '/');
        $secreto = (string) config('tienda.revalidar_secreto');

        if ($url === '' || $secreto === '') {
            return; // sin configurar: se cae al refresco por tiempo, y ya
        }

        try {
            // Timeout corto: esto cuelga de la respuesta a un WhatsApp, y
            // hacer esperar al admin por un ping es peor que no mandarlo.
            Http::timeout(4)
                ->withHeaders(['X-Revalidar-Secreto' => $secreto])
                ->post($url.'/api/revalidar');
        } catch (\Throwable $e) {
            Log::info('No se pudo revalidar el sitio', ['error' => $e->getMessage()]);
        }
    }
}
