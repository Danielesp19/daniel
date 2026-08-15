<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Deja el catálogo en tres secciones: Cafés, Artefactos y Servicios.
     *
     * Antes eran cinco, y dos de ellas —"Café en grano" y "Artefactos"— se
     * dibujaban con el mismo carrusel, así que la página se sentía repetida:
     * el café además aparecía dos veces, en grano y de origen. Se fusionan los
     * dos bloques de café en uno solo; el de origen no necesita sección propia
     * porque su ficha ya lo distingue sola (finca, altura, puntaje SCA).
     *
     * Cada sección queda con un tratamiento distinto:
     *   Cafés      → vitrina (uno en grande y el resto en grilla)
     *   Artefactos → carrusel (una fila que se corre de lado)
     *   Servicios  → tarjetas apaisadas con video (queda como estaba)
     *
     * "Métodos" NO se borra: se apaga. Sus cuatro videos son la base de la
     * sección de recetas que viene después, y borrarlos ahora obligaría a
     * volver a grabarlos.
     *
     * Se usa DB y no Eloquent: una migración tiene que seguir corriendo igual
     * dentro de un año, aunque los modelos hayan cambiado.
     */
    public function up(): void
    {
        $grano = DB::table('categorias')->where('slug', 'cafe-en-grano')->first();
        $origen = DB::table('categorias')->where('slug', 'cafes-de-origen')->first();

        if ($grano && $origen) {
            DB::table('productos')->where('categoria_id', $origen->id)
                ->update(['categoria_id' => $grano->id]);

            DB::table('categorias')->where('id', $origen->id)->delete();
        }

        if ($grano) {
            DB::table('categorias')->where('id', $grano->id)->update([
                'nombre' => 'Cafés',
                'slug' => 'cafes',
                'descripcion' => 'Lotes con fecha de tueste reciente, de un solo productor. Se muelen al momento y para el método que uses.',
                'modo_vitrina' => 'vertical',
                'orden' => 1,
                'updated_at' => now(),
            ]);

            // El que va de primero es el que se dibuja en grande, así que manda
            // el marcado como destacado. Sin esto el lugar de honor se lo
            // llevaría el que quedó con el `orden` más bajo por casualidad al
            // fusionar las dos listas.
            $productos = DB::table('productos')
                ->where('categoria_id', $grano->id)
                ->orderByDesc('destacado')
                ->orderBy('orden')
                ->pluck('id');

            foreach ($productos as $posicion => $id) {
                DB::table('productos')->where('id', $id)->update(['orden' => $posicion]);
            }
        }

        DB::table('categorias')->where('slug', 'artefactos')
            ->update(['modo_vitrina' => 'carrusel', 'orden' => 2, 'updated_at' => now()]);

        DB::table('categorias')->where('slug', 'servicios')
            ->update(['orden' => 3, 'updated_at' => now()]);

        DB::table('categorias')->where('slug', 'metodos')
            ->update(['activa' => false, 'orden' => 4, 'updated_at' => now()]);
    }

    /**
     * Vuelve a encender Métodos y a separar el café por tipo de lote. La
     * frontera se reconstruye por la ficha de origen: un café con finca y
     * puntaje SCA era de la sección de origen.
     */
    public function down(): void
    {
        DB::table('categorias')->where('slug', 'metodos')
            ->update(['activa' => true, 'orden' => 5]);

        $cafes = DB::table('categorias')->where('slug', 'cafes')->first();

        if (! $cafes) {
            return;
        }

        DB::table('categorias')->where('id', $cafes->id)->update([
            'nombre' => 'Café en grano',
            'slug' => 'cafe-en-grano',
            'descripcion' => 'Lotes con fecha de tueste reciente. Se muele al momento y para el método que uses.',
            'modo_vitrina' => 'carrusel',
            'orden' => 1,
        ]);

        $origenId = DB::table('categorias')->insertGetId([
            'nombre' => 'Cafés de origen',
            'slug' => 'cafes-de-origen',
            'descripcion' => 'Un solo productor, un solo lote, una sola cosecha. Los que valen la pena tomar sin leche.',
            'modo_vitrina' => 'vertical',
            'orden' => 2,
            'activa' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('productos')
            ->where('categoria_id', $cafes->id)
            ->whereNotNull('puntaje_sca')
            ->update(['categoria_id' => $origenId]);
    }
};
