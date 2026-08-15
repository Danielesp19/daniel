<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Sede;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Los puntos de venta, para el panel.
 *
 * Sus datos son públicos: salen en la ficha de cada producto junto a cuántas
 * unidades hay ahí, así que una dirección mal escrita se ve en la página.
 */
class SedeAdminController extends Controller
{
    public function index()
    {
        return response()->json(
            Sede::ordenadas()->get()->map(fn (Sede $s) => $this->formato($s))
        );
    }

    public function store(Request $request)
    {
        $datos = $request->validate($this->reglas());
        $datos['orden'] ??= (int) Sede::max('orden') + 1;

        $sede = Sede::create($datos);

        return response()->json($this->formato($sede), 201);
    }

    public function update(Request $request, Sede $sede)
    {
        $sede->update($request->validate($this->reglas($sede)));

        return response()->json($this->formato($sede->fresh()));
    }

    /**
     * Borrar una sede se lleva su inventario: las filas de `producto_sede`
     * están en cascada, así que las unidades que tuviera dejan de contar en el
     * total. Se avisa cuántas son para que la decisión se tome con el número
     * a la vista, no a ciegas.
     */
    public function destroy(Request $request, Sede $sede)
    {
        $bolsas = (int) $sede->productos()->sum('producto_sede.stock');

        if ($bolsas > 0 && ! $request->boolean('confirmar')) {
            return response()->json([
                'error' => "«{$sede->nombre}» todavía tiene {$bolsas} unidades en inventario. "
                    .'Si la borras, esas unidades dejan de contar en el total de cada producto.',
                'necesita_confirmacion' => true,
                'bolsas' => $bolsas,
            ], 422);
        }

        $sede->delete();

        // Los totales de los productos que tenían stock aquí quedaron altos:
        // se recalculan para que la columna vuelva a ser la suma de lo que
        // realmente queda en las sedes que siguen existiendo.
        foreach (\App\Models\Producto::where('controla_stock', true)->get() as $producto) {
            $producto->recalcularTotal();
        }

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function reglas(?Sede $sede = null): array
    {
        $obligatorio = $sede ? 'sometimes' : 'required';

        return [
            'nombre' => $obligatorio.'|string|max:255',
            'slug' => [
                'sometimes', 'nullable', 'string', 'max:255',
                Rule::unique('sedes', 'slug')->ignore($sede?->id),
            ],
            'direccion' => $obligatorio.'|string|max:255',
            'ciudad' => $obligatorio.'|string|max:255',
            'barrio' => 'sometimes|nullable|string|max:255',
            'telefono' => 'sometimes|nullable|string|max:255',
            'whatsapp' => 'sometimes|nullable|string|max:255',
            'horario' => 'sometimes|nullable|string|max:255',
            'principal' => 'sometimes|boolean',
            'activa' => 'sometimes|boolean',
            'orden' => 'sometimes|integer|min:0',
        ];
    }

    private function formato(Sede $s): array
    {
        return [
            'id' => $s->id,
            'nombre' => $s->nombre,
            'slug' => $s->slug,
            'direccion' => $s->direccion,
            'ciudad' => $s->ciudad,
            'barrio' => $s->barrio,
            'telefono' => $s->telefono,
            'whatsapp' => $s->whatsapp,
            'horario' => $s->horario,
            'principal' => (bool) $s->principal,
            'activa' => (bool) $s->activa,
            'orden' => (int) $s->orden,
            'bolsas_en_stock' => (int) $s->productos()->sum('producto_sede.stock'),
        ];
    }
}
