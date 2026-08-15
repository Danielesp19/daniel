<?php

namespace App\Models\Concerns;

/**
 * Genera un slug que no choque con los que ya existen: "el-mirador", si está
 * tomado, se vuelve "el-mirador-2".
 *
 * Dos cosas PUEDEN llamarse igual —el mismo café en dos presentaciones, dos
 * sedes "Centro" en ciudades distintas— y quien administra no tiene por qué
 * saber qué es un slug. Sin esto, guardar el segundo revienta contra el índice
 * único con un "ya existe un registro con esos datos" que no dice qué está
 * repetido ni cómo arreglarlo.
 */
trait SlugUnico
{
    protected static function slugLibre(string $base, string $respaldo): string
    {
        // Un nombre que al normalizarse queda vacío (puros signos, por ejemplo)
        // dejaría el slug en blanco y chocarían todos entre sí.
        $base = $base !== '' ? $base : $respaldo;
        $slug = $base;

        for ($n = 2; static::where('slug', $slug)->exists(); $n++) {
            $slug = "{$base}-{$n}";
        }

        return $slug;
    }
}
