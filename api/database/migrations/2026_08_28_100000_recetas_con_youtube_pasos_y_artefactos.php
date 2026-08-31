<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Las recetas dejan de ser un bloque de texto y pasan a tener partes.
     *
     * Tres cambios que van juntos porque los tres tocan la misma pantalla:
     *
     *  · EL VIDEO SE VE DE YOUTUBE. Se guarda la URL y ya. Subir el video al
     *    servidor costaba almacenamiento y ancho de banda propios para algo
     *    que YouTube sirve mejor; además de ahí sale la miniatura, así que una
     *    receta con video no necesita que le suban foto.
     *  · LOS PASOS SON FILAS, no un arreglo de textos. Cada uno puede llevar
     *    una imagen y su propio temporizador.
     *  · EL TEMPORIZADOR VIVE EN EL PASO. Una receta puede tener varios —uno
     *    para el bloom y otro para la infusión— y cada uno sale debajo del
     *    paso al que pertenece, que es donde uno lo va a tocar.
     */
    public function up(): void
    {
        Schema::table('recetas', function (Blueprint $table) {
            $table->string('video_youtube')->nullable()->after('detalle');
        });

        Schema::create('receta_pasos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receta_id')->constrained('recetas')->cascadeOnDelete();
            $table->unsignedInteger('orden')->default(0);
            $table->text('texto');

            // Opcional: no todo paso necesita foto, y obligar a una llenaría la
            // receta de imágenes de relleno.
            $table->string('imagen')->nullable();

            // El temporizador de ESTE paso. Sin segundos, el paso no lleva
            // reloj — que es el caso de la mayoría.
            $table->unsignedInteger('segundos')->nullable();
            // Cómo se llama el reloj: "Bloom", "Infusión". Sin etiqueta se
            // muestra solo el tiempo.
            $table->string('temporizador_etiqueta')->nullable();

            $table->timestamps();
            $table->index(['receta_id', 'orden']);
        });

        // Los artefactos que se usan. Si están a la venta, la receta los
        // recomienda con su precio: quien va a preparar algo es justo quien
        // necesita el molino.
        Schema::create('receta_artefactos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('receta_id')->constrained('recetas')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->unique(['receta_id', 'producto_id']);
        });

        // Traslado de los pasos que ya existen, sin perder ninguno.
        foreach (DB::table('recetas')->get(['id', 'pasos']) as $receta) {
            $pasos = json_decode((string) $receta->pasos, true) ?: [];

            foreach ($pasos as $orden => $texto) {
                if (! is_string($texto) || trim($texto) === '') {
                    continue;
                }
                DB::table('receta_pasos')->insert([
                    'receta_id' => $receta->id,
                    'orden' => $orden,
                    'texto' => $texto,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::table('recetas', function (Blueprint $table) {
            // El original se conserva bajo otro nombre, por si hay que volver
            // atrás: borrarlo en la misma migración que lo traslada deja sin
            // red el día que algo salga mal.
            //
            // Se RENOMBRA y no se deja como estaba porque `pasos` es ahora el
            // nombre de la relación, y una columna con ese nombre la tapa:
            // Eloquent devuelve el texto viejo en vez de las filas nuevas.
            $table->renameColumn('pasos', 'pasos_legado');

            // El video subido sí se va: el cliente pidió expresamente que no
            // haya videos en el servidor.
            $table->dropColumn(['video', 'video_poster']);
        });
    }

    public function down(): void
    {
        Schema::table('recetas', function (Blueprint $table) {
            $table->renameColumn('pasos_legado', 'pasos');
            $table->dropColumn('video_youtube');
            $table->string('video')->nullable();
            $table->string('video_poster')->nullable();
        });

        Schema::dropIfExists('receta_artefactos');
        Schema::dropIfExists('receta_pasos');
    }
};
