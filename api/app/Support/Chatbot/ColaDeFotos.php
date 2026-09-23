<?php

namespace App\Support\Chatbot;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * Las fotos que el admin mandó y todavía no dijo de qué son.
 *
 * Antes cabía una sola: llegaba una imagen, se guardaba, y la siguiente
 * pisaba a la anterior. Eso alcanzaba para "ponle esta al mirador", pero no
 * para armar un kit —cuatro piezas, cuatro fotos, una sola frase— que es
 * justo lo que hay que poder hacer sin abrir el panel.
 *
 * Las imágenes se bajan de Meta y se guardan en disco APENAS LLEGAN, antes de
 * hablar con el modelo: la URL que da Meta caduca, y sostenerla durante toda
 * la conversación sería apostar a que el admin conteste rápido. Lo que queda
 * en caché es la ruta local, no el archivo.
 *
 * El orden es el de llegada, y se numeran desde 1: cuando el admin dice "la
 * primera es la del molino", está contando como contó al mandarlas.
 */
class ColaDeFotos
{
    /**
     * Cuántas fotos se sostienen a la vez.
     *
     * Ocho es el tope de medios que acepta un producto en el panel, así que
     * más que eso no habría dónde ponerlas. Al llegar la novena se suelta la
     * más vieja: la que el admin mandó hace media hora y nunca nombró es la
     * que menos falta le hace.
     */
    private const MAX_FOTOS = 8;

    /**
     * Guarda una foto al final de la cola y devuelve su número.
     *
     * @return int La posición en la que quedó, contando desde 1.
     */
    public static function agregar(string $de, string $ruta): int
    {
        $cola = self::pendientes($de);
        $cola[] = [
            'ruta' => $ruta,
            // La hora en que llegó, para que el modelo pueda decir "la de
            // las 3:12" cuando hay varias y el admin no se acuerda del orden.
            'recibida' => now((string) config('tienda.timezone', 'America/Bogota'))->format('H:i'),
        ];

        // Las que sobran se van con su archivo: si no, el disco se llena de
        // fotos que nadie va a reclamar.
        while (count($cola) > self::MAX_FOTOS) {
            $vieja = array_shift($cola);
            Storage::disk('public')->delete($vieja['ruta']);
        }

        self::guardar($de, $cola);

        return count($cola);
    }

    /**
     * Lo que hay en espera, en orden de llegada.
     *
     * @return array<int, array{ruta: string, recibida: string}>
     */
    public static function pendientes(string $de): array
    {
        return array_values((array) Cache::get(self::llave($de), []));
    }

    /**
     * Saca una foto de la cola para usarla. Devuelve su ruta, o null.
     *
     * `$numero` cuenta desde 1. Sin número: si hay exactamente una, esa; si
     * hay varias, null — el modelo tiene que preguntar cuál, porque ponerle
     * al café la foto del molino es un error que nadie ve hasta que un
     * cliente abre la página.
     *
     * La foto se CONSUME: sin eso, un "ponle esta misma al otro" seguido de
     * un descuido deja la misma imagen en media docena de productos.
     */
    public static function tomar(string $de, ?int $numero = null): ?string
    {
        $cola = self::pendientes($de);

        if ($cola === []) {
            return null;
        }

        if ($numero === null) {
            if (count($cola) > 1) {
                return null;
            }
            $numero = 1;
        }

        $indice = $numero - 1;
        if (! isset($cola[$indice])) {
            return null;
        }

        $ruta = $cola[$indice]['ruta'];
        unset($cola[$indice]);
        self::guardar($de, array_values($cola));

        return $ruta;
    }

    /** Cuántas hay esperando. */
    public static function cuantas(string $de): int
    {
        return count(self::pendientes($de));
    }

    /** @param array<int, array{ruta: string, recibida: string}> $cola */
    private static function guardar(string $de, array $cola): void
    {
        if ($cola === []) {
            Cache::forget(self::llave($de));

            return;
        }

        Cache::put(
            self::llave($de),
            $cola,
            now()->addMinutes((int) config('tienda.chatbot.memoria_minutos', 30)),
        );
    }

    private static function llave(string $de): string
    {
        return 'chatbot:fotos:'.sha1($de);
    }
}
