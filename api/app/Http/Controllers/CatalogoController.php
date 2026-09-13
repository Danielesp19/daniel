<?php

namespace App\Http\Controllers;

use App\Models\Aviso;
use App\Models\Categoria;
use App\Models\Pregunta;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\Sede;
use Illuminate\Database\Eloquent\Collection;

class CatalogoController extends Controller
{
    /** Catálogo completo: categorías activas con sus productos visibles. */
    public function index()
    {
        // Solo las secciones: una subcategoría no es una sección del catálogo,
        // viaja adentro de la suya. Se piden los productos de las dos —los que
        // cuelgan directo de la sección y los de cada subcategoría— en la misma
        // consulta.
        $conProductos = ['productosVisibles.medios', 'productosVisibles.sedes', 'productosVisibles.componentes', 'productosVisibles.piezas'];

        $categorias = Categoria::where('activa', true)
            ->secciones()
            ->with(array_merge($conProductos, array_map(
                fn (string $r) => 'subcategoriasVisibles.'.$r,
                $conProductos
            )))
            ->orderBy('orden')
            ->get();

        // Las sedes se leen UNA vez y viajan a cada producto. Sin esto, pintar
        // el catálogo entero dispararía la misma consulta de sedes por
        // producto — con cuarenta productos son cuarenta consultas idénticas.
        $sedes = Sede::visibles();

        $catalogo = $categorias
            // Una sección vacía es ruido: no aparece ni en el catálogo ni en la
            // barra de categorías (que se arma de esta misma lista en el
            // frontend). Vacía es sin productos propios Y sin subcategoría que
            // tenga alguno.
            ->map(fn (Categoria $c) => [
                'id' => $c->id,
                'nombre' => $c->nombre,
                'slug' => $c->slug,
                'descripcion' => $c->descripcion,
                'modo_vitrina' => $c->modo_vitrina,
                'productos' => $c->productosVisibles->map(fn ($p) => $this->formato($p, sedes: $sedes))->values(),

                // Cada subcategoría es un estante con título dentro de la
                // sección. Las que quedaron sin productos no viajan: un título
                // suelto sin nada debajo se lee como que algo falló.
                'subcategorias' => $c->subcategoriasVisibles
                    ->filter(fn (Categoria $sub) => $sub->productosVisibles->isNotEmpty())
                    ->map(fn (Categoria $sub) => [
                        'id' => $sub->id,
                        'nombre' => $sub->nombre,
                        'slug' => $sub->slug,
                        'descripcion' => $sub->descripcion,
                        'productos' => $sub->productosVisibles->map(fn ($p) => $this->formato($p, sedes: $sedes))->values(),
                    ])
                    ->values(),
            ])
            ->filter(fn (array $c) => $c['productos']->isNotEmpty() || $c['subcategorias']->isNotEmpty())
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
        $producto->load(['categoria', 'medios', 'sedes', 'componentes', 'piezas']);

        return response()->json($this->formato($producto, detalle: true));
    }

    /**
     * Las sedes de la tienda con sus datos de contacto.
     *
     * Existe aparte del catálogo porque sirve para una página de "dónde
     * estamos" sin tener que bajar todos los productos para sacar la lista.
     */
    public function sedes()
    {
        $sedes = Sede::visibles()->map(fn (Sede $s) => $this->formatoSede($s));

        return response()->json($sedes)
            ->header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
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
        // Solo lo que se cuenta. Los servicios no salen aquí: no tienen
        // inventario que revalidar, y el carrito los deja pasar sin mirar
        // este mapa.
        $stock = Producto::where('activo', true)
            ->where('controla_stock', true)
            ->pluck('stock', 'id')
            ->map(fn ($s) => (int) $s);

        return response()->json($stock)
            ->header('Cache-Control', 'no-store');
    }

    /** El aviso de arriba del sitio, si hay uno encendido. */
    public function aviso()
    {
        $aviso = Aviso::vigente();

        return response()->json($aviso ? [
            'id' => $aviso->id,
            'etiqueta' => $aviso->etiqueta,
            'titulo' => $aviso->titulo,
            'texto' => $aviso->texto,
            'cta_texto' => $aviso->tieneBoton() ? $aviso->cta_texto : null,
            'cta_url' => $aviso->tieneBoton() ? $aviso->cta_url : null,
        ] : null)
            ->header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    }

    /** Las recetas con sus pasos, para prepararlas en casa. */
    public function recetas()
    {
        $recetas = Receta::visibles()
            ->with(['producto:id,nombre,slug', 'pasos', 'artefactos'])
            ->get()
            ->map(fn (Receta $r) => [
                'id' => $r->id,
                'nombre' => $r->nombre,
                'slug' => $r->slug,
                'metodo' => $r->metodo,
                'resumen' => $r->resumen,
                'detalle' => $r->detalle,
                'cafe_g' => $r->cafe_g,
                'agua_g' => $r->agua_g,
                'ratio' => $r->ratio(),
                // La molienda va en micras Y con nombre: el número es lo que se
                // dibuja a tamaño real, el nombre es lo que se lee.
                'molienda_micras' => $r->molienda_micras,
                'molienda' => $r->moliendaNombre(),
                'duracion_seg' => $r->duracion_seg,
                'duracion' => $r->duracionLegible(),
                'ingredientes' => $r->ingredientes ?? [],

                // Cada paso con su imagen y su reloj. El reloj va en el paso y
                // no en la receta: es donde uno lo va a tocar.
                'pasos' => $r->pasos->map(fn ($paso) => [
                    'id' => $paso->id,
                    'texto' => $paso->texto,
                    'imagen_url' => $paso->imagen ? asset('storage/'.$paso->imagen) : null,
                    'segundos' => $paso->segundos,
                    'etiqueta' => $paso->temporizador_etiqueta,
                ])->values()->all(),

                // Los artefactos que usa. Solo los que están a la venta: uno
                // agotado o escondido no se puede recomendar.
                'artefactos' => $r->artefactos->where('activo', true)->map(fn ($a) => [
                    'id' => $a->id,
                    'nombre' => $a->nombre,
                    'precio_cop' => (int) $a->precio_cop,
                    'agotado' => $a->agotado(),
                    'imagen_url' => $a->imagen ? asset('storage/'.$a->imagen) : null,
                ])->values()->all(),

                // El video se ve de YouTube: de ahí sale también la miniatura,
                // así que una receta con video no necesita foto propia.
                'youtube_id' => $r->youtubeId(),
                'imagen_url' => $r->imagen ? asset('storage/'.$r->imagen) : null,
                // El café recomendado viaja con su slug para poder enlazarlo
                // con la ficha del catálogo.
                'producto' => $r->producto ? ['id' => $r->producto->id, 'nombre' => $r->producto->nombre] : null,
            ]);

        return response()->json($recetas)
            ->header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    }

    /** Las preguntas frecuentes. */
    public function preguntas()
    {
        $preguntas = Pregunta::visibles()->get()
            ->map(fn (Pregunta $p) => [
                'id' => $p->id,
                'pregunta' => $p->pregunta,
                'respuesta' => $p->respuesta,
            ]);

        return response()->json($preguntas)
            ->header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    }

    private function formato(Producto $p, bool $detalle = false, ?Collection $sedes = null): array
    {
        $medios = $p->medioLista();
        $video = $medios->firstWhere('tipo', 'video');

        $datos = [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'slug' => $p->slug,
            'descripcion' => $p->descripcion,
            'precio_cop' => (int) $p->precio_cop,
            'gramos' => (int) $p->gramos,

            // Inventario expuesto en crudo: el frontend necesita el número para
            // topar el selector de cantidad, no solo un booleano de agotado.
            // `controla_stock` en false = servicio: no se cuenta ni se agota.
            'controla_stock' => (bool) $p->controla_stock,
            'es_cafe' => (bool) $p->es_cafe,
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

            // Los medios en su orden: la primera fila es la portada, sea foto
            // o video. Es lo único que hay que leer para pintar una galería.
            'medios' => $medios->map(fn ($m) => [
                'id' => $m->id,
                'tipo' => $m->tipo,
                'url' => $m->url(),
                'poster_url' => $m->posterUrl(),
            ])->values()->all(),

            // Y los mismos datos en la forma de antes, para lo que solo
            // necesita "una foto" o "el video": la tarjeta del catálogo, el
            // mosaico del kit, la banda de servicios.
            'imagen_url' => $p->fotoPrincipal(),
            'video_url' => $video?->url(),
            'video_poster_url' => $video?->posterUrl(),
            'imagenes_extra' => $medios->where('tipo', 'imagen')->skip(1)
                ->map(fn ($m) => $m->url())
                ->values()
                ->all(),

            'destacado' => (bool) $p->destacado,
            'es_kit' => $p->esKit(),

            // Lo que trae adentro, si es un kit. Vacío en todo lo demás, que es
            // la inmensa mayoría: el frontend pregunta por el largo.
            'componentes' => ($p->relationLoaded('componentes') ? $p->componentes : $p->componentes()->get())
                ->map(fn ($c) => ['id' => $c->id, 'nombre' => $c->nombre, 'slug' => $c->slug])
                ->values()
                ->all(),
            // Las piezas que solo existen dentro del kit: van junto a los
            // componentes en la lista de "qué incluye", porque para quien
            // compra son lo mismo — cosas que vienen en la caja.
            'piezas' => ($p->relationLoaded('piezas') ? $p->piezas : $p->piezas()->get())
                ->map(fn ($z) => ['id' => $z->id, 'nombre' => $z->nombre, 'imagen_url' => $z->imagenUrl()])
                ->values()
                ->all(),

            // Dónde hay y dónde no. Los servicios no llevan desglose: no se
            // guardan en ningún estante, y una lista de sedes en cero debajo de
            // una asesoría se leería como que está agotada en todas partes.
            'sedes' => $p->controla_stock
                ? $p->disponibilidad($sedes)
                    ->map(fn (array $fila) => $this->formatoSede($fila['sede'], $fila['stock']))
                    ->all()
                : [],
        ];

        if ($detalle) {
            $datos['categoria'] = $p->categoria?->nombre;
        }

        return $datos;
    }

    /**
     * Una sede como la ve el público. Cuando viaja dentro de un producto lleva
     * además cuántas bolsas de ESE producto hay en ELLA.
     *
     * SIN teléfono ni WhatsApp propios: todo el contacto pasa por la línea de
     * Daniel, y dar tres números distintos solo lograba que el pedido llegara
     * al lugar equivocado. Las columnas siguen en la base por si algún día una
     * sede necesita el suyo; simplemente no se publican.
     */
    private function formatoSede(Sede $s, ?int $stock = null): array
    {
        $datos = [
            'id' => $s->id,
            'nombre' => $s->nombre,
            'slug' => $s->slug,
            'direccion' => $s->direccion,
            'ciudad' => $s->ciudad,
            'barrio' => $s->barrio,
            'horario' => $s->horario,
        ];

        if ($stock !== null) {
            $datos['stock'] = $stock;
            $datos['agotado'] = $stock <= 0;
        }

        return $datos;
    }
}
