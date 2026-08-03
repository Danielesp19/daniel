<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * API de administración del catálogo.
 *
 * La carga de fotos y videos vive en el panel de Filament (/admin), que ya
 * resuelve subidas y recortes mucho mejor de lo que valdría la pena rehacer
 * a mano. Esta API existe para lo que el panel NO cubre bien: que el chatbot
 * consulte y corrija el inventario desde un mensaje, sin abrir el navegador.
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
        $query = Producto::with('categoria:id,nombre')->orderBy('categoria_id')->orderBy('orden');

        if ($buscar = trim((string) $request->query('buscar'))) {
            $termino = '%'.str_replace('%', '\%', $buscar).'%';
            $query->where(fn ($q) => $q
                ->where('nombre', 'like', $termino)
                ->orWhere('finca', 'like', $termino)
                ->orWhere('region', 'like', $termino));
        }

        if ($request->boolean('solo_agotados')) {
            $query->where('stock', '<=', 0);
        }

        if ($request->boolean('solo_por_acabarse')) {
            // Comparación columna contra columna: el umbral es propio de cada
            // producto, no un número global.
            $query->where('stock', '>', 0)->whereColumn('stock', '<=', 'stock_minimo');
        }

        return response()->json($query->get()->map(fn ($p) => $this->formato($p)));
    }

    public function show(Producto $producto)
    {
        return response()->json($this->formato($producto->load('categoria:id,nombre')));
    }

    /** Resumen de inventario: lo primero que un admin pregunta por chat. */
    public function resumen()
    {
        $productos = Producto::where('activo', true)->get();

        return response()->json([
            'total_productos' => $productos->count(),
            'bolsas_en_stock' => (int) $productos->sum('stock'),
            'agotados' => $productos->filter->agotado()
                ->map(fn ($p) => ['id' => $p->id, 'nombre' => $p->nombre])->values(),
            'por_acabarse' => $productos->filter->porAcabarse()
                ->map(fn ($p) => ['id' => $p->id, 'nombre' => $p->nombre, 'stock' => $p->stock])->values(),
        ]);
    }

    public function update(Request $request, Producto $producto)
    {
        $datos = $request->validate([
            'nombre' => 'sometimes|string|max:255',
            'descripcion' => 'sometimes|nullable|string',
            'precio_cop' => 'sometimes|integer|min:0',
            'stock' => 'sometimes|integer|min:0',
            'stock_minimo' => 'sometimes|integer|min:0',
            'gramos' => 'sometimes|integer|min:1',
            'categoria_id' => ['sometimes', Rule::exists('categorias', 'id')],
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
        ]);

        $producto->update($datos);

        return response()->json($this->formato($producto->fresh('categoria:id,nombre')));
    }

    /** Movimiento de inventario. La lógica vive en Producto::ajustarStock(). */
    public function stock(Request $request, Producto $producto)
    {
        $datos = $request->validate([
            'accion' => ['required', Rule::in(['fijar', 'sumar', 'restar'])],
            'cantidad' => 'required|integer|min:0|max:100000',
        ]);

        [$antes, $nuevo] = $producto->ajustarStock($datos['accion'], $datos['cantidad']);

        return response()->json([
            'id' => $producto->id,
            'nombre' => $producto->nombre,
            'antes' => $antes,
            'despues' => $nuevo,
            'agotado' => $nuevo <= 0,
        ]);
    }

    /** Categorías disponibles — el chatbot las necesita para mover productos. */
    public function categorias()
    {
        return response()->json(
            Categoria::orderBy('orden')->get(['id', 'nombre', 'slug', 'modo_vitrina', 'activa'])
        );
    }

    private function formato(Producto $p): array
    {
        return [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'categoria' => $p->categoria?->nombre,
            'categoria_id' => $p->categoria_id,
            'descripcion' => $p->descripcion,
            'precio_cop' => (int) $p->precio_cop,
            'gramos' => (int) $p->gramos,
            'stock' => (int) $p->stock,
            'stock_minimo' => (int) $p->stock_minimo,
            'agotado' => $p->agotado(),
            'por_acabarse' => $p->porAcabarse(),
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
        ];
    }
}
