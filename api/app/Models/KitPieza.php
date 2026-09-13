<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Una pieza que solo existe dentro de un kit.
 *
 * Los filtros de papel que vienen con el V60, la bolsa de muestra: cosas que el
 * comprador recibe y que hay que nombrar, pero que no se venden sueltas. Por
 * eso llevan nombre y foto y nada más — no tienen precio porque no se venden, y
 * no tienen stock porque el que se cuenta es el del kit.
 *
 * Lo que SÍ se vende aparte no va acá: eso entra al kit como componente, con su
 * ficha y su foto propias (ver Producto::componentes).
 */
class KitPieza extends Model
{
    protected $table = 'kit_piezas';

    protected $fillable = ['producto_id', 'nombre', 'imagen', 'orden'];

    protected $casts = ['orden' => 'integer'];

    public function imagenUrl(): ?string
    {
        return $this->imagen ? asset('storage/'.$this->imagen) : null;
    }
}
