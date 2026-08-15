<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Hero;
use App\Support\Sitio;
use Illuminate\Http\Request;

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
     * Solo los textos.
     *
     * El fondo de la portada NO se sube por aquí: es un video fijo que vive en
     * el frontend (public/videos/hero.mp4). Se quitó la subida de imagen en vez
     * de solo esconder el campo del panel, para que no quede una puerta abierta
     * que escribe una columna que ya nadie lee.
     *
     * Se recibe por POST y no por PUT porque el panel manda FormData.
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
        ]);

        $hero = $this->actual() ?? new Hero(['orden' => 0, 'activo' => true]);
        $hero->fill($datos);
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
            'cta_texto' => $h->cta_texto,
            'cta_url' => $h->cta_url,
            'activo' => (bool) $h->activo,
        ];
    }
}
