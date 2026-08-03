<?php

namespace App\Models;

use App\Support\VideoPoster;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Producto extends Model
{
    protected $table = 'productos';

    protected $fillable = [
        'categoria_id', 'nombre', 'slug', 'descripcion', 'precio_cop',
        'stock', 'stock_minimo', 'gramos',
        'finca', 'productor', 'region', 'altitud_msnm', 'variedad', 'proceso',
        'tueste', 'notas', 'puntaje_sca',
        'imagen', 'video', 'video_poster',
        'activo', 'destacado', 'orden',
    ];

    protected $casts = [
        // Entero, no decimal: los precios son pesos colombianos redondos.
        'precio_cop' => 'integer',
        'stock' => 'integer',
        'stock_minimo' => 'integer',
        'gramos' => 'integer',
        'altitud_msnm' => 'integer',
        'puntaje_sca' => 'decimal:2',
        'notas' => 'array',
        'activo' => 'boolean',
        'destacado' => 'boolean',
        'orden' => 'integer',
    ];

    protected static function booted(): void
    {
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

    public function agotado(): bool
    {
        return $this->stock <= 0;
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
        return $this->stock > 0 && $this->stock <= $this->stock_minimo;
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
