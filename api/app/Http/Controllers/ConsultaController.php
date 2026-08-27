<?php

namespace App\Http\Controllers;

use App\Models\Consulta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * El buzón de preguntas de la página.
 *
 * Es el único punto donde alguien sin autenticar escribe en la base, así que va
 * con límite por IP (ver AppServiceProvider) y con los campos acotados.
 *
 * La consulta se GUARDA siempre y el correo es un aviso encima. Un correo se
 * pierde, cae en spam o llega a un buzón al que ese día nadie entra; la fila
 * en la base no. Que el envío falle no puede hacer que la pregunta se pierda,
 * y por eso el error se registra pero no se le devuelve al visitante: él hizo
 * su parte.
 */
class ConsultaController extends Controller
{
    public function store(Request $request)
    {
        $datos = $request->validate([
            'mensaje' => 'required|string|min:5|max:1000',
            'contacto' => 'sometimes|nullable|string|max:120',
        ]);

        $consulta = Consulta::create($datos);

        $this->avisar($consulta);

        return response()->json([
            'ok' => true,
            'mensaje' => 'Gracias. Te respondo apenas la lea.',
        ], 201);
    }

    private function avisar(Consulta $consulta): void
    {
        $destino = (string) config('tienda.consultas_correo');

        if ($destino === '') {
            return; // sin correo configurado: queda en la base y ya
        }

        try {
            $cuerpo = "Pregunta desde la página:\n\n{$consulta->mensaje}\n\n"
                .'Contacto: '.($consulta->contacto ?: 'no dejó').
                "\nRecibida: {$consulta->created_at}";

            Mail::raw($cuerpo, function ($m) use ($destino) {
                $m->to($destino)->subject('Nueva pregunta desde la página');
            });
        } catch (\Throwable $e) {
            Log::warning('No se pudo enviar el aviso de una consulta', [
                'consulta' => $consulta->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
