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

    protected $fillable = ['padre_id', 'nombre', 'slug', 'descripcion', 'modo_vitrina', 'orden', 'activa'];

    protected $casts = [
        'activa' => 'boolean',
        'orden' => 'integer',
        'padre_id' => 'integer',
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

    /* ── Subcategorías ─────────────────────────────────────────────────────
     *
     * La jerarquía es de UN nivel: sección › subcategoría, y no más. Un
     * catálogo de café no necesita "Artefactos › Molinos › Manuales", y cada
     * nivel extra obliga a la página a decidir con qué peso pintar un título
     * que ya no tiene dónde caber. Lo que impide el tercer nivel es
     * `puedeColgarDe()`, que usa el panel antes de guardar.
     */

    public function padre()
    {
        return $this->belongsTo(self::class, 'padre_id');
    }

    public function subcategorias()
    {
        return $this->hasMany(self::class, 'padre_id')->orderBy('orden');
    }

    /** Las subcategorías que se muestran: activas y con algo adentro. */
    public function subcategoriasVisibles()
    {
        return $this->subcategorias()->where('activa', true);
    }

    /** Una sección es una categoría de primer nivel: la que se ve en el menú. */
    public function esSeccion(): bool
    {
        return $this->padre_id === null;
    }

    /** Solo las secciones, en el orden de la página. */
    public function scopeSecciones($query)
    {
        return $query->whereNull('padre_id');
    }

    /**
     * ¿Esta categoría puede colgar de `$padre`?
     *
     * Tres cosas la dejan fuera: colgarse de sí misma, colgarse de algo que ya
     * es subcategoría (sería un tercer nivel) y colgarse de otra teniendo
     * subcategorías propias (que quedarían en el tercer nivel sin haberlas
     * tocado).
     */
    public function puedeColgarDe(?self $padre): bool
    {
        if ($padre === null) {
            return true;
        }

        return $padre->id !== $this->id
            && $padre->esSeccion()
            && ! $this->subcategorias()->exists();
    }
}
