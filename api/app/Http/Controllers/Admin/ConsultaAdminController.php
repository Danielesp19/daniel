<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Consulta;

/** Las preguntas recibidas, para el panel. */
class ConsultaAdminController extends Controller
{
    public function index()
    {
        // Las sin atender primero: es una bandeja de entrada, no un archivo.
        return response()->json(
            Consulta::orderBy('atendida')->orderByDesc('created_at')->limit(200)->get()
                ->map(fn (Consulta $c) => [
                    'id' => $c->id,
                    'mensaje' => $c->mensaje,
                    'contacto' => $c->contacto,
                    'atendida' => (bool) $c->atendida,
                    'recibida' => $c->created_at?->toIso8601String(),
                ])
        );
    }

    /** Marca como atendida, o la devuelve a pendiente. */
    public function alternar(Consulta $consulta)
    {
        $consulta->update(['atendida' => ! $consulta->atendida]);

        return response()->json(['id' => $consulta->id, 'atendida' => (bool) $consulta->atendida]);
    }

    public function destroy(Consulta $consulta)
    {
        $consulta->delete();

        return response()->json(null, 204);
    }
}
