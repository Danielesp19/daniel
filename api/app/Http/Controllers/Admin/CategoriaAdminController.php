<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Las secciones del catálogo, para el panel.
 *
 * El orden de las categorías ES el orden de la página, así que reordenar es
 * una operación de primera clase y no un campo escondido en un formulario.
 */
class CategoriaAdminController extends Controller
{
    public function index()
    {
        return response()->json(
            Categoria::withCount('productos')->orderBy('orden')->get()
                ->map(fn (Categoria $c) => $this->formato($c))
        );
    }

    public function store(Request $request)
    {
        $datos = $request->validate($this->reglas());

        // Al final de la lista: una sección nueva no debería aparecer de
        // primeras sin que nadie lo haya pedido.
        $datos['orden'] ??= (int) Categoria::max('orden') + 1;

        $categoria = Categoria::create($datos);

        return response()->json($this->formato($categoria->loadCount('productos')), 201);
    }

    public function update(Request $request, Categoria $categoria)
    {
        $categoria->update($request->validate($this->reglas($categoria)));

        return response()->json($this->formato($categoria->loadCount('productos')));
    }

    /**
     * Borrar una sección con productos adentro se los llevaría a todos por
     * delante: la llave foránea está en cascada. Se bloquea y se le dice al
     * admin que los mueva primero — es un clic más y evita perder el catálogo
     * por una confirmación leída a medias.
     */
    public function destroy(Categoria $categoria)
    {
        $cuantos = $categoria->productos()->count();

        if ($cuantos > 0) {
            return response()->json([
                'error' => "«{$categoria->nombre}» tiene {$cuantos} ".($cuantos === 1 ? 'producto' : 'productos')
                    .'. Muévelos a otra sección antes de borrarla.',
            ], 422);
        }

        $categoria->delete();

        return response()->json(null, 204);
    }

    /** Reordena las secciones: llegan los ids en el orden deseado. */
    public function reordenar(Request $request)
    {
        $datos = $request->validate([
            'ids' => 'required|array',
            'ids.*' => ['integer', Rule::exists('categorias', 'id')],
        ]);

        foreach ($datos['ids'] as $posicion => $id) {
            Categoria::where('id', $id)->update(['orden' => $posicion]);
        }

        // Un update() de constructor no dispara eventos de modelo, así que el
        // aviso al sitio hay que darlo a mano: si no, el orden nuevo no se ve
        // hasta que venza el minuto de caché.
        \App\Support\Sitio::revalidar();

        return $this->index();
    }

    /** @return array<string, mixed> */
    private function reglas(?Categoria $categoria = null): array
    {
        return [
            'nombre' => ($categoria ? 'sometimes' : 'required').'|string|max:255',
            'slug' => [
                'sometimes', 'nullable', 'string', 'max:255',
                Rule::unique('categorias', 'slug')->ignore($categoria?->id),
            ],
            'descripcion' => 'sometimes|nullable|string',
            'modo_vitrina' => ['sometimes', Rule::in(Categoria::VITRINAS)],
            'orden' => 'sometimes|integer|min:0',
            'activa' => 'sometimes|boolean',
        ];
    }

    private function formato(Categoria $c): array
    {
        return [
            'id' => $c->id,
            'nombre' => $c->nombre,
            'slug' => $c->slug,
            'descripcion' => $c->descripcion,
            'modo_vitrina' => $c->modo_vitrina,
            'orden' => (int) $c->orden,
            'activa' => (bool) $c->activa,
            'productos_count' => (int) ($c->productos_count ?? 0),
        ];
    }
}
