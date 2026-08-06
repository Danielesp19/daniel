<?php

namespace App\Models;

use App\Support\Sitio;
use App\Support\VideoPoster;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Producto extends Model
{
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
                $producto->slug = Str::slug($producto->nombre);
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
     * Un servicio (asesoría, barra para un evento) nunca se agota: se agenda.
     * Por eso todo lo que dependa del inventario pasa antes por esta bandera.
     */
    public function agotado(): bool
    {
        return $this->controla_stock && $this->stock <= 0;
    }

    /**
     * Movimiento de inventario. Devuelve [antes, despues].
     *
     * Se pide la ACCIÓN explícita en vez de aceptar solo un número nuevo:
     * "llegaron 12 bolsas" y "quedan 12 bolsas" son cosas distintas, y quien
     * llame (el panel o el chatbot) tiene que poder expresar cuál de las dos
     * entendió. Vive en el modelo porque tanto la API como el chatbot la usan
     * y el redondeo a cero no puede quedar implementado dos veces.
     *
     * @param  'fijar'|'sumar'|'restar'  $accion
     * @return array{0: int, 1: int}
     */
    public function ajustarStock(string $accion, int $cantidad): array
    {
        $antes = (int) $this->stock;

        $nuevo = match ($accion) {
            'fijar' => $cantidad,
            'sumar' => $antes + $cantidad,
            // Nunca negativo: si alguien resta de más, el piso es cero. El
            // stock es un conteo físico de bolsas en un estante.
            'restar' => max(0, $antes - $cantidad),
            default => throw new \InvalidArgumentException("Acción de stock desconocida: {$accion}"),
        };

        $this->update(['stock' => $nuevo]);

        return [$antes, $nuevo];
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
