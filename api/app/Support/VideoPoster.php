<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * Genera un poster JPEG (primer frame, máx. 720px de ancho) de un video con
 * FFmpeg. Controlado: si FFmpeg no está instalado o falla, devuelve null y el
 * flujo que lo llame sigue normal (el frontend cae a su miniatura por metadatos).
 */
class VideoPoster
{
    public static function generate(string $videoPath): ?string
    {
        $bin = config('tienda.ffmpeg', 'ffmpeg');

        $disk = Storage::disk('public');
        $src = $disk->path($videoPath);
        $rel = 'menu-items/posters/'.pathinfo($videoPath, PATHINFO_FILENAME).'.jpg';
        $dest = $disk->path($rel);

        if (! is_file($src)) {
            return null;
        }

        if (! is_dir(dirname($dest))) {
            @mkdir(dirname($dest), 0775, true);
        }

        try {
            $result = Process::timeout(20)->run([
                $bin, '-y',
                '-ss', '0.1',           // frame apenas pasado el inicio (evita frames negros)
                '-i', $src,
                '-frames:v', '1',
                '-vf', "scale='min(720,iw)':-2",
                '-q:v', '4',
                $dest,
            ]);

            if ($result->successful() && is_file($dest) && filesize($dest) > 0) {
                return $rel;
            }
            Log::warning('FFmpeg no pudo generar el poster del video', [
                'video' => $videoPath,
                'error' => mb_substr($result->errorOutput(), -400),
            ]);
        } catch (\Throwable $e) {
            // FFmpeg no instalado o timeout: no es fatal.
            Log::warning('Poster de video omitido: '.$e->getMessage(), ['video' => $videoPath]);
        }

        @unlink($dest); // no dejar archivos a medias

        return null;
    }
}
