<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Hero;
use App\Models\Producto;

class CatalogoController extends Controller
{
    /** Catálogo completo: categorías activas con sus productos visibles. */
    public function index()
    {
        $categorias = Categoria::where('activa', true)
            ->with(['productosVisibles.imagenes'])
            ->orderBy('orden')
            ->get();

        $catalogo = $categorias
            // Una categoría sin productos es ruido: no aparece ni en el
            // catálogo ni en la barra de categorías (que se arma de esta
            // misma lista en el frontend).
            ->filter(fn (Categoria $c) => $c->productosVisibles->isNotEmpty())
            ->map(fn (Categoria $c) => [
                'id' => $c->id,
                'nombre' => $c->nombre,
                'slug' => $c->slug,
                'descripcion' => $c->descripcion,
                'modo_vitrina' => $c->modo_vitrina,
                'productos' => $c->productosVisibles->map(fn ($p) => $this->formato($p))->values(),
            ])
            ->values()
            ->all();

        // Caché HTTP: el catálogo cambia poco. El CDN (s-maxage) absorbe las
        // visitas y el backend recibe ~1 petición por minuto.
        // OJO: por esto mismo el `stock` que viaja aquí puede venir hasta un
        // minuto atrasado. Sirve para pintar el sello de AGOTADO, pero antes
        // de mandar un pedido a WhatsApp el carrito revalida contra
        // /catalogo/stock, que no se cachea.
        return response()->json($catalogo)
            ->header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    }

    public function show(Producto $producto)
    {
        abort_unless($producto->activo, 404);
        $producto->load(['categoria', 'imagenes']);

        return response()->json($this->formato($producto, detalle: true));
    }

    /**
     * Stock en vivo, sin caché: id → unidades disponibles.
     *
     * Es una respuesta diminuta a propósito (solo números), para que el
     * carrito pueda pedirla justo antes de armar el mensaje de WhatsApp sin
     * volver a bajar el catálogo entero.
     */
    public function stock()
    {
        $stock = Producto::where('activo', true)
            ->pluck('stock', 'id')
            ->map(fn ($s) => (int) $s);

        return response()->json($stock)
            ->header('Cache-Control', 'no-store');
    }

    public function hero()
    {
        $heroes = Hero::where('activo', true)
            ->orderBy('orden')
            ->get()
            ->map(fn (Hero $h) => [
                'id' => $h->id,
                'titulo' => $h->titulo,
                'subtitulo' => $h->subtitulo,
                'etiqueta' => $h->etiqueta,
                'imagen_url' => $h->imagen ? asset('storage/'.$h->imagen) : null,
                'cta_texto' => $h->cta_texto,
                'cta_url' => $h->cta_url,
            ]);

        return response()->json($heroes)
            ->header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    }

    private function formato(Producto $p, bool $detalle = false): array
    {
        $datos = [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'slug' => $p->slug,
            'descripcion' => $p->descripcion,
            'precio_cop' => (int) $p->precio_cop,
            'gramos' => (int) $p->gramos,

            // Inventario expuesto en crudo: el frontend necesita el número para
            // topar el selector de cantidad, no solo un booleano de agotado.
            'stock' => (int) $p->stock,
            'agotado' => $p->agotado(),
            'por_acabarse' => $p->porAcabarse(),

            // Ficha técnica — el bloque de datos duros del diseño.
            'tiene_ficha' => $p->tieneFicha(),
            'finca' => $p->finca,
            'productor' => $p->productor,
            'region' => $p->region,
            'altitud_msnm' => $p->altitud_msnm,
            'variedad' => $p->variedad,
            'proceso' => $p->proceso,
            'tueste' => $p->tueste,
            'notas' => $p->notas ?? [],
            'puntaje_sca' => $p->puntaje_sca !== null ? (float) $p->puntaje_sca : null,

            'imagen_url' => $p->imagen ? asset('storage/'.$p->imagen) : null,
            'video_url' => $p->video ? asset('storage/'.$p->video) : null,
            'video_poster_url' => $p->video_poster ? asset('storage/'.$p->video_poster) : null,
            'imagenes_extra' => ($p->relationLoaded('imagenes') ? $p->imagenes : $p->imagenes()->get())
                ->map(fn ($img) => asset('storage/'.$img->ruta))
                ->values()
                ->all(),

            'destacado' => (bool) $p->destacado,
        ];

        if ($detalle) {
            $datos['categoria'] = $p->categoria?->nombre;
        }

        return $datos;
    }
}
