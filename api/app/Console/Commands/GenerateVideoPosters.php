<?php

namespace App\Console\Commands;

use App\Models\MenuItem;
use App\Support\VideoPoster;
use Illuminate\Console\Command;

/**
 * Backfill: genera el poster JPEG de los videos que ya estaban subidos antes
 * de esta funcionalidad. Idempotente: solo procesa ítems sin poster.
 */
class GenerateVideoPosters extends Command
{
    protected $signature = 'menu:video-posters {--force : Regenerar también los que ya tienen poster}';

    protected $description = 'Genera con FFmpeg el poster (primer frame) de los videos de productos que no lo tengan';

    public function handle(): int
    {
        $query = MenuItem::whereNotNull('video');
        if (! $this->option('force')) {
            $query->whereNull('video_poster');
        }

        $items = $query->get();
        if ($items->isEmpty()) {
            $this->info('Nada que hacer: todos los videos tienen poster.');

            return self::SUCCESS;
        }

        $ok = 0;
        foreach ($items as $item) {
            $poster = VideoPoster::generate($item->video);
            if ($poster) {
                $item->update(['video_poster' => $poster]);
                $this->line("✓ {$item->name} → {$poster}");
                $ok++;
            } else {
                $this->warn("✗ {$item->name}: no se pudo generar (¿FFmpeg instalado?)");
            }
        }

        $this->info("Listo: {$ok}/{$items->count()} posters generados.");

        return self::SUCCESS;
    }
}
