<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fotos y video de un producto pasan a ser una sola lista ordenada.
 *
 * Estaban en tres sitios: la columna `imagen` (la portada), la columna `video`
 * —con su `video_poster`— y la tabla `producto_imagenes` (las adicionales). Eso
 * obligaba a tres controles distintos en el panel y hacía imposible lo que
 * pidió el cliente: decidir en qué orden se ven, incluido poner el video de
 * primero.
 *
 * Ahora hay una tabla con `tipo` y `orden`. La PRIMERA fila es la portada, sea
 * foto o video — igual que en la carta de la meca, donde la primera foto es la
 * que sale en el listado.
 *
 * El traslado conserva lo que había y en el orden en que se veía: la portada,
 * luego el video y después las adicionales tal como estaban ordenadas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('producto_medios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->string('tipo')->default('imagen');   // imagen | video
            $table->string('ruta');
            // Solo para video: el cuadro que se ve mientras carga. Lo saca el
            // backend del propio archivo al subirlo.
            $table->string('poster')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['producto_id', 'orden']);
        });

        $ahora = now();

        foreach (DB::table('productos')->get() as $p) {
            $filas = [];
            $orden = 0;

            if ($p->imagen) {
                $filas[] = ['tipo' => 'imagen', 'ruta' => $p->imagen, 'poster' => null, 'orden' => $orden++];
            }

            if ($p->video) {
                $filas[] = ['tipo' => 'video', 'ruta' => $p->video, 'poster' => $p->video_poster, 'orden' => $orden++];
            }

            $extras = DB::table('producto_imagenes')->where('producto_id', $p->id)->orderBy('orden')->get();
            foreach ($extras as $e) {
                $filas[] = ['tipo' => 'imagen', 'ruta' => $e->ruta, 'poster' => null, 'orden' => $orden++];
            }

            foreach ($filas as $f) {
                DB::table('producto_medios')->insert($f + [
                    'producto_id' => $p->id,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ]);
            }
        }

        Schema::dropIfExists('producto_imagenes');

        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn(['imagen', 'video', 'video_poster']);
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->string('imagen')->nullable();
            $table->string('video')->nullable();
            $table->string('video_poster')->nullable();
        });

        Schema::create('producto_imagenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->string('ruta');
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();

            $table->index(['producto_id', 'orden']);
        });

        foreach (DB::table('producto_medios')->orderBy('producto_id')->orderBy('orden')->get() as $m) {
            if ($m->tipo === 'video') {
                DB::table('productos')->where('id', $m->producto_id)
                    ->update(['video' => $m->ruta, 'video_poster' => $m->poster]);

                continue;
            }

            $tienePortada = DB::table('productos')->where('id', $m->producto_id)->value('imagen');
            if (! $tienePortada) {
                DB::table('productos')->where('id', $m->producto_id)->update(['imagen' => $m->ruta]);

                continue;
            }

            DB::table('producto_imagenes')->insert([
                'producto_id' => $m->producto_id,
                'ruta' => $m->ruta,
                'orden' => $m->orden,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::dropIfExists('producto_medios');
    }
};
