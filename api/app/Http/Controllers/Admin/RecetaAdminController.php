<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Receta;
use App\Support\ImageOptimizer;
use App\Support\Sitio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Las recetas, para el panel.
 *
 * Acepta multipart porque los pasos pueden traer imagen. El VIDEO ya no se
 * sube: se guarda la URL de YouTube y de ahí sale también la miniatura, así
 * que una receta con video no necesita que le carguen foto.
 */
class RecetaAdminController extends Controller
{
    public function index()
    {
        return response()->json(
            Receta::with(['producto:id,nombre', 'pasos', 'artefactos:id,nombre'])
                ->orderBy('orden')->get()
                ->map(fn (Receta $r) => $this->formato($r))
        );
    }

    public function store(Request $request)
    {
        $datos = $request->validate($this->reglas(nueva: true));
        $datos['orden'] ??= (int) Receta::max('orden') + 1;

        $receta = Receta::create($this->soloCampos($datos));
        $this->guardarImagen($request, $receta);
        $this->guardarPasos($request, $receta);
        $this->guardarArtefactos($request, $receta);

        return response()->json($this->formato($this->recargar($receta)), 201);
    }

    public function update(Request $request, Receta $receta)
    {
        $datos = $request->validate($this->reglas());

        $receta->update($this->soloCampos($datos));
        $this->guardarImagen($request, $receta);
        $this->guardarPasos($request, $receta);
        $this->guardarArtefactos($request, $receta);

        return response()->json($this->formato($this->recargar($receta)));
    }

    public function destroy(Receta $receta)
    {
        if ($receta->imagen) {
            Storage::disk('public')->delete($receta->imagen);
        }
        foreach ($receta->pasos as $paso) {
            if ($paso->imagen) {
                Storage::disk('public')->delete($paso->imagen);
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

    private function recargar(Receta $receta): Receta
    {
        return $receta->fresh(['producto:id,nombre', 'pasos', 'artefactos:id,nombre']);
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
            'video_youtube' => 'sometimes|nullable|string|max:500',
            'cafe_g' => 'sometimes|nullable|integer|min:1|max:2000',
            'agua_g' => 'sometimes|nullable|integer|min:1|max:20000',
            'duracion_seg' => 'sometimes|nullable|integer|min:0|max:86400',
            'ingredientes' => 'sometimes|nullable|array|max:12',
            'ingredientes.*' => 'string|max:120',
            'producto_id' => ['sometimes', 'nullable', Rule::exists('productos', 'id')],
            'activa' => 'sometimes|boolean',
            'orden' => 'sometimes|integer|min:0',

            // Los pasos llegan como una lista de objetos. `imagen` puede venir
            // como archivo nuevo, y `imagen_actual` conserva la que ya estaba
            // cuando el paso no se tocó.
            'pasos' => 'sometimes|nullable|array|max:20',
            'pasos.*.texto' => 'required|string|max:400',
            'pasos.*.segundos' => 'nullable|integer|min:0|max:86400',
            'pasos.*.temporizador_etiqueta' => 'nullable|string|max:60',
            'pasos.*.imagen' => 'nullable|image|max:12288',
            'pasos.*.imagen_actual' => 'nullable|string|max:255',

            'artefactos' => 'sometimes|nullable|array|max:12',
            'artefactos.*' => ['integer', Rule::exists('productos', 'id')],

            'imagen' => 'sometimes|nullable|image|max:12288',
            'quitar_imagen' => 'sometimes|boolean',
        ];
    }

    private function soloCampos(array $datos): array
    {
        return array_diff_key($datos, array_flip([
            'imagen', 'quitar_imagen', 'pasos', 'artefactos',
        ]));
    }

    private function guardarImagen(Request $request, Receta $receta): void
    {
        if ($request->boolean('quitar_imagen') && $receta->imagen) {
            Storage::disk('public')->delete($receta->imagen);
            $receta->update(['imagen' => null]);
        }

        if ($request->hasFile('imagen')) {
            if ($receta->imagen) {
                Storage::disk('public')->delete($receta->imagen);
            }
            $receta->update(['imagen' => ImageOptimizer::store($request->file('imagen'), 'recetas')]);
        }
    }

    /**
     * Reescribe los pasos de la receta.
     *
     * Se borran y se vuelven a crear en vez de casarlos uno a uno por id: el
     * panel deja reordenarlos, insertar en el medio y quitar del centro, y
     * seguirle la pista a eso con ids acaba en más código del que vale. Lo
     * único que hay que cuidar es no perder las imágenes de los pasos que no
     * se tocaron, y de eso se encarga `imagen_actual`.
     *
     * Solo se toca si el campo viene: guardar una receta desde otro sitio no
     * puede borrarle los pasos sin querer.
     */
    private function guardarPasos(Request $request, Receta $receta): void
    {
        if (! $request->has('pasos')) {
            return;
        }

        $entrantes = $request->input('pasos', []) ?: [];
        $archivos = $request->file('pasos', []) ?: [];

        // Las imágenes que quedan en uso, para saber cuáles borrar del disco.
        $conservadas = [];
        $filas = [];

        foreach ($entrantes as $i => $paso) {
            $texto = trim((string) ($paso['texto'] ?? ''));
            if ($texto === '') {
                continue;
            }

            $ruta = $paso['imagen_actual'] ?? null;

            if (isset($archivos[$i]['imagen'])) {
                if ($ruta) {
                    Storage::disk('public')->delete($ruta);
                }
                $ruta = ImageOptimizer::store($archivos[$i]['imagen'], 'recetas');
            }

            if ($ruta) {
                $conservadas[] = $ruta;
            }

            $filas[] = [
                'orden' => count($filas),
                'texto' => $texto,
                'imagen' => $ruta,
                'segundos' => ($paso['segundos'] ?? null) !== null && $paso['segundos'] !== ''
                    ? (int) $paso['segundos']
                    : null,
                'temporizador_etiqueta' => trim((string) ($paso['temporizador_etiqueta'] ?? '')) ?: null,
            ];
        }

        // Las imágenes de los pasos que desaparecieron se borran del disco:
        // sin esto se acumulan fotos que ya nadie puede ver.
        foreach ($receta->pasos as $viejo) {
            if ($viejo->imagen && ! in_array($viejo->imagen, $conservadas, true)) {
                Storage::disk('public')->delete($viejo->imagen);
            }
        }

        $receta->pasos()->delete();
        $receta->pasos()->createMany($filas);
    }

    private function guardarArtefactos(Request $request, Receta $receta): void
    {
        if (! $request->has('artefactos')) {
            return;
        }

        $ids = collect($request->input('artefactos', []))
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        $receta->artefactos()->sync(
            $ids->mapWithKeys(fn (int $id, int $i) => [$id => ['orden' => $i]])->all()
        );
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
            'video_youtube' => $r->video_youtube,
            'youtube_id' => $r->youtubeId(),
            'cafe_g' => $r->cafe_g,
            'agua_g' => $r->agua_g,
            'ratio' => $r->ratio(),
            'duracion_seg' => $r->duracion_seg,
            'duracion' => $r->duracionLegible(),
            'ingredientes' => $r->ingredientes ?? [],
            'pasos' => $r->pasos->map(fn ($p) => [
                'id' => $p->id,
                'texto' => $p->texto,
                'imagen' => $p->imagen,
                'imagen_url' => $p->imagen ? asset('storage/'.$p->imagen) : null,
                'segundos' => $p->segundos,
                'temporizador_etiqueta' => $p->temporizador_etiqueta,
            ])->values()->all(),
            'artefactos' => $r->artefactos->map(fn ($a) => ['id' => $a->id, 'nombre' => $a->nombre])->values()->all(),
            'producto_id' => $r->producto_id,
            'producto' => $r->producto?->nombre,
            'activa' => (bool) $r->activa,
            'orden' => (int) $r->orden,
            'imagen_url' => $r->imagen ? asset('storage/'.$r->imagen) : null,
        ];
    }
}
