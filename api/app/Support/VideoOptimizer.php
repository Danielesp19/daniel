<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * Comprime los videos subidos con FFmpeg: máx. 720px de ancho, H.264 CRF
 * (tienda.video_crf), sin audio (el catálogo los reproduce silenciados) y
 * `faststart` para que empiecen a verse antes de bajar completos. Un clip de
 * ~10s pasa de 10-15 MB a ~1-3 MB.
 *
 * Igual que ImageOptimizer: si FFmpeg no está instalado o falla, se guarda el
 * original tal cual — nunca se rompe la subida.
 */
class VideoOptimizer
{
    public static function store(UploadedFile $file, string $dir): string
    {
        $disk = Storage::disk('public');
        $original = $file->store($dir, 'public');

        $bin = config('tienda.ffmpeg', 'ffmpeg');
        $src = $disk->path($original);

        $maxPx = max(240, (int) config('tienda.max_video_px', 720));
        $crf = min(45, max(18, (int) config('tienda.video_crf', 30)));

        $rel = trim($dir, '/').'/'.pathinfo($original, PATHINFO_FILENAME).'-opt.mp4';
        $dest = $disk->path($rel);

        try {
            $result = Process::timeout(180)->run([
                $bin, '-y', '-v', 'error',
                '-i', $src,
                '-an',                                   // sin audio: la carta reproduce muted
                '-c:v', 'libx264',
                '-crf', (string) $crf,
                '-preset', 'veryfast',                   // amable con la CPU del hosting
                '-vf', "scale='min({$maxPx},iw)':-2",    // nunca agranda
                '-movflags', '+faststart',
                $dest,
            ]);

            // Solo se usa la versión comprimida si de verdad quedó más liviana.
            if ($result->successful() && is_file($dest) && filesize($dest) > 0 && filesize($dest) < filesize($src)) {
                $disk->delete($original);

                return $rel;
            }

            @unlink($dest);
            if (! $result->successful()) {
                Log::warning('VideoOptimizer: ffmpeg falló, se guarda el original', [
                    'file' => $file->getClientOriginalName(),
                    'error' => trim($result->errorOutput()),
                ]);
            }
        } catch (\Throwable $e) {
            @unlink($dest);
            Log::warning('VideoOptimizer: no se pudo comprimir, se guarda el original', [
                'file' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);
        }

        return $original;
    }
}
