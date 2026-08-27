<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Receta;
use App\Support\ImageOptimizer;
use App\Support\Sitio;
use App\Support\VideoOptimizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Las recetas, para el panel.
 *
 * Acepta multipart porque puede traer foto y video, igual que los productos, y
 * reutiliza los mismos optimizadores.
 */
class RecetaAdminController extends Controller
{
    public function index()
    {
        return response()->json(
            Receta::with('producto:id,nombre')->orderBy('orden')->get()
                ->map(fn (Receta $r) => $this->formato($r))
        );
    }

    public function store(Request $request)
    {
        $datos = $request->validate($this->reglas(nueva: true));
        $datos['orden'] ??= (int) Receta::max('orden') + 1;

        $receta = Receta::create($this->soloCampos($datos));
        $this->guardarMedios($request, $receta);

        return response()->json($this->formato($receta->fresh('producto:id,nombre')), 201);
    }

    public function update(Request $request, Receta $receta)
    {
        $datos = $request->validate($this->reglas());

        $receta->update($this->soloCampos($datos));
        $this->guardarMedios($request, $receta);

        return response()->json($this->formato($receta->fresh('producto:id,nombre')));
    }

    public function destroy(Receta $receta)
    {
        foreach ([$receta->imagen, $receta->video, $receta->video_poster] as $ruta) {
            if ($ruta) {
                Storage::disk('public')->delete($ruta);
            }
        }

        $receta->delete();

        return response()->json(null, 204);
    }

    public function reordenar(Request $request)
    {
        $datos = $request->validate([
            'ids' => 'required|array',
            'ids.*' => ['integer', Rule::exists('recetas', 'id')],
        ]);

        foreach ($datos['ids'] as $posicion => $id) {
            Receta::where('id', $id)->update(['orden' => $posicion]);
        }

        Sitio::revalidar();

        return $this->index();
    }

    /** @return array<string, mixed> */
    private function reglas(bool $nueva = false): array
    {
        $obligatorio = $nueva ? 'required' : 'sometimes';

        return [
            'nombre' => $obligatorio.'|string|max:255',
            'metodo' => $obligatorio.'|string|max:60',
            'resumen' => 'sometimes|nullable|string|max:255',
            'detalle' => 'sometimes|nullable|string|max:255',
            // Topes generosos pero con techo: un cold brew son 100 g de café y
            // 1000 g de agua; más que eso ya no es una receta de casa.
            'cafe_g' => 'sometimes|nullable|integer|min:1|max:2000',
            'agua_g' => 'sometimes|nullable|integer|min:1|max:20000',
            // Tope de 24 horas: un cold brew largo cabe, un número absurdo no.
            'duracion_seg' => 'sometimes|nullable|integer|min:0|max:86400',
            'ingredientes' => 'sometimes|nullable|array|max:12',
            'ingredientes.*' => 'string|max:120',
            'pasos' => 'sometimes|nullable|array|max:12',
            'pasos.*' => 'string|max:300',
            'producto_id' => ['sometimes', 'nullable', Rule::exists('productos', 'id')],
            'activa' => 'sometimes|boolean',
            'orden' => 'sometimes|integer|min:0',

            'imagen' => 'sometimes|nullable|image|max:12288',
            'video' => 'sometimes|nullable|file|mimetypes:video/mp4,video/quicktime,video/webm|max:102400',
            'quitar_imagen' => 'sometimes|boolean',
            'quitar_video' => 'sometimes|boolean',
        ];
    }

    private function soloCampos(array $datos): array
    {
        return array_diff_key($datos, array_flip(['imagen', 'video', 'quitar_imagen', 'quitar_video']));
    }

    /** Mismo trato que los productos: la imagen sale en WebP y el video recomprimido. */
    private function guardarMedios(Request $request, Receta $receta): void
    {
        $cambios = [];

        if ($request->boolean('quitar_imagen') && $receta->imagen) {
            Storage::disk('public')->delete($receta->imagen);
            $cambios['imagen'] = null;
        }

        if ($request->hasFile('imagen')) {
            if ($receta->imagen) {
                Storage::disk('public')->delete($receta->imagen);
            }
            $cambios['imagen'] = ImageOptimizer::store($request->file('imagen'), 'recetas');
        }

        if ($request->boolean('quitar_video') && $receta->video) {
            Storage::disk('public')->delete($receta->video);
            $cambios['video'] = null;
        }

        if ($request->hasFile('video')) {
            if ($receta->video) {
                Storage::disk('public')->delete($receta->video);
            }
            $cambios['video'] = VideoOptimizer::store($request->file('video'), 'recetas');
        }

        if ($cambios) {
            $receta->update($cambios);
        }
    }

    private function formato(Receta $r): array
    {
        return [
            'id' => $r->id,
            'nombre' => $r->nombre,
            'slug' => $r->slug,
            'metodo' => $r->metodo,
            'resumen' => $r->resumen,
            'detalle' => $r->detalle,
            'cafe_g' => $r->cafe_g,
            'agua_g' => $r->agua_g,
            'ratio' => $r->ratio(),
            'duracion_seg' => $r->duracion_seg,
            'duracion' => $r->duracionLegible(),
            'ingredientes' => $r->ingredientes ?? [],
            'pasos' => $r->pasos ?? [],
            'producto_id' => $r->producto_id,
            'producto' => $r->producto?->nombre,
            'activa' => (bool) $r->activa,
            'orden' => (int) $r->orden,
            'imagen_url' => $r->imagen ? asset('storage/'.$r->imagen) : null,
            'video_url' => $r->video ? asset('storage/'.$r->video) : null,
        ];
    }
}
