<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Support\Sitio;
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
        // Todas —secciones y subcategorías— en un solo arreglo plano, cada una
        // con su `padre_id`. El panel arma el árbol: mandarlo anidado obligaría
        // a un formato distinto para el mismo objeto según dónde cuelgue.
        return response()->json(
            Categoria::withCount('productos')->orderBy('orden')->get()
                ->map(fn (Categoria $c) => $this->formato($c))
        );
    }

    public function store(Request $request)
    {
        $datos = $request->validate($this->reglas());

        if ($error = $this->errorDePadre(new Categoria, $datos['padre_id'] ?? null)) {
            return $error;
        }

        // Al final de SU lista: una sección nueva no debería aparecer de
        // primeras sin que nadie lo haya pedido, y el orden de una subcategoría
        // se cuenta entre sus hermanas, no contra las secciones.
        $datos['orden'] ??= (int) Categoria::where('padre_id', $datos['padre_id'] ?? null)->max('orden') + 1;

        $categoria = Categoria::create($datos);

        return response()->json($this->formato($categoria->loadCount('productos')), 201);
    }

    public function update(Request $request, Categoria $categoria)
    {
        $datos = $request->validate($this->reglas($categoria));

        if (array_key_exists('padre_id', $datos)
            && ($error = $this->errorDePadre($categoria, $datos['padre_id']))) {
            return $error;
        }

        $categoria->update($datos);

        return response()->json($this->formato($categoria->loadCount('productos')));
    }

    /**
     * La jerarquía es de un solo nivel, y eso se explica acá con palabras en
     * vez de con un 422 pelado: quien lo intenta desde el panel tiene que
     * entender por qué no lo dejó.
     */
    private function errorDePadre(Categoria $categoria, ?int $padreId)
    {
        if ($padreId === null) {
            return null;
        }

        $padre = Categoria::find($padreId);

        if (! $categoria->puedeColgarDe($padre)) {
            return response()->json([
                'error' => $padre && ! $padre->esSeccion()
                    ? "«{$padre->nombre}» ya es una subcategoría. Las subcategorías solo cuelgan de una sección."
                    : 'Esta sección tiene subcategorías adentro, así que no puede volverse subcategoría de otra.',
            ], 422);
        }

        return null;
    }

    /**
     * Borrar una sección con productos adentro se los llevaría a todos por
     * delante: la llave foránea está en cascada. Se bloquea y se le dice al
     * admin que los mueva primero — es un clic más y evita perder el catálogo
     * por una confirmación leída a medias.
     */
    public function destroy(Categoria $categoria)
    {
        // Una sección con subcategorías tampoco se borra de una: sus productos
        // están adentro de ellas y desaparecerían sin que nadie los viera.
        if ($categoria->subcategorias()->exists()) {
            return response()->json([
                'error' => "«{$categoria->nombre}» tiene subcategorías adentro. Bórralas o muévelas primero.",
            ], 422);
        }

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
        Sitio::revalidar();

        return $this->index();
    }

    /** @return array<string, mixed> */
    private function reglas(?Categoria $categoria = null): array
    {
        return [
            'padre_id' => ['sometimes', 'nullable', Rule::exists('categorias', 'id')],
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
            'padre_id' => $c->padre_id,
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
