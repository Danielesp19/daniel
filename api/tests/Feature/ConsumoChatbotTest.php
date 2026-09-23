<?php

namespace Tests\Feature;

use App\Models\ConsumoChatbot;
use App\Support\Chatbot\Herramientas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El tope de gasto.
 *
 * La API de Claude cobra por token y los límites de su consola avisan tarde,
 * así que este medidor es lo único que de verdad corta el gasto. Si falla, la
 * cuenta sigue subiendo sin que nadie se entere hasta que llega el cobro.
 */
class ConsumoChatbotTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Precios de Opus 5 para que las cuentas del test sean legibles:
        // US$5 por millón de entrada (500 centavos), US$25 de salida.
        config([
            'tienda.chatbot.precio_entrada_centavos_millon' => 500,
            'tienda.chatbot.precio_salida_centavos_millon' => 2500,
        ]);
    }

    public function test_suma_lo_que_gasta_cada_llamada(): void
    {
        ConsumoChatbot::registrar(entrada: 1_000_000, salida: 0);
        ConsumoChatbot::registrar(entrada: 0, salida: 1_000_000);

        // 500 + 2500 centavos = US$30.
        $this->assertSame(3000, ConsumoChatbot::delMes()->costo_centavos);
        $this->assertSame('30.00', ConsumoChatbot::delMes()->dolares());
    }

    public function test_la_lectura_de_cache_cuesta_una_decima_parte(): void
    {
        // Es el motivo de marcar el prompt como cacheable: sin esta
        // diferencia, el caché no se pagaría solo.
        ConsumoChatbot::registrar(entrada: 0, salida: 0, cacheLectura: 1_000_000);

        $this->assertSame(50, ConsumoChatbot::delMes()->costo_centavos);
    }

    public function test_el_redondeo_va_hacia_arriba(): void
    {
        // Un medidor que se queda corto no sirve de tope. Mil tokens de
        // entrada valen medio centavo: se cuenta uno.
        ConsumoChatbot::registrar(entrada: 1000, salida: 0);

        $this->assertSame(1, ConsumoChatbot::delMes()->costo_centavos);
    }

    public function test_sin_tope_configurado_nunca_corta(): void
    {
        config(['tienda.chatbot.tope_mensual_centavos' => 0]);
        ConsumoChatbot::registrar(entrada: 100_000_000, salida: 100_000_000);

        $this->assertFalse(ConsumoChatbot::topeAlcanzado());
    }

    public function test_corta_al_llegar_al_tope(): void
    {
        config(['tienda.chatbot.tope_mensual_centavos' => 500]);   // US$5

        ConsumoChatbot::registrar(entrada: 1_000_000, salida: 0);  // US$5 justos
        $this->assertTrue(ConsumoChatbot::topeAlcanzado());
    }

    public function test_por_debajo_del_tope_sigue_trabajando(): void
    {
        config(['tienda.chatbot.tope_mensual_centavos' => 500]);

        ConsumoChatbot::registrar(entrada: 900_000, salida: 0);    // US$4.50
        $this->assertFalse(ConsumoChatbot::topeAlcanzado());
    }

    public function test_el_gasto_se_cuenta_por_mes_aparte(): void
    {
        // El mes pasado no puede dejar sin bot al mes que empieza.
        ConsumoChatbot::create(['mes' => '2020-01', 'costo_centavos' => 999_999]);
        config(['tienda.chatbot.tope_mensual_centavos' => 500]);

        $this->assertFalse(ConsumoChatbot::topeAlcanzado());
    }

    public function test_el_admin_puede_preguntar_cuanto_lleva_gastado(): void
    {
        config(['tienda.chatbot.tope_mensual_centavos' => 1000]);
        ConsumoChatbot::registrar(entrada: 400_000, salida: 0);     // US$2

        $r = Herramientas::ejecutar('consumo_del_mes', []);

        $this->assertSame('2.00', $r['gastado_usd']);
        $this->assertSame('10.00', $r['tope_usd']);
        $this->assertSame('8.00', $r['queda_usd']);
    }

    public function test_los_mensajes_se_cuentan_aparte_de_las_llamadas(): void
    {
        // Un mensaje del admin son varias llamadas a la API. Tenerlos
        // separados es lo que permite saber cuánto cuesta un mensaje.
        ConsumoChatbot::contarMensaje();
        ConsumoChatbot::registrar(entrada: 1000, salida: 100);
        ConsumoChatbot::registrar(entrada: 1000, salida: 100);

        $this->assertSame(1, ConsumoChatbot::delMes()->mensajes);
    }
}
