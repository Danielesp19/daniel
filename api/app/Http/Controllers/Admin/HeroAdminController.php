<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Hero;
use App\Support\ImageOptimizer;
use App\Support\Sitio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * La portada, para el panel.
 *
 * La tabla admite varias filas con `orden`, pero la página dibuja solo la
 * primera activa, así que el panel trabaja sobre esa: mostrar una lista de
 * portadas de las que solo se ve una sería mentirle al que administra.
 */
class HeroAdminController extends Controller
{
    public function show()
    {
        $hero = $this->actual();

        return response()->json($hero ? $this->formato($hero) : null);
    }

    /**
     * Se recibe por POST y no por PUT porque puede traer la imagen: un
     * multipart con `_method` no viaja bien por todos los proxys, y el panel
     * manda FormData cuando hay archivo.
     */
    public function update(Request $request)
    {
        $datos = $request->validate([
            'titulo' => 'required|string|max:255',
            'subtitulo' => 'sometimes|nullable|string|max:500',
            'etiqueta' => 'sometimes|nullable|string|max:255',
            'cta_texto' => 'sometimes|nullable|string|max:255',
            'cta_url' => 'sometimes|nullable|string|max:500',
            'activo' => 'sometimes|boolean',
            'imagen' => 'sometimes|nullable|image|max:12288',
            'quitar_imagen' => 'sometimes|boolean',
        ]);

        $hero = $this->actual() ?? new Hero(['orden' => 0, 'activo' => true]);

        // La imagen se maneja aparte: los booleanos y el archivo no son campos
        // del modelo y `fill()` con ellos adentro reventaría.
        unset($datos['imagen'], $datos['quitar_imagen']);
        $hero->fill($datos);

        if ($request->boolean('quitar_imagen') && $hero->imagen) {
            Storage::disk('public')->delete($hero->imagen);
            $hero->imagen = null;
        }

        if ($request->hasFile('imagen')) {
            if ($hero->imagen) {
                Storage::disk('public')->delete($hero->imagen);
            }
            $hero->imagen = ImageOptimizer::store($request->file('imagen'), 'hero');
        }

        $hero->save();

        // Hero no dispara el aviso al sitio desde el modelo (no lo tiene
        // implementado como Producto y Categoria), así que se manda acá.
        Sitio::revalidar();

        return response()->json($this->formato($hero->fresh()));
    }

    private function actual(): ?Hero
    {
        return Hero::orderBy('orden')->first();
    }

    private function formato(Hero $h): array
    {
        return [
            'id' => $h->id,
            'titulo' => $h->titulo,
            'subtitulo' => $h->subtitulo,
            'etiqueta' => $h->etiqueta,
            'imagen_url' => $h->imagen ? asset('storage/'.$h->imagen) : null,
            'cta_texto' => $h->cta_texto,
            'cta_url' => $h->cta_url,
            'activo' => (bool) $h->activo,
        ];
    }
}
