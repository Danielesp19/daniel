<?php

namespace App\Support\Chatbot;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Support\Facades\Log;

/**
 * Las herramientas que el modelo puede usar para trabajar sobre el catálogo.
 *
 * Van contra Eloquent directamente, no contra la API HTTP de administración:
 * el chatbot corre dentro de la misma aplicación, así que pegarle a su propio
 * servidor por HTTP solo agregaría una vuelta de red y un token que mantener.
 * La API admin sigue existiendo para clientes de afuera.
 *
 * Toda herramienta devuelve un array que se serializa a JSON y vuelve al
 * modelo. Los errores también: un `tool_result` con `error` deja que el modelo
 * le explique al admin qué pasó, en vez de tumbar la conversación entera.
 */
class Herramientas
{
    /** Tope de resultados de búsqueda: en un chat nadie lee más que esto. */
    private const MAX_RESULTADOS = 10;

    /** @return array<int, array<string, mixed>> */
    public static function definiciones(): array
    {
        return [
            [
                'name' => 'buscar_productos',
                'description' => 'Busca productos del catálogo por nombre, finca o región. '
                    .'Úsala siempre antes de modificar algo, para confirmar de qué producto habla el admin y obtener su id. '
                    .'Sin término de búsqueda devuelve el catálogo completo.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'buscar' => [
                            'type' => 'string',
                            'description' => 'Texto a buscar. Puede ser parcial: "mirador", "huila", "geisha".',
                        ],
                        'solo_agotados' => [
                            'type' => 'boolean',
                            'description' => 'Si es true, devuelve únicamente los productos sin stock.',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'resumen_inventario',
                'description' => 'Panorama del inventario: cuántas bolsas hay en total, qué está agotado '
                    .'y qué está por acabarse. Úsala para preguntas generales como "¿cómo vamos?" o "¿qué falta pedir?".',
                'inputSchema' => ['type' => 'object', 'properties' => (object) []],
            ],
            [
                'name' => 'ajustar_stock',
                'description' => 'Cambia las bolsas disponibles de un producto. '
                    .'Elige la acción con cuidado: "sumar" cuando llega mercancía ("llegaron 12"), '
                    .'"restar" cuando salió ("vendí 3"), y "fijar" cuando el admin dice cuánto QUEDA en total ("quedan 8"). '
                    .'Si la frase es ambigua, pregúntale al admin antes de llamar esta herramienta.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'producto_id' => [
                            'type' => 'integer',
                            'description' => 'Id del producto, obtenido con buscar_productos.',
                        ],
                        'accion' => [
                            'type' => 'string',
                            'enum' => ['fijar', 'sumar', 'restar'],
                            'description' => 'fijar = dejar el stock en ese número; sumar/restar = movimiento relativo.',
                        ],
                        'cantidad' => [
                            'type' => 'integer',
                            'description' => 'Número de bolsas. Siempre positivo: la dirección la da la acción.',
                        ],
                    ],
                    'required' => ['producto_id', 'accion', 'cantidad'],
                ],
            ],
            [
                'name' => 'editar_producto',
                'description' => 'Cambia datos de un producto: precio, descripción, ficha de origen, '
                    .'o si está activo o destacado. Solo manda los campos que el admin pidió cambiar.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'producto_id' => ['type' => 'integer', 'description' => 'Id del producto.'],
                        'precio_cop' => [
                            'type' => 'integer',
                            'description' => 'Precio en pesos colombianos, entero y sin puntos. 48000, no 48.000.',
                        ],
                        'descripcion' => ['type' => 'string', 'description' => 'Descripción visible en el catálogo.'],
                        'notas' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'description' => 'Notas de cata como lista corta: ["panela", "mandarina", "cacao"].',
                        ],
                        'puntaje_sca' => ['type' => 'number', 'description' => 'Puntaje SCA, entre 0 y 100.'],
                        'activo' => [
                            'type' => 'boolean',
                            'description' => 'false lo saca del catálogo por completo. Agotado NO es lo mismo: '
                                .'un producto sin stock se sigue mostrando con su sello de AGOTADO.',
                        ],
                        'destacado' => ['type' => 'boolean', 'description' => 'Si aparece en la fila de destacados.'],
                    ],
                    'required' => ['producto_id'],
                ],
            ],
        ];
    }

    /**
     * Ejecuta una herramienta por nombre.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function ejecutar(string $nombre, array $input): array
    {
        try {
            return match ($nombre) {
                'buscar_productos' => self::buscarProductos($input),
                'resumen_inventario' => self::resumenInventario(),
                'ajustar_stock' => self::ajustarStock($input),
                'editar_producto' => self::editarProducto($input),
                default => ['error' => "No existe una herramienta llamada {$nombre}."],
            };
        } catch (\Throwable $e) {
            // El modelo recibe el error como resultado y se lo explica al
            // admin; la traza completa queda en el log para nosotros.
            Log::error('Chatbot: falló una herramienta', [
                'herramienta' => $nombre,
                'input' => $input,
                'error' => $e->getMessage(),
            ]);

            return ['error' => 'La operación falló por un problema técnico. Inténtalo de nuevo en un momento.'];
        }
    }

    /** @param array<string, mixed> $input */
    private static function buscarProductos(array $input): array
    {
        $query = Producto::with('categoria:id,nombre')->orderBy('categoria_id')->orderBy('orden');

        if ($buscar = trim((string) ($input['buscar'] ?? ''))) {
            $termino = '%'.str_replace('%', '\%', $buscar).'%';
            $query->where(fn ($q) => $q
                ->where('nombre', 'like', $termino)
                ->orWhere('finca', 'like', $termino)
                ->orWhere('region', 'like', $termino));
        }

        if ($input['solo_agotados'] ?? false) {
            $query->where('stock', '<=', 0);
        }

        $total = (clone $query)->count();
        $encontrados = $query->limit(self::MAX_RESULTADOS)->get();

        return [
            'total' => $total,
            // Se le avisa al modelo cuando la lista viene recortada, para que
            // pida acotar la búsqueda en vez de afirmar que eso es todo.
            'truncado' => $total > self::MAX_RESULTADOS,
            'productos' => $encontrados->map(fn (Producto $p) => self::resumir($p))->all(),
        ];
    }

    private static function resumenInventario(): array
    {
        $productos = Producto::where('activo', true)->get();

        return [
            'productos_activos' => $productos->count(),
            'bolsas_en_stock' => (int) $productos->sum('stock'),
            'agotados' => $productos->filter->agotado()
                ->map(fn (Producto $p) => ['id' => $p->id, 'nombre' => $p->nombre])->values()->all(),
            'por_acabarse' => $productos->filter->porAcabarse()
                ->map(fn (Producto $p) => ['id' => $p->id, 'nombre' => $p->nombre, 'stock' => $p->stock])->values()->all(),
        ];
    }

    /** @param array<string, mixed> $input */
    private static function ajustarStock(array $input): array
    {
        $producto = Producto::find($input['producto_id'] ?? null);
        if (! $producto) {
            return ['error' => 'No existe un producto con ese id. Búscalo primero con buscar_productos.'];
        }

        $accion = (string) ($input['accion'] ?? '');
        $cantidad = (int) ($input['cantidad'] ?? 0);

        if (! in_array($accion, ['fijar', 'sumar', 'restar'], true)) {
            return ['error' => 'La acción debe ser fijar, sumar o restar.'];
        }
        if ($cantidad < 0 || $cantidad > 100000) {
            return ['error' => 'La cantidad debe estar entre 0 y 100000.'];
        }

        [$antes, $despues] = $producto->ajustarStock($accion, $cantidad);

        return [
            'ok' => true,
            'producto' => $producto->nombre,
            'stock_antes' => $antes,
            'stock_despues' => $despues,
            'quedo_agotado' => $despues <= 0,
            'quedo_por_acabarse' => $producto->fresh()->porAcabarse(),
        ];
    }

    /** @param array<string, mixed> $input */
    private static function editarProducto(array $input): array
    {
        $producto = Producto::find($input['producto_id'] ?? null);
        if (! $producto) {
            return ['error' => 'No existe un producto con ese id. Búscalo primero con buscar_productos.'];
        }

        // Lista blanca explícita: el modelo no puede tocar `stock` por aquí
        // (para eso está ajustar_stock, que además deja el antes/después),
        // ni `categoria_id`, ni las rutas de imagen y video.
        $permitidos = ['precio_cop', 'descripcion', 'notas', 'puntaje_sca', 'activo', 'destacado'];
        $cambios = array_intersect_key($input, array_flip($permitidos));

        if (! $cambios) {
            return ['error' => 'No mandaste ningún campo para cambiar.'];
        }

        if (isset($cambios['precio_cop']) && (int) $cambios['precio_cop'] < 0) {
            return ['error' => 'El precio no puede ser negativo.'];
        }
        if (isset($cambios['puntaje_sca'])) {
            $puntaje = (float) $cambios['puntaje_sca'];
            if ($puntaje < 0 || $puntaje > 100) {
                return ['error' => 'El puntaje SCA debe estar entre 0 y 100.'];
            }
        }

        $antes = $producto->only(array_keys($cambios));
        $producto->update($cambios);

        return [
            'ok' => true,
            'producto' => $producto->nombre,
            'antes' => $antes,
            'despues' => $producto->fresh()->only(array_keys($cambios)),
        ];
    }

    /** @return array<string, mixed> */
    private static function resumir(Producto $p): array
    {
        return [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'categoria' => $p->categoria?->nombre,
            'precio_cop' => (int) $p->precio_cop,
            'gramos' => (int) $p->gramos,
            'stock' => (int) $p->stock,
            'stock_minimo' => (int) $p->stock_minimo,
            'agotado' => $p->agotado(),
            'por_acabarse' => $p->porAcabarse(),
            'activo' => (bool) $p->activo,
            'destacado' => (bool) $p->destacado,
            'finca' => $p->finca,
            'region' => $p->region,
        ];
    }

    /** Contexto fijo del catálogo: se arma una vez y se mete al system prompt. */
    public static function contextoCategorias(): string
    {
        $categorias = Categoria::orderBy('orden')->pluck('nombre')->implode(', ');

        return $categorias !== '' ? $categorias : '(sin categorías todavía)';
    }
}
