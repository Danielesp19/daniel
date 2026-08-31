<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Un paso de una receta, con su imagen y su reloj opcionales.
 *
 * El temporizador vive acá y no en la receta porque es donde se usa: uno lee
 * "bloom con 45 ml y espera 40 segundos" y lo arranca ahí mismo. Una receta
 * con dos esperas tiene dos pasos con reloj, cada uno en su sitio.
 */
class RecetaPaso extends Model
{
    protected $table = 'receta_pasos';

    protected $fillable = ['receta_id', 'orden', 'texto', 'imagen', 'segundos', 'temporizador_etiqueta'];

    protected $casts = [
        'orden' => 'integer',
        'segundos' => 'integer',
    ];

    public function receta()
    {
        return $this->belongsTo(Receta::class);
    }
}
