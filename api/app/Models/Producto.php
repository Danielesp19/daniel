<?php

namespace App\Models;

use App\Support\Sitio;
use App\Support\VideoPoster;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class Producto extends Model
{
    use Concerns\SlugUnico;

    protected $table = 'productos';

    protected $fillable = [
        'categoria_id', 'nombre', 'slug', 'descripcion', 'precio_cop',
        'stock', 'stock_minimo', 'gramos', 'controla_stock',
        'finca', 'productor', 'region', 'altitud_msnm', 'variedad', 'proceso',
        'tueste', 'notas', 'puntaje_sca',
        'imagen', 'video', 'video_poster',
        'activo', 'destacado', 'orden',
    ];

    /**
     * Los mismos valores por defecto que tiene la tabla.
     *
     * Eloquent NO relee la fila después de un insert, así que sin esto un
     * producto recién creado tiene estos campos en null hasta que alguien lo
     * refresque — y `agotado()` y `porAcabarse()`, que los leen, responderían
     * mal en el mismo request que lo creó.
     */
    protected $attributes = [
        'controla_stock' => true,
        'stock' => 0,
        'stock_minimo' => 3,
        'activo' => true,
        'destacado' => false,
        'orden' => 0,
    ];

    protected $casts = [
        // Entero, no decimal: los precios son pesos colombianos redondos.
        'precio_cop' => 'integer',
        'stock' => 'integer',
        'stock_minimo' => 'integer',
        'gramos' => 'integer',
        'controla_stock' => 'boolean',
        'altitud_msnm' => 'integer',
        'puntaje_sca' => 'decimal:2',
        'notas' => 'array',
        'activo' => 'boolean',
        'destacado' => 'boolean',
        'orden' => 'integer',
    ];

    protected static function booted(): void
    {
        // Guardar o borrar una producto empuja al sitio a regenerarse.
        //
        // Va en el modelo y no en quien lo llama: así avisan igual el panel de
        // Filament, el chatbot y cualquier comando de consola. Antes solo
        // avisaba el chatbot, y mover una sección desde el panel no se veía en
        // la página hasta que venciera el minuto del caché.
        static::saved(fn () => Sitio::revalidar());
        static::deleted(fn () => Sitio::revalidar());

        static::creating(function (self $producto) {
            if (empty($producto->slug)) {
                $producto->slug = static::slugLibre(Str::slug($producto->nombre), 'producto');
            }
        });

        // El póster es el primer cuadro del video: es lo que se ve mientras el
        // video baja. Se genera acá, al guardar, para que valga igual si el
        // video llegó por el panel o por cualquier otra vía.
        static::saving(function (self $producto) {
            if (! $producto->isDirty('video')) {
                return;
            }
            $producto->video_poster = $producto->video
                ? VideoPoster::generate($producto->video)
                : null;
        });
    }

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    public function imagenes()
    {
        return $this->hasMany(ProductoImagen::class)->orderBy('orden');
    }

    /**
     * El inventario real, repartido por punto de venta.
     *
     * Ojo con la dirección de la verdad: ESTA relación manda, y la columna
     * `productos.stock` es su suma —ver recalcularTotal()—. Escribir `stock`
     * directamente descuadra las dos cosas; para mover bolsas está
     * ajustarStockSede().
     */
    public function sedes()
    {
        return $this->belongsToMany(Sede::class, 'producto_sede')
            ->withPivot('stock')
            ->withTimestamps();
    }

    /**
     * Cuántas bolsas hay en cada sede visible: lista de [sede, stock].
     *
     * Incluye las sedes SIN fila en el pivote, en cero. Es a propósito: para el
     * cliente parado frente a la ficha, "en el Centro no hay" es una respuesta
     * tan útil como "en el Norte quedan tres", y omitir la sede lo dejaría sin
     * saber si no hay o si nunca se surtió ahí. Así además no hace falta crear
     * filas en cero para cada producto nuevo por cada sede.
     *
     * Recibe las sedes ya cargadas para poder pintar un catálogo entero sin
     * repetir la misma consulta por producto.
     *
     * @return \Illuminate\Support\Collection<int, array{sede: Sede, stock: int}>
     */
    public function disponibilidad(?EloquentCollection $sedes = null): Collection
    {
        $sedes ??= Sede::visibles();

        $propias = ($this->relationLoaded('sedes') ? $this->sedes : $this->sedes()->get())
            ->keyBy('id');

        return $sedes->map(fn (Sede $sede) => [
            'sede' => $sede,
            'stock' => (int) ($propias->get($sede->id)?->pivot->stock ?? 0),
        ])->values();
    }

    /**
     * Vuelve a sumar las sedes y deja el total en `productos.stock`.
     *
     * Ese total es lo que leen el sello de AGOTADO, la revalidación del carrito
     * y el resumen del chatbot; mantenerlo al día en cada movimiento es lo que
     * permite que todo eso siga funcionando sin enterarse de que ahora hay
     * sedes. Suma TODAS las sedes, incluidas las inactivas: las bolsas de una
     * sede cerrada temporalmente siguen existiendo.
     */
    public function recalcularTotal(): int
    {
        $total = (int) $this->sedes()->sum('producto_sede.stock');

        // Solo escribe si cambió, para no despertar la regeneración del sitio
        // en cada movimiento que no mueve la aguja del total.
        if ((int) $this->stock !== $total) {
            $this->update(['stock' => $total]);
        }

        return $total;
    }

    /**
     * Movimiento de inventario en una sede. Devuelve [antes, despues, total].
     *
     * Se pide la ACCIÓN explícita en vez de aceptar solo un número nuevo:
     * "llegaron 12 bolsas" y "quedan 12 bolsas" son cosas distintas, y quien
     * llame (el panel o el chatbot) tiene que poder expresar cuál de las dos
     * entendió. Vive en el modelo porque tanto la API como el chatbot la usan
     * y el redondeo a cero no puede quedar implementado dos veces.
     *
     * Va dentro de una transacción con la fila bloqueada: dos ajustes a la vez
     * sobre la misma sede —el panel y el chatbot al tiempo— leerían el mismo
     * "antes" y el segundo pisaría al primero.
     *
     * @param  'fijar'|'sumar'|'restar'  $accion
     * @return array{0: int, 1: int, 2: int}
     */
    public function ajustarStockSede(Sede $sede, string $accion, int $cantidad): array
    {
        return DB::transaction(function () use ($sede, $accion, $cantidad) {
            $antes = (int) (DB::table('producto_sede')
                ->where('producto_id', $this->id)
                ->where('sede_id', $sede->id)
                ->lockForUpdate()
                ->value('stock') ?? 0);

            $nuevo = match ($accion) {
                'fijar' => $cantidad,
                'sumar' => $antes + $cantidad,
                // Nunca negativo: si alguien resta de más, el piso es cero. El
                // stock es un conteo físico de bolsas en un estante.
                'restar' => max(0, $antes - $cantidad),
                default => throw new \InvalidArgumentException("Acción de stock desconocida: {$accion}"),
            };

            $this->sedes()->syncWithoutDetaching([$sede->id => ['stock' => $nuevo]]);
            $this->unsetRelation('sedes');

            return [$antes, $nuevo, $this->recalcularTotal()];
        });
    }

    /**
     * Un servicio (asesoría, barra para un evento) nunca se agota: se agenda.
     * Por eso todo lo que dependa del inventario pasa antes por esta bandera.
     */
    public function agotado(): bool
    {
        return $this->controla_stock && $this->stock <= 0;
    }

    /** Hay stock pero está por acabarse: dispara el aviso "últimas bolsas". */
    public function porAcabarse(): bool
    {
        return $this->controla_stock && $this->stock > 0 && $this->stock <= $this->stock_minimo;
    }

    /**
     * ¿Tiene ficha de origen que valga la pena mostrar? Un molino o una prensa
     * comparten tabla con los cafés pero no tienen finca ni altitud; sin este
     * chequeo el frontend pintaría una ficha técnica vacía.
     */
    public function tieneFicha(): bool
    {
        return (bool) ($this->finca || $this->region || $this->variedad || $this->proceso || $this->altitud_msnm);
    }
}
