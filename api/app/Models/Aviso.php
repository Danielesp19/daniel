<?php

namespace App\Models;

use App\Support\Sitio;
use Illuminate\Database\Eloquent\Model;

/**
 * La banda de aviso de arriba del sitio: una feria, un lote que llegó, un
 * cierre por vacaciones. Se enciende y se apaga sin tocar la portada.
 */
class Aviso extends Model
{
    protected $table = 'avisos';

    protected $fillable = ['etiqueta', 'titulo', 'texto', 'cta_texto', 'cta_url', 'activo', 'orden'];

    protected $attributes = [
        'etiqueta' => 'Aviso',
        'activo' => true,
        'orden' => 0,
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];

    protected static function booted(): void
    {
        // Un aviso nuevo tiene que verse ya: se anuncia algo que empieza hoy.
        static::saved(fn () => Sitio::revalidar());
        static::deleted(fn () => Sitio::revalidar());
    }

    /** El que dibuja la página: el primero activo, por orden. */
    public static function vigente(): ?self
    {
        return static::query()->where('activo', true)->orderBy('orden')->first();
    }

    /** El botón solo existe si tiene las dos cosas: texto y a dónde ir. */
    public function tieneBoton(): bool
    {
        return (bool) ($this->cta_texto && $this->cta_url);
    }
}
