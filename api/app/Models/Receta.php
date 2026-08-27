<?php

namespace App\Models;

use App\Support\Sitio;
use App\Support\VideoPoster;
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
        'nombre', 'slug', 'metodo', 'resumen', 'detalle', 'cafe_g', 'agua_g', 'duracion_seg',
        'ingredientes', 'pasos', 'producto_id',
        'imagen', 'video', 'video_poster', 'activa', 'orden',
    ];

    protected $attributes = ['activa' => true, 'orden' => 0];

    protected $casts = [
        'cafe_g' => 'integer',
        'agua_g' => 'integer',
        'duracion_seg' => 'integer',
        'ingredientes' => 'array',
        'pasos' => 'array',
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

        // El póster es el primer cuadro del video: lo que se ve mientras baja.
        // Mismo trato que en Producto, para que valga igual venga de donde
        // venga el video.
        static::saving(function (self $receta) {
            if (! $receta->isDirty('video')) {
                return;
            }
            $receta->video_poster = $receta->video ? VideoPoster::generate($receta->video) : null;
        });
    }

    public function scopeVisibles(Builder $q): Builder
    {
        return $q->where('activa', true)->orderBy('orden');
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
