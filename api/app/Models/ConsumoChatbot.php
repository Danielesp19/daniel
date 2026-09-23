<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * El gasto del bot en un mes.
 *
 * Existe para que el tope de la aplicación sea real: los límites de la consola
 * de Anthropic son de ellos y avisan tarde, así que lo único que de verdad
 * corta el gasto es esta cuenta, que se lee antes de cada llamada.
 */
class ConsumoChatbot extends Model
{
    protected $table = 'consumo_chatbot';

    protected $fillable = [
        'mes', 'tokens_entrada', 'tokens_salida',
        'tokens_cache_lectura', 'tokens_cache_escritura',
        'costo_centavos', 'mensajes', 'aviso_enviado',
    ];

    protected $attributes = [
        'tokens_entrada' => 0,
        'tokens_salida' => 0,
        'tokens_cache_lectura' => 0,
        'tokens_cache_escritura' => 0,
        'costo_centavos' => 0,
        'mensajes' => 0,
        'aviso_enviado' => false,
    ];

    protected $casts = [
        'tokens_entrada' => 'integer',
        'tokens_salida' => 'integer',
        'tokens_cache_lectura' => 'integer',
        'tokens_cache_escritura' => 'integer',
        'costo_centavos' => 'integer',
        'mensajes' => 'integer',
        'aviso_enviado' => 'boolean',
    ];

    /**
     * El mes corriente en la zona horaria del negocio.
     *
     * En hora local y no en UTC: para quien administra, el mes se acaba
     * cuando se acaba el mes en Colombia, no cinco horas antes.
     */
    public static function mesActual(): string
    {
        return now((string) config('tienda.timezone', 'America/Bogota'))->format('Y-m');
    }

    /** La fila del mes corriente, creándola si es el primer mensaje del mes. */
    public static function delMes(): self
    {
        return static::firstOrCreate(['mes' => static::mesActual()]);
    }

    /**
     * Suma lo que gastó una llamada a la API.
     *
     * Va dentro de una transacción con incrementos de SQL y no leyendo,
     * sumando y guardando: dos mensajes procesados al tiempo por dos workers
     * leerían el mismo total y el segundo pisaría al primero, dejando el
     * medidor corto justo cuando más tráfico hay.
     */
    public static function registrar(int $entrada, int $salida, int $cacheLectura = 0, int $cacheEscritura = 0): void
    {
        $costo = static::costoCentavos($entrada, $salida, $cacheLectura, $cacheEscritura);
        $fila = static::delMes();

        DB::transaction(function () use ($fila, $entrada, $salida, $cacheLectura, $cacheEscritura, $costo) {
            static::where('id', $fila->id)->update([
                'tokens_entrada' => DB::raw('tokens_entrada + '.$entrada),
                'tokens_salida' => DB::raw('tokens_salida + '.$salida),
                'tokens_cache_lectura' => DB::raw('tokens_cache_lectura + '.$cacheLectura),
                'tokens_cache_escritura' => DB::raw('tokens_cache_escritura + '.$cacheEscritura),
                'costo_centavos' => DB::raw('costo_centavos + '.$costo),
                'updated_at' => now(),
            ]);
        });
    }

    /**
     * Lo que cuestan unos tokens, en centavos de dólar.
     *
     * La escritura de caché cuesta un 25% más que la entrada normal y la
     * lectura una décima parte; son las tarifas estándar de la API. El
     * redondeo es hacia arriba para que el medidor nunca vaya por debajo del
     * gasto real — un tope que se queda corto no sirve de tope.
     */
    public static function costoCentavos(int $entrada, int $salida, int $cacheLectura = 0, int $cacheEscritura = 0): int
    {
        $precioEntrada = (int) config('tienda.chatbot.precio_entrada_centavos_millon');
        $precioSalida = (int) config('tienda.chatbot.precio_salida_centavos_millon');

        $total = $entrada * $precioEntrada
            + $salida * $precioSalida
            + $cacheEscritura * $precioEntrada * 1.25
            + $cacheLectura * $precioEntrada * 0.1;

        return (int) ceil($total / 1_000_000);
    }

    /**
     * Uno más al contador de mensajes atendidos.
     *
     * Va aparte de registrar() porque las unidades son distintas: un mensaje
     * del admin son varias llamadas a la API. Tenerlos separados es lo que
     * permite responder "cuánto cuesta un mensaje" dividiendo uno por otro.
     */
    public static function contarMensaje(): void
    {
        $fila = static::delMes();
        static::where('id', $fila->id)->update([
            'mensajes' => DB::raw('mensajes + 1'),
            'updated_at' => now(),
        ]);
    }

    /** ¿Ya se gastó todo el tope del mes? Sin tope configurado, nunca. */
    public static function topeAlcanzado(): bool
    {
        $tope = (int) config('tienda.chatbot.tope_mensual_centavos');

        return $tope > 0 && static::delMes()->costo_centavos >= $tope;
    }

    /** El gasto del mes en dólares, para decírselo al admin. */
    public function dolares(): string
    {
        return number_format($this->costo_centavos / 100, 2);
    }
}
