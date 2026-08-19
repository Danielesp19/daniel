<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Traslada los cuatro "Métodos" a la tabla de recetas y borra su sección.
     *
     * Se apagaron cuando el catálogo pasó a tres secciones, con el acuerdo de
     * que eran la base de las recetas. Este es ese momento: se llevan su
     * nombre, su descripción y —lo que importa— su video, para no tener que
     * volver a grabarlos.
     *
     * Los pasos y las cantidades NO se pueden adivinar desde un producto, así
     * que las recetas trasladadas llegan sin ellos y quedan APAGADAS: es mejor
     * que no salgan a que salgan a medias. El seeder sí las siembra completas
     * para una base nueva, y en la que ya existe se completan desde el panel.
     */
    public function up(): void
    {
        $metodos = DB::table('categorias')->where('slug', 'metodos')->first();

        if (! $metodos) {
            return;
        }

        $productos = DB::table('productos')->where('categoria_id', $metodos->id)->orderBy('orden')->get();

        foreach ($productos as $posicion => $p) {
            // Si el seeder ya sembró una receta con ese nombre no se duplica.
            if (DB::table('recetas')->where('slug', $p->slug)->exists()) {
                continue;
            }

            DB::table('recetas')->insert([
                'nombre' => $p->nombre,
                'slug' => $p->slug ?: Str::slug($p->nombre),
                // Sin forma de saber el método real desde el producto; queda
                // en la categoría más común y se corrige desde el panel.
                'metodo' => 'Filtrado',
                'detalle' => $p->descripcion,
                'imagen' => $p->imagen,
                'video' => $p->video,
                'video_poster' => $p->video_poster,
                'activa' => false,
                'orden' => $posicion,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Los productos se van con la categoría: la llave foránea está en
        // cascada y ya no son productos de nada.
        DB::table('categorias')->where('id', $metodos->id)->delete();
    }

    /**
     * No se reconstruye la sección de métodos: sus productos ya no existen y
     * recrearlos vacíos sería peor que no tenerlos. Las recetas se conservan.
     */
    public function down(): void {}
};
