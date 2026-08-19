<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pregunta;
use App\Support\Sitio;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Las preguntas frecuentes, para el panel. */
class PreguntaAdminController extends Controller
{
    public function index()
    {
        return response()->json(
            Pregunta::orderBy('orden')->get()->map(fn (Pregunta $p) => $this->formato($p))
        );
    }

    public function store(Request $request)
    {
        $datos = $request->validate($this->reglas());
        $datos['orden'] ??= (int) Pregunta::max('orden') + 1;

        return response()->json($this->formato(Pregunta::create($datos)), 201);
    }

    public function update(Request $request, Pregunta $pregunta)
    {
        $pregunta->update($request->validate($this->reglas(nueva: false)));

        return response()->json($this->formato($pregunta->fresh()));
    }

    public function destroy(Pregunta $pregunta)
    {
        $pregunta->delete();

        return response()->json(null, 204);
    }

    /** Reordena: llegan los ids en el orden deseado. */
    public function reordenar(Request $request)
    {
        $datos = $request->validate([
            'ids' => 'required|array',
            'ids.*' => ['integer', Rule::exists('preguntas', 'id')],
        ]);

        foreach ($datos['ids'] as $posicion => $id) {
            Pregunta::where('id', $id)->update(['orden' => $posicion]);
        }

        // update() de constructor no dispara eventos de modelo: el aviso al
        // sitio va a mano o el orden nuevo espera al minuto de caché.
        Sitio::revalidar();

        return $this->index();
    }

    /** @return array<string, mixed> */
    private function reglas(bool $nueva = true): array
    {
        $obligatorio = $nueva ? 'required' : 'sometimes';

        return [
            'pregunta' => $obligatorio.'|string|max:255',
            'respuesta' => $obligatorio.'|string|max:2000',
            'activa' => 'sometimes|boolean',
            'orden' => 'sometimes|integer|min:0',
        ];
    }

    private function formato(Pregunta $p): array
    {
        return [
            'id' => $p->id,
            'pregunta' => $p->pregunta,
            'respuesta' => $p->respuesta,
            'activa' => (bool) $p->activa,
            'orden' => (int) $p->orden,
        ];
    }
}
