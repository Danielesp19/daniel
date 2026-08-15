<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Traslada el inventario que hoy vive en `productos.stock` a la sede
     * principal, para que ninguna bolsa se pierda al cambiar de modelo.
     *
     * Si la base todavía no tiene sedes se crea una de relleno: sin ella el
     * stock quedaría huérfano y el catálogo pintaría todo agotado en cuanto la
     * suma por sede empiece a mandar. Sus datos son evidentemente provisionales
     * a propósito — quien administre la tienda tiene que entrar al panel y
     * corregirlos, y un nombre como "Sede principal" con una dirección vacía se
     * nota de inmediato.
     *
     * Se usa DB y no Eloquent: los modelos cambian con el tiempo y una
     * migración tiene que seguir corriendo igual dentro de un año.
     */
    public function up(): void
    {
        // Sin productos no hay nada que repartir: base recién creada, el
        // seeder se encarga.
        if (DB::table('productos')->count() === 0) {
            return;
        }

        $sedeId = DB::table('sedes')->where('principal', true)->value('id')
            ?? DB::table('sedes')->orderBy('id')->value('id');

        if (! $sedeId) {
            $ahora = now();
            $sedeId = DB::table('sedes')->insertGetId([
                'nombre' => 'Sede principal',
                'slug' => 'sede-principal',
                'direccion' => 'Pendiente por completar',
                'ciudad' => 'Pendiente por completar',
                'principal' => true,
                'activa' => true,
                'orden' => 0,
                'created_at' => $ahora,
                'updated_at' => $ahora,
            ]);
        }

        // Solo lo que se cuenta. Un servicio (asesoría, barra para eventos) no
        // tiene bolsas en ningún estante, así que tampoco tiene fila por sede.
        $productos = DB::table('productos')
            ->where('controla_stock', true)
            ->get(['id', 'stock']);

        $ahora = now();
        $filas = $productos->map(fn ($p) => [
            'producto_id' => $p->id,
            'sede_id' => $sedeId,
            'stock' => (int) $p->stock,
            'created_at' => $ahora,
            'updated_at' => $ahora,
        ])->all();

        foreach (array_chunk($filas, 200) as $lote) {
            DB::table('producto_sede')->insertOrIgnore($lote);
        }
    }

    /**
     * Devuelve el total a `productos.stock` antes de que el pivote desaparezca.
     * No es exacto si entretanto se repartió entre varias sedes —la suma cabe,
     * el desglose no— pero deja la columna con un número cierto en vez de con
     * el que tenía antes de la migración.
     */
    public function down(): void
    {
        $totales = DB::table('producto_sede')
            ->select('producto_id', DB::raw('SUM(stock) as total'))
            ->groupBy('producto_id')
            ->pluck('total', 'producto_id');

        foreach ($totales as $productoId => $total) {
            DB::table('productos')->where('id', $productoId)->update(['stock' => (int) $total]);
        }
    }
};
