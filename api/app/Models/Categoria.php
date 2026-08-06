<?php

namespace App\Models;

use App\Support\Sitio;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Categoria extends Model
{
    /** Cómo se dibuja la categoría en el catálogo web. Ver la migración. */
    public const VITRINAS = ['grid', 'carrusel', 'vertical', 'horizontal'];

    protected $table = 'categorias';

    protected $fillable = ['nombre', 'slug', 'descripcion', 'modo_vitrina', 'orden', 'activa'];

    protected $casts = [
        'activa' => 'boolean',
        'orden' => 'integer',
    ];

    protected static function booted(): void
    {
        // Guardar o borrar una categoría empuja al sitio a regenerarse.
        //
        // Va en el modelo y no en quien lo llama: así avisan igual el panel de
        // Filament, el chatbot y cualquier comando de consola. Antes solo
        // avisaba el chatbot, y mover una sección desde el panel no se veía en
        // la página hasta que venciera el minuto del caché.
        static::saved(fn () => Sitio::revalidar());
        static::deleted(fn () => Sitio::revalidar());

        static::creating(function (self $categoria) {
            if (empty($categoria->slug)) {
                $categoria->slug = Str::slug($categoria->nombre);
            }
        });
    }

    public function productos()
    {
        return $this->hasMany(Producto::class)->orderBy('orden');
    }

    /**
     * Lo que se muestra en el catálogo. Agotado NO es lo mismo que inactivo:
     * un café sin stock se sigue mostrando (con su sello de AGOTADO) porque es
     * parte del portafolio y de la historia de la marca — solo no se puede
     * meter al carrito. Inactivo sí desaparece del todo.
     */
    public function productosVisibles()
    {
        return $this->productos()->where('activo', true);
    }
}
