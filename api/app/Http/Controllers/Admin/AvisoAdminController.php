<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Aviso;
use Illuminate\Http\Request;

/**
 * La banda de aviso, para el panel.
 *
 * Igual que la portada: la tabla admite varios pero la página dibuja uno solo,
 * así que aquí se edita ese. Mostrar una lista de avisos de los que solo se ve
 * uno sería mentirle al que administra.
 */
class AvisoAdminController extends Controller
{
    public function show()
    {
        $aviso = $this->actual();

        return response()->json($aviso ? $this->formato($aviso) : null);
    }

    public function update(Request $request)
    {
        $datos = $request->validate([
            'etiqueta' => 'sometimes|nullable|string|max:60',
            'titulo' => 'required|string|max:255',
            'texto' => 'sometimes|nullable|string|max:500',
            'cta_texto' => 'sometimes|nullable|string|max:60',
            'cta_url' => 'sometimes|nullable|string|max:500',
            'activo' => 'sometimes|boolean',
        ]);

        $aviso = $this->actual() ?? new Aviso(['orden' => 0]);
        $aviso->fill($datos);
        // Sin etiqueta la banda queda sin su rótulo y se ve rota; se repone la
        // de siempre en vez de dejar el hueco.
        $aviso->etiqueta = $aviso->etiqueta ?: 'Aviso';
        $aviso->save();

        return response()->json($this->formato($aviso->fresh()));
    }

    private function actual(): ?Aviso
    {
        return Aviso::orderBy('orden')->first();
    }

    private function formato(Aviso $a): array
    {
        return [
            'id' => $a->id,
            'etiqueta' => $a->etiqueta,
            'titulo' => $a->titulo,
            'texto' => $a->texto,
            'cta_texto' => $a->cta_texto,
            'cta_url' => $a->cta_url,
            'activo' => (bool) $a->activo,
        ];
    }
}
