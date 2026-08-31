<?php

namespace App\Models;

use App\Support\Sitio;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Categoria extends Model
{
    use Concerns\SlugUnico;

    /**
     * Cómo se dibuja el RESTO de la sección.
     *
     * Los tres primeros son los que ofrece el panel. Los destacados ya no
     * dependen del modo: van en grande arriba de la sección, en cualquiera de
     * ellos, así que el modo solo decide cómo se acomoda lo que queda.
     *
     * `grid`, `vertical` y `horizontal` siguen aceptándose para no romper
     * categorías creadas antes, pero no se ofrecen: `vertical` hacía justo lo
     * que ahora hace cualquier modo con un destacado adentro.
     */
    public const VITRINAS = ['carrusel', 'dos', 'bandas', 'grid', 'vertical', 'horizontal'];

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
        // Va en el modelo y no en quien lo llama: así avisan igual el panel, el
        // chatbot y cualquier comando de consola. Antes solo avisaba el
        // chatbot, y mover una sección desde el panel no se veía en la página
        // hasta que venciera el minuto del caché.
        static::saved(fn () => Sitio::revalidar());
        static::deleted(fn () => Sitio::revalidar());

        static::creating(function (self $categoria) {
            if (empty($categoria->slug)) {
                $categoria->slug = static::slugLibre(Str::slug($categoria->nombre), 'seccion');
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
