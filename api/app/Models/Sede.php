<?php

namespace App\Models;

use App\Support\Sitio;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Un punto de venta físico. El inventario se cuenta por sede (ver la tabla
 * pivote `producto_sede`), y sus datos de contacto son públicos: salen en la
 * ficha del producto al lado del stock, porque saber que quedan tres bolsas no
 * sirve si no se sabe a dónde ir por ellas.
 */
class Sede extends Model
{
    use Concerns\SlugUnico;

    protected $table = 'sedes';

    protected $fillable = [
        'nombre', 'slug', 'direccion', 'ciudad', 'barrio',
        'telefono', 'whatsapp', 'horario',
        'principal', 'activa', 'orden',
    ];

    /**
     * Los mismos valores por defecto que tiene la tabla, por la misma razón que
     * en Producto: Eloquent no relee la fila después de un insert y sin esto
     * una sede recién creada respondería mal en el request que la creó.
     */
    protected $attributes = [
        'principal' => false,
        'activa' => true,
        'orden' => 0,
    ];

    protected $casts = [
        'principal' => 'boolean',
        'activa' => 'boolean',
        'orden' => 'integer',
    ];

    protected static function booted(): void
    {
        // Cambiar una dirección o un horario cambia lo que se ve en la ficha
        // del producto, así que el sitio tiene que regenerarse igual que cuando
        // cambia un producto o una categoría.
        static::saved(fn () => Sitio::revalidar());
        static::deleted(fn () => Sitio::revalidar());

        static::creating(function (self $sede) {
            if (empty($sede->slug)) {
                $sede->slug = static::slugLibre(Str::slug($sede->nombre), 'sede');
            }

            // La primera sede es la principal por definición: si no, quedaría
            // una base con sedes y ninguna que reciba los movimientos que no
            // dicen a cuál van.
            if (static::count() === 0) {
                $sede->principal = true;
            }
        });

        // Principal hay una sola. Se resuelve después de guardar y no con un
        // índice único en la base: con el índice, cambiar de principal exigiría
        // dejar un instante sin ninguna, y cualquier fallo en ese instante
        // dejaría la tienda sin sede por defecto.
        static::saved(function (self $sede) {
            if (! $sede->principal) {
                return;
            }

            // update() de constructor no dispara eventos de modelo: sin eso
            // esto se llamaría a sí mismo sin fin.
            static::where('id', '!=', $sede->id)
                ->where('principal', true)
                ->update(['principal' => false]);
        });
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('activa', true);
    }

    public function scopeOrdenadas(Builder $query): Builder
    {
        return $query->orderBy('orden')->orderBy('nombre');
    }

    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'producto_sede')
            ->withPivot('stock')
            ->withTimestamps();
    }

    /** Las sedes que se le muestran al público, en su orden. */
    public static function visibles(): Collection
    {
        return static::query()->activas()->ordenadas()->get();
    }

    /**
     * La sede que recibe un movimiento que no dijo a cuál iba.
     *
     * Cae a la primera activa si nadie marcó principal, para que una base mal
     * configurada no deje el inventario sin poder moverse.
     */
    public static function principal(): ?self
    {
        return static::query()->where('principal', true)->first()
            ?? static::query()->activas()->ordenadas()->first();
    }

    /**
     * Busca sedes por nombre escrito a mano.
     *
     * El chatbot recibe "súbele dos al centro" y tiene que resolver "centro"
     * contra "Sede Centro Histórico" sin conocer ids. Devuelve TODAS las que
     * calzan —no la primera— porque con dos coincidencias lo correcto es que
     * el asistente vuelva a preguntar, no que adivine en cuál estante mueve
     * bolsas de verdad.
     */
    public static function buscarPorNombre(string $texto): Collection
    {
        $texto = trim($texto);

        if ($texto === '') {
            return new Collection;
        }

        // Coincidencia exacta de nombre o slug: si el usuario escribió el
        // nombre completo, eso manda aunque otra sede lo contenga como parte
        // del suyo ("Centro" no debería quedar ambiguo por "Centro Histórico").
        $exacta = static::query()
            ->where(fn ($q) => $q->where('nombre', $texto)->orWhere('slug', Str::slug($texto)))
            ->get();

        if ($exacta->isNotEmpty()) {
            return $exacta;
        }

        $termino = '%'.str_replace(['%', '_'], ['\%', '\_'], $texto).'%';

        return static::query()
            ->where(fn ($q) => $q
                ->where('nombre', 'like', $termino)
                ->orWhere('ciudad', 'like', $termino)
                ->orWhere('barrio', 'like', $termino))
            ->ordenadas()
            ->get();
    }
}
