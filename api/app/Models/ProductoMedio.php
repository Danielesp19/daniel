<?php

namespace App\Models;

use App\Support\VideoPoster;
use Illuminate\Database\Eloquent\Model;

/**
 * Una foto o un video de un producto.
 *
 * Van todos en la misma lista y ordenados: la primera fila es la portada, sea
 * foto o video. Antes la portada era una columna del producto, el video otra y
 * las adicionales una tabla aparte, y con eso no había forma de decidir el
 * orden ni de poner el video de primero.
 */
class ProductoMedio extends Model
{
    protected $table = 'producto_medios';

    protected $fillable = ['producto_id', 'tipo', 'ruta', 'poster', 'orden'];

    protected $casts = ['orden' => 'integer'];

    protected static function booted(): void
    {
        // El póster es el primer cuadro del video: es lo que se ve mientras el
        // archivo baja. Se saca acá, al guardar el medio, para que valga igual
        // venga del panel o de donde venga.
        static::saving(function (self $medio) {
            if ($medio->tipo !== 'video') {
                $medio->poster = null;

                return;
            }
            if ($medio->isDirty('ruta')) {
                $medio->poster = VideoPoster::generate($medio->ruta);
            }
        });
    }

    public function esVideo(): bool
    {
        return $this->tipo === 'video';
    }

    /** La URL pública del archivo. */
    public function url(): string
    {
        return asset('storage/'.$this->ruta);
    }

    /** El cuadro de respaldo de un video, si se pudo sacar. */
    public function posterUrl(): ?string
    {
        return $this->poster ? asset('storage/'.$this->poster) : null;
    }
}
