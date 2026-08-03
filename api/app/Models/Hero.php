<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hero extends Model
{
    protected $table = 'hero';

    protected $fillable = ['titulo', 'subtitulo', 'etiqueta', 'imagen', 'cta_texto', 'cta_url', 'activo', 'orden'];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];
}
