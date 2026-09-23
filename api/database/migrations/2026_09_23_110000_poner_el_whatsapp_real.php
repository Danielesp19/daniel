<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Cambia el WhatsApp de pruebas por el de Daniel en los datos ya guardados.
 *
 * El número vivía en el código Y en la base: el enlace del aviso de la portada
 * y el teléfono de cada sede se sembraron con él. Cambiar el código no alcanza
 * porque esas filas ya están escritas, y el enlace del aviso es público y
 * clicable.
 *
 * VA FILA POR FILA Y SOLO SI TODAVÍA TIENE EL VIEJO. No pone el número nuevo
 * a lo bruto: si alguien ya editó el aviso desde el panel y le puso otro
 * enlace, esto no lo toca. Lo mismo con las sedes. Migrar datos que el
 * administrador puede haber cambiado a mano obliga a ser conservador —es
 * preferible dejar un número viejo que borrar uno bueno—.
 */
return new class extends Migration
{
    /** Los de pruebas: el del sitio y los dos que el seeder derivó de él. */
    private const VIEJOS = ['573222248487', '573222248488', '573222248489'];

    private const NUEVO = '573227323425';

    public function up(): void
    {
        foreach (self::VIEJOS as $viejo) {
            // El enlace del aviso, que es el que ve el público.
            DB::table('avisos')
                ->where('cta_url', 'like', '%'.$viejo.'%')
                ->update(['cta_url' => DB::raw(
                    "replace(cta_url, '{$viejo}', '".self::NUEVO."')"
                )]);

            // El teléfono de cada sede. Hoy no se publica —todo el contacto
            // pasa por la línea de Daniel— pero se deja al día igual.
            DB::table('sedes')
                ->where('whatsapp', $viejo)
                ->update(['whatsapp' => self::NUEVO]);
        }
    }

    /**
     * Sin vuelta atrás: devolver el número de pruebas sería reponer un dato
     * equivocado. Si hiciera falta otro, se cambia desde el panel.
     */
    public function down(): void
    {
        // a propósito, nada
    }
};
