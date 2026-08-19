<?php

namespace App\Models;

use App\Support\Sitio;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Una pregunta frecuente con su respuesta. */
class Pregunta extends Model
{
    protected $table = 'preguntas';

    protected $fillable = ['pregunta', 'respuesta', 'activa', 'orden'];

    protected $attributes = ['activa' => true, 'orden' => 0];

    protected $casts = ['activa' => 'boolean', 'orden' => 'integer'];

    protected static function booted(): void
    {
        static::saved(fn () => Sitio::revalidar());
        static::deleted(fn () => Sitio::revalidar());
    }

    public function scopeVisibles(Builder $q): Builder
    {
        return $q->where('activa', true)->orderBy('orden');
    }
}
