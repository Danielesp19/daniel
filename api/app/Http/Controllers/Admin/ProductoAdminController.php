<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producto;
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
        $query = Producto::with(['categoria:id,nombre', 'sedes'])->orderBy('categoria_id')->orderBy('orden');

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
        return response()->json($this->formato($producto->load('categoria:id,nombre', 'sedes')));
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

        return response()->json($this->formato($producto->fresh(['categoria:id,nombre', 'sedes', 'imagenes'])), 201);
    }

    public function update(Request $request, Producto $producto)
    {
        $datos = $request->validate($this->reglas());

        $producto->update($this->soloCampos($datos));
        $this->guardarMedios($request, $producto);

        return response()->json($this->formato($producto->fresh(['categoria:id,nombre', 'sedes', 'imagenes'])));
    }

    /**
     * Baja de producto. Se lleva también sus archivos: sin esto el disco se
     * llena de fotos y videos de productos que ya nadie puede ver.
     */
    public function destroy(Producto $producto)
    {
        foreach ([$producto->imagen, $producto->video, $producto->video_poster] as $ruta) {
            if ($ruta) {
                Storage::disk('public')->delete($ruta);
            }
        }

        foreach ($producto->imagenes as $imagen) {
            Storage::disk('public')->delete($imagen->ruta);
        }

        $producto->delete();

        return response()->json(null, 204);
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

    /** Borra una de las fotos extra de la galería. */
    public function borrarImagen(Producto $producto, int $imagen)
    {
        $foto = $producto->imagenes()->findOrFail($imagen);

        Storage::disk('public')->delete($foto->ruta);
        $foto->delete();

        return response()->json(null, 204);
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

            // Medios. Se validan aquí pero no se asignan con fill(): los
            // procesa guardarMedios(), que optimiza y guarda la ruta.
            'imagen' => 'sometimes|nullable|image|max:12288',
            'video' => 'sometimes|nullable|file|mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
            'imagenes_extra' => 'sometimes|array|max:6',
            'imagenes_extra.*' => 'image|max:12288',
            'quitar_imagen' => 'sometimes|boolean',
            'quitar_video' => 'sometimes|boolean',
        ];
    }

    /** Los campos que sí van al modelo, sin los de archivos. */
    private function soloCampos(array $datos): array
    {
        return array_diff_key($datos, array_flip([
            'imagen', 'video', 'imagenes_extra', 'quitar_imagen', 'quitar_video',
        ]));
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
        $cambios = [];

        if ($request->boolean('quitar_imagen') && $producto->imagen) {
            Storage::disk('public')->delete($producto->imagen);
            $cambios['imagen'] = null;
        }

        if ($request->hasFile('imagen')) {
            if ($producto->imagen) {
                Storage::disk('public')->delete($producto->imagen);
            }
            $cambios['imagen'] = ImageOptimizer::store($request->file('imagen'), 'productos');
        }

        if ($request->boolean('quitar_video') && $producto->video) {
            Storage::disk('public')->delete($producto->video);
            $cambios['video'] = null;
        }

        if ($request->hasFile('video')) {
            if ($producto->video) {
                Storage::disk('public')->delete($producto->video);
            }
            $cambios['video'] = VideoOptimizer::store($request->file('video'), 'productos');
        }

        if ($cambios) {
            $producto->update($cambios);
        }

        foreach ((array) $request->file('imagenes_extra', []) as $archivo) {
            $producto->imagenes()->create([
                'ruta' => ImageOptimizer::store($archivo, 'productos'),
                'orden' => (int) $producto->imagenes()->max('orden') + 1,
            ]);
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
            'imagen_url' => $p->imagen ? asset('storage/'.$p->imagen) : null,
            'video_url' => $p->video ? asset('storage/'.$p->video) : null,
            'imagenes_extra' => ($p->relationLoaded('imagenes') ? $p->imagenes : $p->imagenes()->get())
                ->map(fn ($img) => ['id' => $img->id, 'url' => asset('storage/'.$img->ruta)])
                ->values()
                ->all(),
        ];
    }
}
