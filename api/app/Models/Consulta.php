<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Una pregunta que dejó alguien desde la página. */
class Consulta extends Model
{
    protected $table = 'consultas';

    protected $fillable = ['mensaje', 'contacto', 'atendida'];

    protected $attributes = ['atendida' => false];

    protected $casts = ['atendida' => 'boolean'];
}
