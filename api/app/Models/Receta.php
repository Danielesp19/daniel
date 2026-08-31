<?php

namespace App\Models;

use App\Support\Sitio;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Cómo preparar un método en casa: las cantidades, los pasos y el reloj.
 *
 * No es un producto aunque se le parezca: no se compra, no se agota y no va al
 * carrito. Antes vivía en `productos` con precio 0 y sin control de stock, y
 * ese remiendo la hacía arrastrar carrito, inventario y sedes que no le
 * servían de nada.
 */
class Receta extends Model
{
    use Concerns\SlugUnico;

    /**
     * Los métodos que se usan hoy. Es una sugerencia para el panel y el orden
     * de los filtros en la página, NO una restricción: la columna es texto
     * libre para que el día que aparezca "sifón" no haga falta una migración.
     */
    public const METODOS = ['Filtrado', 'Inmersión', 'Espresso', 'Con leche'];

    protected $table = 'recetas';

    protected $fillable = [
        'nombre', 'slug', 'metodo', 'resumen', 'detalle', 'video_youtube',
        'cafe_g', 'agua_g', 'duracion_seg',
        'ingredientes', 'producto_id',
        'imagen', 'activa', 'orden',
    ];

    protected $attributes = ['activa' => true, 'orden' => 0];

    protected $casts = [
        'cafe_g' => 'integer',
        'agua_g' => 'integer',
        'duracion_seg' => 'integer',
        'ingredientes' => 'array',
        'activa' => 'boolean',
        'orden' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saved(fn () => Sitio::revalidar());
        static::deleted(fn () => Sitio::revalidar());

        static::creating(function (self $receta) {
            if (empty($receta->slug)) {
                $receta->slug = static::slugLibre(Str::slug($receta->nombre), 'receta');
            }
        });
    }

    public function scopeVisibles(Builder $q): Builder
    {
        return $q->where('activa', true)->orderBy('orden');
    }

    /** Los pasos, en orden. */
    public function pasos()
    {
        return $this->hasMany(RecetaPaso::class)->orderBy('orden');
    }

    /**
     * Los artefactos que usa. Si están a la venta, la receta los recomienda:
     * quien va a preparar algo es justo quien necesita el molino.
     */
    public function artefactos()
    {
        return $this->belongsToMany(Producto::class, 'receta_artefactos', 'receta_id', 'producto_id')
            ->withPivot('orden')
            ->orderBy('receta_artefactos.orden');
    }

    /**
     * El id del video de YouTube, sacado de cualquiera de sus formatos de URL.
     *
     * Se guarda la URL como la pegó el admin —que es lo que él reconoce si
     * vuelve a mirarla— y el id se extrae al leer. Cubre youtu.be, /watch?v=,
     * /embed/ y /shorts/, que son las cuatro formas en que YouTube reparte el
     * mismo video.
     */
    public function youtubeId(): ?string
    {
        if (! $this->video_youtube) {
            return null;
        }

        $patrones = [
            '~youtu\.be/([A-Za-z0-9_-]{11})~',
            '~[?&]v=([A-Za-z0-9_-]{11})~',
            '~/embed/([A-Za-z0-9_-]{11})~',
            '~/shorts/([A-Za-z0-9_-]{11})~',
        ];

        foreach ($patrones as $patron) {
            if (preg_match($patron, $this->video_youtube, $m)) {
                return $m[1];
            }
        }

        // Por si pegan el id pelado.
        return preg_match('~^[A-Za-z0-9_-]{11}$~', trim($this->video_youtube))
            ? trim($this->video_youtube)
            : null;
    }

    /** El café que mejor le queda. Opcional: no toda receta recomienda uno. */
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * La proporción café:agua, para la calculadora. null si falta algún dato.
     *
     * Se devuelve el divisor y no la cadena "1:16,7" porque quien lo pinta
     * decide cómo redondearlo, y quien calcula necesita el número.
     */
    public function ratio(): ?float
    {
        if (! $this->cafe_g || ! $this->agua_g) {
            return null;
        }

        return round($this->agua_g / $this->cafe_g, 2);
    }

    /**
     * La duración como la lee una persona: 165 → "2:45", 50400 → "14 h".
     *
     * Por encima de una hora se dice en horas: un cold brew de catorce horas
     * escrito "840:00" no lo entiende nadie.
     */
    public function duracionLegible(): ?string
    {
        $s = (int) $this->duracion_seg;

        if ($s <= 0) {
            return null;
        }
        if ($s >= 3600) {
            $horas = $s / 3600;

            return rtrim(rtrim(number_format($horas, 1, ',', ''), '0'), ',').' h';
        }

        return sprintf('%d:%02d', intdiv($s, 60), $s % 60);
    }
}
