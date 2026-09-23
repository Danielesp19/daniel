<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\Sede;
use App\Support\ImageOptimizer;
use App\Support\Sitio;
use App\Support\VideoOptimizer;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * API de administración del catálogo.
 *
 * La consumen dos clientes distintos y por eso algunas cosas se pueden pedir
 * de dos formas: el panel del frontend, que tiene formularios y manda ids, y
 * el chatbot de WhatsApp, que recibe frases sueltas y manda nombres. El caso
 * más claro es el ajuste de stock, que acepta `sede_id` o `sede`.
 */
class ProductoAdminController extends Controller
{
    /**
     * Lista de productos, opcionalmente filtrada.
     *
     * `?buscar=` hace una búsqueda difusa por nombre, finca y región: el
     * chatbot recibe "quedan bolsas del mirador?" y necesita encontrar el
     * producto sin conocer su id ni su nombre exacto.
     */
    public function index(Request $request)
    {
        $query = Producto::with(['categoria:id,nombre', 'sedes', 'componentes'])->orderBy('categoria_id')->orderBy('orden');

        if ($buscar = trim((string) $request->query('buscar'))) {
            $termino = '%'.str_replace('%', '\%', $buscar).'%';
            $query->where(fn ($q) => $q
                ->where('nombre', 'like', $termino)
                ->orWhere('finca', 'like', $termino)
                ->orWhere('region', 'like', $termino));
        }

        // Los dos filtros de inventario excluyen los servicios: tienen el
        // contador en cero por definición y saldrían todos como "agotados".
        if ($request->boolean('solo_agotados')) {
            $query->where('controla_stock', true)->where('stock', '<=', 0);
        }

        if ($request->boolean('solo_por_acabarse')) {
            // Comparación columna contra columna: el umbral es propio de cada
            // producto, no un número global.
            $query->where('controla_stock', true)
                ->where('stock', '>', 0)
                ->whereColumn('stock', '<=', 'stock_minimo');
        }

        // Las sedes se leen una vez para toda la lista, no una por producto.
        $sedes = Sede::visibles();

        return response()->json($query->get()->map(fn ($p) => $this->formato($p, $sedes)));
    }

    public function show(Producto $producto)
    {
        return response()->json($this->formato($producto->load('categoria:id,nombre', 'sedes', 'componentes')));
    }

    /** Resumen de inventario: lo primero que un admin pregunta por chat. */
    public function resumen()
    {
        // Solo lo que se cuenta: un resumen de inventario con las asesorías
        // adentro no sería un resumen de inventario.
        $productos = Producto::where('activo', true)->where('controla_stock', true)->get();

        return response()->json([
            'total_productos' => $productos->count(),
            'bolsas_en_stock' => (int) $productos->sum('stock'),
            'agotados' => $productos->filter->agotado()
                ->map(fn ($p) => ['id' => $p->id, 'nombre' => $p->nombre])->values(),
            'por_acabarse' => $productos->filter->porAcabarse()
                ->map(fn ($p) => ['id' => $p->id, 'nombre' => $p->nombre, 'stock' => $p->stock])->values(),
        ]);
    }

    /** Alta de producto. Acepta multipart: puede venir con foto y video. */
    public function store(Request $request)
    {
        $datos = $request->validate($this->reglas(nuevo: true));

        // Al final de su sección: uno nuevo no debería colarse de primeras.
        $datos['orden'] ??= (int) Producto::where('categoria_id', $datos['categoria_id'])->max('orden') + 1;

        $producto = Producto::create($this->soloCampos($datos));
        $this->guardarMedios($request, $producto);
        $this->guardarComponentes($request, $producto);
        $this->guardarPiezas($request, $producto);

        return response()->json($this->formato($producto->fresh(['categoria:id,nombre', 'sedes', 'medios', 'componentes', 'piezas'])), 201);
    }

    public function update(Request $request, Producto $producto)
    {
        $datos = $request->validate($this->reglas());

        $producto->update($this->soloCampos($datos));
        $this->guardarMedios($request, $producto);
        $this->guardarComponentes($request, $producto);
        $this->guardarPiezas($request, $producto);

        return response()->json($this->formato($producto->fresh(['categoria:id,nombre', 'sedes', 'medios', 'componentes', 'piezas'])));
    }

    /**
     * Baja de producto.
     *
     * Un producto no vive solo: puede ir dentro de un kit, ser el café que
     * recomienda una receta o el molino que esa receta usa. Todas esas
     * referencias están en cascada, así que borrarlo las limpiaba EN SILENCIO
     * —el kit amanecía con una pieza menos y nadie se enteraba hasta que un
     * cliente abría la ficha—. Ahora se avisa qué se va a romper y se pide
     * confirmación; con `confirmar` se procede.
     *
     * Se lleva también sus archivos: sin esto el disco se llena de fotos y
     * videos de productos que ya nadie puede ver.
     */
    public function destroy(Request $request, Producto $producto)
    {
        $ataduras = $this->dondeSeUsa($producto);

        if ($ataduras !== [] && ! $request->boolean('confirmar')) {
            return response()->json([
                'error' => "«{$producto->nombre}» ".$this->frase($ataduras)
                    .' Si lo borras, desaparece de ahí también.',
                'necesita_confirmacion' => true,
                'usos' => $ataduras,
            ], 422);
        }

        foreach ($producto->medios as $medio) {
            Storage::disk('public')->delete($medio->ruta);
            if ($medio->poster) {
                Storage::disk('public')->delete($medio->poster);
            }
        }

        // Las piezas se van solas por la cascada, pero sus imágenes no: sin
        // esto quedaban ocupando disco para siempre, sin fila que las nombre.
        foreach ($producto->piezas as $pieza) {
            if ($pieza->imagen) {
                Storage::disk('public')->delete($pieza->imagen);
            }
        }

        $producto->delete();

        return response()->json(null, 204);
    }

    /**
     * Dónde está enganchado este producto, para poder avisarlo por su nombre.
     *
     * Devuelve algo como ['kits' => ['Kit V60'], 'recetas' => ['Chemex']].
     * Vacío si no lo usa nadie.
     *
     * @return array<string, array<int, string>>
     */
    private function dondeSeUsa(Producto $producto): array
    {
        $usos = [];

        // Kits que lo traen adentro. La relación inversa de `componentes`.
        $kits = Producto::whereHas(
            'componentes',
            fn ($q) => $q->where('producto_componentes.componente_id', $producto->id),
        )->pluck('nombre')->all();
        if ($kits !== []) {
            $usos['kits'] = $kits;
        }

        // Recetas que lo recomiendan como el café a usar. Esta referencia se
        // pone en null al borrar, así que la receta sobrevive pero se queda
        // sin su café.
        $recetas = Receta::where('producto_id', $producto->id)->pluck('nombre')->all();
        if ($recetas !== []) {
            $usos['recetas'] = $recetas;
        }

        // Recetas que lo listan como artefacto (el molino, la prensa).
        $artefactoDe = Receta::whereHas(
            'artefactos',
            fn ($q) => $q->where('receta_artefactos.producto_id', $producto->id),
        )->pluck('nombre')->all();
        if ($artefactoDe !== []) {
            $usos['recetas_que_lo_usan'] = $artefactoDe;
        }

        return $usos;
    }

    /**
     * Arma la frase del aviso a partir de los usos encontrados.
     *
     * En castellano corrido y no como una lista de claves: quien administra
     * lee "está dentro del kit «Kit V60»", no "usos.kits: [Kit V60]".
     *
     * @param  array<string, array<int, string>>  $usos
     */
    private function frase(array $usos): string
    {
        $partes = [];

        $comillas = static fn (array $nombres) => '«'.implode('», «', $nombres).'»';

        if (isset($usos['kits'])) {
            $partes[] = (count($usos['kits']) === 1 ? 'está dentro del kit ' : 'está dentro de los kits ')
                .$comillas($usos['kits']);
        }
        if (isset($usos['recetas'])) {
            $partes[] = 'es el café de la receta '.$comillas($usos['recetas']);
        }
        if (isset($usos['recetas_que_lo_usan'])) {
            $partes[] = 'lo usa la receta '.$comillas($usos['recetas_que_lo_usan']);
        }

        // "a, b y c" — con la y antes del último, como se dice.
        $ultimo = array_pop($partes);

        return ($partes === [] ? $ultimo : implode(', ', $partes).' y '.$ultimo).'.';
    }

    /** Reordena los productos de una sección: llegan los ids en el orden deseado. */
    public function reordenar(Request $request)
    {
        $datos = $request->validate([
            'ids' => 'required|array',
            'ids.*' => ['integer', Rule::exists('productos', 'id')],
        ]);

        foreach ($datos['ids'] as $posicion => $id) {
            Producto::where('id', $id)->update(['orden' => $posicion]);
        }

        // update() de constructor no dispara eventos, así que el aviso al sitio
        // va a mano: si no, el orden nuevo espera al minuto de caché.
        Sitio::revalidar();

        return response()->json(['ok' => true]);
    }

    /**
     * Las reglas de validación de un producto.
     *
     * `stock` NO está a propósito: es la suma de las sedes y escribirlo directo
     * descuadraría el desglose. Para mover unidades está
     * PATCH /productos/{id}/stock, que sí pide la sede.
     *
     * @return array<string, mixed>
     */
    private function reglas(bool $nuevo = false): array
    {
        $obligatorio = $nuevo ? 'required' : 'sometimes';

        return [
            'nombre' => $obligatorio.'|string|max:255',
            'categoria_id' => [$nuevo ? 'required' : 'sometimes', Rule::exists('categorias', 'id')],
            'precio_cop' => $obligatorio.'|integer|min:0',
            'descripcion' => 'sometimes|nullable|string',
            'stock_minimo' => 'sometimes|integer|min:0',
            'gramos' => 'sometimes|integer|min:0',
            'controla_stock' => 'sometimes|boolean',
            'es_cafe' => 'sometimes|boolean',
            'es_kit' => 'sometimes|boolean',
            'piezas' => 'sometimes|nullable|array|max:12',
            'piezas.*.nombre' => 'required_with:piezas.*|string|max:255',
            'piezas.*.imagen' => 'sometimes|image|max:12288',
            'piezas.*.imagen_actual' => 'sometimes|nullable|string',
            'finca' => 'sometimes|nullable|string|max:255',
            'productor' => 'sometimes|nullable|string|max:255',
            'region' => 'sometimes|nullable|string|max:255',
            'altitud_msnm' => 'sometimes|nullable|integer|min:0|max:4000',
            'variedad' => 'sometimes|nullable|string|max:255',
            'proceso' => 'sometimes|nullable|string|max:255',
            'tueste' => 'sometimes|nullable|string|max:255',
            'notas' => 'sometimes|nullable|array|max:6',
            'notas.*' => 'string|max:40',
            'puntaje_sca' => 'sometimes|nullable|numeric|min:0|max:100',
            'activo' => 'sometimes|boolean',
            'destacado' => 'sometimes|boolean',
            'orden' => 'sometimes|integer|min:0',

            // Los productos que incluye, si es un kit.
            'componentes' => 'sometimes|nullable|array|max:12',
            'componentes.*' => ['integer', Rule::exists('productos', 'id')],

            // Medios. Se validan aquí pero no se asignan con fill(): los
            // procesa guardarMedios(), que optimiza y guarda la ruta.
            'imagen' => 'sometimes|nullable|image|max:12288',
            'video' => 'sometimes|nullable|file|mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
            'medios' => 'sometimes|nullable|array|max:8',
            'medios.*.id' => 'sometimes|nullable|integer',
            'medios.*.archivo' => 'sometimes|file|mimetypes:image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/webm|max:131072',
        ];
    }

    /** Los campos que sí van al modelo, sin los de archivos. */
    private function soloCampos(array $datos): array
    {
        return array_diff_key($datos, array_flip([
            'imagen', 'video', 'medios', 'componentes', 'piezas',
        ]));
    }

    /**
     * Qué trae el kit adentro.
     *
     * Solo se toca si el campo viene: sin esto, guardar un producto desde otro
     * sitio le vaciaría los componentes a un kit sin querer.
     *
     * Un kit no puede contenerse a sí mismo —se caería en un bucle al pintar la
     * ficha— así que ese id se filtra en vez de rechazar el guardado entero por
     * un componente mal elegido.
     */
    private function guardarComponentes(Request $request, Producto $producto): void
    {
        if (! $request->has('componentes')) {
            return;
        }

        $ids = collect($request->input('componentes', []))
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->reject(fn (int $id) => $id === $producto->id)
            ->unique()
            ->values();

        $producto->componentes()->sync(
            $ids->mapWithKeys(fn (int $id, int $i) => [$id => ['orden' => $i]])->all()
        );
    }

    /**
     * Guarda foto, video y galería.
     *
     * Reutiliza los optimizadores que ya existían: la imagen sale en WebP
     * redimensionada y el video recomprimido sin audio. El póster del video lo
     * genera solo el modelo al detectar que cambió (ver Producto::booted).
     */
    private function guardarMedios(Request $request, Producto $producto): void
    {
        // Sin el campo, los medios se quedan como están: guardar desde otro
        // sitio —el chatbot cambiando un precio— no puede borrar la galería.
        //
        // Se pregunta por los DOS lados: una fila nueva viaja solo como
        // archivo, y `has()` mira únicamente la entrada de texto. Preguntando
        // solo por ahí, subir fotos a un producto sin fotos no hacía nada.
        if (! $request->has('medios') && ! $request->hasFile('medios')) {
            $this->subirSueltos($request, $producto);

            return;
        }

        $entrantes = $request->input('medios', []) ?: [];
        $archivos = $request->file('medios', []) ?: [];

        // Las posiciones salen de la unión de los dos: las filas que ya
        // existían llegan como texto (su id) y las nuevas como archivo. El
        // orden de la lista es el orden de las posiciones.
        $posiciones = array_unique(array_merge(array_keys($entrantes), array_keys($archivos)));
        sort($posiciones, SORT_NUMERIC);

        $sobreviven = [];

        foreach ($posiciones as $i => $posicion) {
            $fila = $entrantes[$posicion] ?? [];
            $archivo = $archivos[$posicion]['archivo'] ?? null;

            // Fila con archivo nuevo: se sube y entra en esta posición.
            if ($archivo) {
                $esVideo = str_starts_with((string) $archivo->getMimeType(), 'video/');
                $medio = $producto->medios()->create([
                    'tipo' => $esVideo ? 'video' : 'imagen',
                    'ruta' => $esVideo
                        ? VideoOptimizer::store($archivo, 'productos')
                        : ImageOptimizer::store($archivo, 'productos'),
                    'orden' => $i,
                ]);
                $sobreviven[] = $medio->id;

                continue;
            }

            // Fila que ya existía: solo cambia de posición.
            $id = (int) ($fila['id'] ?? 0);
            if ($id && $medio = $producto->medios()->find($id)) {
                $medio->update(['orden' => $i]);
                $sobreviven[] = $medio->id;
            }
        }

        // Lo que no viene en la lista se borró desde el panel: se va con su
        // archivo, que si no queda ocupando disco para siempre.
        foreach ($producto->medios()->whereNotIn('id', $sobreviven ?: [0])->get() as $sobra) {
            Storage::disk('public')->delete($sobra->ruta);
            if ($sobra->poster) {
                Storage::disk('public')->delete($sobra->poster);
            }
            $sobra->delete();
        }
    }

    /**
     * Las piezas del kit: las que solo existen dentro de él.
     *
     * Se borran y se vuelven a crear en cada guardado —son pocas y sin datos
     * propios que perder— pero conservando la foto de las que ya la tenían: sin
     * eso, cambiarle el nombre a una pieza le borraba la imagen a todas.
     */
    private function guardarPiezas(Request $request, Producto $producto): void
    {
        if (! $request->has('piezas') && ! $request->hasFile('piezas')) {
            return;
        }

        $entrantes = $request->input('piezas', []) ?: [];
        $archivos = $request->file('piezas', []) ?: [];
        $filas = [];
        $conservadas = [];

        foreach (array_values($entrantes) as $i => $pieza) {
            $nombre = trim((string) ($pieza['nombre'] ?? ''));
            if ($nombre === '') {
                continue;
            }

            $imagen = $pieza['imagen_actual'] ?? null;
            if ($archivo = $archivos[$i]['imagen'] ?? null) {
                $imagen = ImageOptimizer::store($archivo, 'productos');
            }

            if ($imagen) {
                $conservadas[] = $imagen;
            }
            $filas[] = ['nombre' => $nombre, 'imagen' => $imagen, 'orden' => count($filas)];
        }

        // Las fotos que ya no usa ninguna pieza se van del disco.
        foreach ($producto->piezas as $vieja) {
            if ($vieja->imagen && ! in_array($vieja->imagen, $conservadas, true)) {
                Storage::disk('public')->delete($vieja->imagen);
            }
        }

        $producto->piezas()->delete();
        $producto->piezas()->createMany($filas);
    }

    /**
     * La vía de antes, para quien manda `imagen` o `video` sueltos: el chatbot
     * le pone foto a un producto sin saber nada de listas ni de orden.
     */
    private function subirSueltos(Request $request, Producto $producto): void
    {
        foreach (['imagen' => 'imagen', 'video' => 'video'] as $campo => $tipo) {
            if (! $request->hasFile($campo)) {
                continue;
            }

            $archivo = $request->file($campo);
            $producto->medios()->create([
                'tipo' => $tipo,
                'ruta' => $tipo === 'video'
                    ? VideoOptimizer::store($archivo, 'productos')
                    : ImageOptimizer::store($archivo, 'productos'),
                // Una foto suelta manda: se pone de primera y pasa a ser la
                // portada, que es lo que espera quien la sube desde WhatsApp.
                'orden' => $tipo === 'imagen' ? -1 : (int) $producto->medios()->max('orden') + 1,
            ]);
        }

        // Se renumera para que no queden huecos ni negativos.
        foreach ($producto->medios()->orderBy('orden')->get()->values() as $i => $m) {
            $m->update(['orden' => $i]);
        }
    }

    /**
     * Movimiento de inventario en una sede. La lógica vive en
     * Producto::ajustarStockSede().
     *
     * La sede se pide POR NOMBRE y no por id: quien llama es el chatbot, y
     * quien le habla al chatbot escribe "en el centro", no "sede_id 2". Cuando
     * el nombre no alcanza para decidir, esto responde 422 con la lista de
     * nombres para que el asistente vuelva a preguntar — mover bolsas en el
     * estante equivocado es peor que preguntar una vez más.
     */
    public function stock(Request $request, Producto $producto)
    {
        $datos = $request->validate([
            'accion' => ['required', Rule::in(['fijar', 'sumar', 'restar'])],
            'cantidad' => 'required|integer|min:0|max:100000',
            // Dos formas de decir la misma sede: por nombre la usa el chatbot,
            // que recibe "en el centro"; por id la usa el panel, que tiene un
            // selector y no necesita adivinar.
            'sede' => 'sometimes|nullable|string|max:255',
            'sede_id' => ['sometimes', 'nullable', 'integer', Rule::exists('sedes', 'id')],
        ]);

        if (! $producto->controla_stock) {
            return response()->json([
                'error' => 'Este producto es un servicio: se agenda, no tiene inventario que ajustar.',
            ], 422);
        }

        $sede = isset($datos['sede_id'])
            ? Sede::findOrFail($datos['sede_id'])
            : $this->resolverSede($datos['sede'] ?? null);

        // resolverSede() devuelve la respuesta de error ya armada cuando no
        // puede decidir sola.
        if (! $sede instanceof Sede) {
            return $sede;
        }

        [$antes, $nuevo, $total] = $producto->ajustarStockSede($sede, $datos['accion'], $datos['cantidad']);

        return response()->json([
            'id' => $producto->id,
            'nombre' => $producto->nombre,
            'sede' => $sede->nombre,
            'antes' => $antes,
            'despues' => $nuevo,
            // El total de todas las sedes: es lo que ve el cliente en el sello
            // del catálogo, así que el chatbot tiene que poder contarlo también.
            'total' => $total,
            'agotado_en_sede' => $nuevo <= 0,
            'agotado' => $total <= 0,
        ]);
    }

    /**
     * Traduce el nombre de sede que llegó por chat a una sede de verdad.
     *
     * Devuelve la Sede, o una respuesta 422 lista para devolver cuando hay que
     * volver a preguntar.
     */
    private function resolverSede(?string $nombre): Sede|JsonResponse
    {
        $disponibles = Sede::visibles();

        if ($disponibles->isEmpty()) {
            return response()->json([
                'error' => 'No hay ninguna sede activa: hay que crear una en el panel antes de mover inventario.',
            ], 422);
        }

        // Con una sola sede no hay nada que preguntar, y obligar a nombrarla
        // volvería insoportable el chat de una tienda de un solo local.
        if ($disponibles->count() === 1 && ! $nombre) {
            return $disponibles->first();
        }

        if (! $nombre) {
            return response()->json([
                'error' => 'Falta decir en qué sede. Pregúntale al usuario en cuál y vuelve a intentar.',
                'necesita_sede' => true,
                'sedes' => $disponibles->pluck('nombre')->all(),
            ], 422);
        }

        $encontradas = Sede::buscarPorNombre($nombre);

        if ($encontradas->isEmpty()) {
            return response()->json([
                'error' => "No existe ninguna sede que se parezca a «{$nombre}».",
                'necesita_sede' => true,
                'sedes' => $disponibles->pluck('nombre')->all(),
            ], 422);
        }

        if ($encontradas->count() > 1) {
            return response()->json([
                'error' => "«{$nombre}» calza con más de una sede. Pregúntale al usuario a cuál se refiere.",
                'necesita_sede' => true,
                'sedes' => $encontradas->pluck('nombre')->all(),
            ], 422);
        }

        return $encontradas->first();
    }

    private function formato(Producto $p, ?EloquentCollection $sedes = null): array
    {
        return [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'categoria' => $p->categoria?->nombre,
            'categoria_id' => $p->categoria_id,
            'descripcion' => $p->descripcion,
            'precio_cop' => (int) $p->precio_cop,
            'gramos' => (int) $p->gramos,
            'controla_stock' => (bool) $p->controla_stock,
            'es_cafe' => (bool) $p->es_cafe,
            'es_kit' => $p->esKit(),
            'piezas' => ($p->relationLoaded('piezas') ? $p->piezas : $p->piezas()->get())
                ->map(fn ($z) => [
                    'id' => $z->id,
                    'nombre' => $z->nombre,
                    'imagen' => $z->imagen,
                    'imagen_url' => $z->imagenUrl(),
                ])
                ->values()
                ->all(),
            // Total de todas las sedes. Es de solo lectura: sale de sumarlas.
            'stock' => (int) $p->stock,
            'stock_minimo' => (int) $p->stock_minimo,
            'agotado' => $p->agotado(),
            'por_acabarse' => $p->porAcabarse(),
            // El desglose, para que el chatbot pueda responder "quedan dos,
            // pero las dos están en el Norte" en vez de solo el total.
            'stock_por_sede' => $p->controla_stock
                ? $p->disponibilidad($sedes)->map(fn (array $f) => [
                    'sede' => $f['sede']->nombre,
                    'stock' => $f['stock'],
                ])->all()
                : [],
            'finca' => $p->finca,
            'productor' => $p->productor,
            'region' => $p->region,
            'altitud_msnm' => $p->altitud_msnm,
            'variedad' => $p->variedad,
            'proceso' => $p->proceso,
            'tueste' => $p->tueste,
            'notas' => $p->notas ?? [],
            'puntaje_sca' => $p->puntaje_sca !== null ? (float) $p->puntaje_sca : null,
            'activo' => (bool) $p->activo,
            'destacado' => (bool) $p->destacado,
            'orden' => (int) $p->orden,

            // El panel necesita ver lo que ya está subido para poder
            // reemplazarlo o quitarlo.
            // La foto que representa al producto en las listas del panel.
            'imagen_url' => $p->fotoPrincipal(),
            'componentes' => ($p->relationLoaded('componentes') ? $p->componentes : $p->componentes()->get())
                ->map(fn ($c) => ['id' => $c->id, 'nombre' => $c->nombre])
                ->values()
                ->all(),
            // La galería completa y en orden: es lo que edita el formulario.
            'medios' => $p->medioLista()->map(fn ($m) => [
                'id' => $m->id,
                'tipo' => $m->tipo,
                'url' => $m->url(),
                'poster_url' => $m->posterUrl(),
            ])->values()->all(),
        ];
    }
}
