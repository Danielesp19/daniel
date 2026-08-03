<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/**
 * Optimiza las imágenes subidas: las reduce al máximo configurado (lado más
 * largo, tienda.max_image_px) y las re-encodea a WebP (tienda.image_quality).
 * Una foto de celular de varios MB queda en ~100–250 KB sin pérdida visible
 * en pantalla.
 *
 * Los GIF (pueden ser animados) se guardan tal cual, y si el procesamiento
 * falla se guarda el original: mejor una imagen pesada que una subida rota.
 */
class ImageOptimizer
{
    public static function store(UploadedFile $file, string $dir): string
    {
        if (! in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return $file->store($dir, 'public');
        }

        try {
            $manager = new ImageManager(
                extension_loaded('imagick') ? new ImagickDriver : new GdDriver
            );

            $max = max(320, (int) config('tienda.max_image_px', 1600));

            $encoded = $manager->decodePath($file->getRealPath())
                ->scaleDown(width: $max, height: $max)
                ->encode(new WebpEncoder(
                    quality: min(100, max(30, (int) config('tienda.image_quality', 80))),
                ));

            $path = trim($dir, '/').'/'.Str::random(40).'.webp';
            Storage::disk('public')->put($path, (string) $encoded);

            return $path;
        } catch (\Throwable $e) {
            Log::warning('ImageOptimizer: no se pudo optimizar, se guarda el original', [
                'file' => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);

            return $file->store($dir, 'public');
        }
    }
}
