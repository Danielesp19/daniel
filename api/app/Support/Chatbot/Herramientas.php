<?php

namespace App\Support\Chatbot;

use App\Models\Categoria;
use App\Models\Hero;
use App\Models\Producto;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Todo lo que el modelo puede hacerle al sitio.
 *
 * Este conjunto es el panel de administración: la idea es que quien atiende el
 * negocio nunca tenga que abrir un navegador. Por eso hay herramientas para
 * crear productos, cambiar la portada y ponerle fotos a las cosas, no solo
 * para mover el inventario.
 *
 * Van contra Eloquent directamente, no contra la API HTTP de administración:
 * el chatbot corre dentro de la misma aplicación, así que pegarle a su propio
 * servidor por HTTP solo agregaría una vuelta de red y un token que mantener.
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
            // ── Consultar ────────────────────────────────────────────────────
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
                'name' => 'listar_categorias',
                'description' => 'Las categorías del catálogo con su id, cuántos productos tiene cada una '
                    .'y cómo se muestran. Úsala antes de crear un producto o de mover categorías de lugar.',
                'inputSchema' => ['type' => 'object', 'properties' => (object) []],
            ],

            // ── Inventario ───────────────────────────────────────────────────
            [
                'name' => 'ajustar_stock',
                'description' => 'Cambia las bolsas disponibles de un producto. '
                    .'Elige la acción con cuidado: "sumar" cuando llega mercancía ("llegaron 12"), '
                    .'"restar" cuando salió ("vendí 3"), y "fijar" cuando el admin dice cuánto QUEDA en total ("quedan 8"). '
                    .'Para marcar algo como agotado o sin stock, usa fijar con cantidad 0: el catálogo le pone solo el sello de AGOTADO. '
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

            // ── Productos ────────────────────────────────────────────────────
            [
                'name' => 'crear_producto',
                'description' => 'Agrega un producto nuevo al catálogo. Pide siempre categoría, nombre y precio '
                    .'antes de llamarla; el resto se puede completar después. '
                    .'Para un servicio (asesoría, clase, barra para eventos) pon controla_stock en false.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'categoria_id' => ['type' => 'integer', 'description' => 'Id de la categoría (ver listar_categorias).'],
                        'nombre' => ['type' => 'string', 'description' => 'Nombre visible del producto.'],
                        'precio_cop' => ['type' => 'integer', 'description' => 'Precio en pesos, entero y sin puntos: 48000.'],
                        'descripcion' => ['type' => 'string'],
                        'gramos' => ['type' => 'integer', 'description' => 'Peso de la bolsa. Usa 0 en servicios.'],
                        'stock' => ['type' => 'integer', 'description' => 'Bolsas disponibles ahora.'],
                        'controla_stock' => [
                            'type' => 'boolean',
                            'description' => 'false para servicios: se agendan, no se cuentan ni se agotan.',
                        ],
                        'finca' => ['type' => 'string'],
                        'productor' => ['type' => 'string'],
                        'region' => ['type' => 'string'],
                        'altitud_msnm' => ['type' => 'integer'],
                        'variedad' => ['type' => 'string'],
                        'proceso' => ['type' => 'string'],
                        'tueste' => ['type' => 'string'],
                        'notas' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'description' => 'Notas de cata: ["panela", "mandarina", "cacao"].',
                        ],
                        'puntaje_sca' => ['type' => 'number'],
                    ],
                    'required' => ['categoria_id', 'nombre', 'precio_cop'],
                ],
            ],
            [
                'name' => 'editar_producto',
                'description' => 'Cambia datos de un producto: precio, descripción, ficha de origen, '
                    .'o si está activo o destacado. Solo manda los campos que el admin pidió cambiar. '
                    .'Poner activo en false lo saca del catálogo por completo — eso NO es lo mismo que agotado, '
                    .'y hay que confirmarlo con el admin antes.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'producto_id' => ['type' => 'integer'],
                        'nombre' => ['type' => 'string'],
                        'precio_cop' => ['type' => 'integer', 'description' => 'En pesos, entero y sin puntos: 48000.'],
                        'descripcion' => ['type' => 'string'],
                        'categoria_id' => ['type' => 'integer', 'description' => 'Para mover el producto de categoría.'],
                        'gramos' => ['type' => 'integer'],
                        'finca' => ['type' => 'string'],
                        'productor' => ['type' => 'string'],
                        'region' => ['type' => 'string'],
                        'altitud_msnm' => ['type' => 'integer'],
                        'variedad' => ['type' => 'string'],
                        'proceso' => ['type' => 'string'],
                        'tueste' => ['type' => 'string'],
                        'notas' => ['type' => 'array', 'items' => ['type' => 'string']],
                        'puntaje_sca' => ['type' => 'number'],
                        'activo' => ['type' => 'boolean', 'description' => 'false lo esconde del catálogo.'],
                        'destacado' => ['type' => 'boolean'],
                        'orden' => ['type' => 'integer', 'description' => 'Posición dentro de su categoría; 0 va primero.'],
                    ],
                    'required' => ['producto_id'],
                ],
            ],
            [
                'name' => 'asignar_foto',
                'description' => 'Le pone al producto la última foto que envió el admin por el chat. '
                    .'Solo sirve si acaba de mandar una imagen; si no, avísale que la envíe primero. '
                    .'La foto anterior del producto se reemplaza.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'producto_id' => ['type' => 'integer', 'description' => 'A qué producto ponérsela.'],
                    ],
                    'required' => ['producto_id'],
                ],
            ],

            // ── Categorías y portada ─────────────────────────────────────────
            [
                'name' => 'crear_categoria',
                'description' => 'Crea una sección nueva del catálogo. '
                    .'modo_vitrina decide cómo se ve: "grid" es la grilla normal, "carrusel" es una fila que se '
                    .'corre de lado (buena cuando hay muchos productos), "vertical" son filas grandes '
                    .'alternadas (para lo más especial) y "horizontal" muestra uno a la vez para pasarlo '
                    .'deslizando (buena para videos).',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'nombre' => ['type' => 'string'],
                        'descripcion' => ['type' => 'string', 'description' => 'Se muestra bajo el título de la sección.'],
                        'modo_vitrina' => ['type' => 'string', 'enum' => ['grid', 'carrusel', 'vertical', 'horizontal']],
                        'orden' => ['type' => 'integer', 'description' => 'Posición de la sección en la página: 0 va primero. Para bajar una sección al final, ponle un número más alto que el de todas las demás.'],
                    ],
                    'required' => ['nombre'],
                ],
            ],
            [
                'name' => 'editar_categoria',
                'description' => 'Cambia el nombre, la descripción, el orden o la forma de mostrar una categoría. '
                    .'Poner activa en false esconde la sección entera del sitio: confírmalo antes.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'categoria_id' => ['type' => 'integer'],
                        'nombre' => ['type' => 'string'],
                        'descripcion' => ['type' => 'string'],
                        'modo_vitrina' => ['type' => 'string', 'enum' => ['grid', 'carrusel', 'vertical', 'horizontal']],
                        'orden' => ['type' => 'integer', 'description' => 'Posición de la sección en la página: 0 va primero. Sirve para subir o bajar una sección sin tocar las demás.'],
                        'activa' => ['type' => 'boolean'],
                    ],
                    'required' => ['categoria_id'],
                ],
            ],
            [
                'name' => 'editar_portada',
                'description' => 'Cambia los textos de la portada del sitio: la línea pequeña de arriba, '
                    .'el título grande, el párrafo debajo y el botón. Manda solo lo que quiera cambiar.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'titulo' => ['type' => 'string', 'description' => 'El título grande. Corto: dos o tres palabras.'],
                        'subtitulo' => ['type' => 'string', 'description' => 'El párrafo bajo el título.'],
                        'etiqueta' => ['type' => 'string', 'description' => 'La línea pequeña sobre el título.'],
                        'cta_texto' => ['type' => 'string', 'description' => 'Texto del botón.'],
                    ],
                    'required' => [],
                ],
            ],
        ];
    }

    /**
     * Ejecuta una herramienta por nombre.
     *
     * @param  array<string, mixed>  $input
     * @param  string  $de  Número del admin: identifica su foto en espera.
     * @return array<string, mixed>
     */
    public static function ejecutar(string $nombre, array $input, string $de = ''): array
    {
        try {
            $resultado = match ($nombre) {
                'buscar_productos' => self::buscarProductos($input),
                'resumen_inventario' => self::resumenInventario(),
                'listar_categorias' => self::listarCategorias(),
                'ajustar_stock' => self::ajustarStock($input),
                'crear_producto' => self::crearProducto($input),
                'editar_producto' => self::editarProducto($input),
                'asignar_foto' => self::asignarFoto($input, $de),
                'crear_categoria' => self::crearCategoria($input),
                'editar_categoria' => self::editarCategoria($input),
                'editar_portada' => self::editarPortada($input),
                default => ['error' => "No existe una herramienta llamada {$nombre}."],
            };

            // El aviso al sitio ya no se manda desde acá: lo disparan los
            // modelos al guardarse, así que también cubre al panel. Lo que sí
            // se agrega es el enlace, para que el admin abra y verifique.
            if (($resultado['ok'] ?? false) === true) {
                if ($url = config('tienda.sitio_url')) {
                    $resultado['ver_en'] = $url;
                }
            }

            return $resultado;
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

    // ── Consultas ───────────────────────────────────────────────────────────

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
            // Sin el filtro de controla_stock esto arrastraría todos los
            // servicios, que tienen el contador en cero por definición.
            $query->where('controla_stock', true)->where('stock', '<=', 0);
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
        // Solo lo que se cuenta: un resumen de inventario que incluyera las
        // asesorías no sería un resumen de inventario.
        $productos = Producto::where('activo', true)->where('controla_stock', true)->get();

        return [
            'productos_activos' => $productos->count(),
            'bolsas_en_stock' => (int) $productos->sum('stock'),
            'agotados' => $productos->filter->agotado()
                ->map(fn (Producto $p) => ['id' => $p->id, 'nombre' => $p->nombre])->values()->all(),
            'por_acabarse' => $productos->filter->porAcabarse()
                ->map(fn (Producto $p) => ['id' => $p->id, 'nombre' => $p->nombre, 'stock' => $p->stock])->values()->all(),
        ];
    }

    private static function listarCategorias(): array
    {
        return [
            'categorias' => Categoria::withCount('productos')->orderBy('orden')->get()
                ->map(fn (Categoria $c) => [
                    'id' => $c->id,
                    'nombre' => $c->nombre,
                    'descripcion' => $c->descripcion,
                    'modo_vitrina' => $c->modo_vitrina,
                    'productos' => $c->productos_count,
                    'orden' => $c->orden,
                    'activa' => (bool) $c->activa,
                ])->all(),
        ];
    }

    // ── Inventario ──────────────────────────────────────────────────────────

    /** @param array<string, mixed> $input */
    private static function ajustarStock(array $input): array
    {
        $producto = Producto::find($input['producto_id'] ?? null);
        if (! $producto) {
            return ['error' => 'No existe un producto con ese id. Búscalo primero con buscar_productos.'];
        }

        if (! $producto->controla_stock) {
            return ['error' => "\"{$producto->nombre}\" es un servicio: se agenda, no se cuenta en bolsas. No tiene stock que ajustar."];
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

    // ── Productos ───────────────────────────────────────────────────────────

    /** Campos que el modelo puede escribir en un producto. */
    private const CAMPOS_PRODUCTO = [
        'nombre', 'descripcion', 'precio_cop', 'gramos', 'controla_stock',
        'finca', 'productor', 'region', 'altitud_msnm', 'variedad', 'proceso',
        'tueste', 'notas', 'puntaje_sca', 'activo', 'destacado', 'orden',
    ];

    /** @param array<string, mixed> $input */
    private static function crearProducto(array $input): array
    {
        $categoria = Categoria::find($input['categoria_id'] ?? null);
        if (! $categoria) {
            return ['error' => 'No existe esa categoría. Míralas con listar_categorias.'];
        }

        $nombre = trim((string) ($input['nombre'] ?? ''));
        if ($nombre === '') {
            return ['error' => 'Falta el nombre del producto.'];
        }

        $datos = array_intersect_key($input, array_flip(self::CAMPOS_PRODUCTO));
        $datos['nombre'] = $nombre;
        // El stock se acepta al crear aunque no esté en CAMPOS_PRODUCTO: ahí
        // sí es un valor inicial, no un movimiento de inventario.
        $datos['stock'] = max(0, (int) ($input['stock'] ?? 0));

        if ($error = self::validar($datos)) {
            return ['error' => $error];
        }

        $producto = $categoria->productos()->create($datos);

        return [
            'ok' => true,
            'creado' => self::resumir($producto->fresh('categoria')),
            'aviso' => 'Queda sin foto. Mándame una imagen por el chat y te la asigno.',
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
        // (para eso está ajustar_stock, que además deja el antes/después) ni
        // las rutas de imagen y video (para eso está asignar_foto).
        $cambios = array_intersect_key($input, array_flip(self::CAMPOS_PRODUCTO));

        if (isset($input['categoria_id'])) {
            if (! Categoria::find($input['categoria_id'])) {
                return ['error' => 'No existe esa categoría. Míralas con listar_categorias.'];
            }
            $cambios['categoria_id'] = (int) $input['categoria_id'];
        }

        if (! $cambios) {
            return ['error' => 'No mandaste ningún campo para cambiar.'];
        }
        if ($error = self::validar($cambios)) {
            return ['error' => $error];
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

    /**
     * Engancha al producto la última foto que llegó por el chat.
     *
     * @param  array<string, mixed>  $input
     */
    private static function asignarFoto(array $input, string $de): array
    {
        $producto = Producto::find($input['producto_id'] ?? null);
        if (! $producto) {
            return ['error' => 'No existe un producto con ese id. Búscalo primero con buscar_productos.'];
        }

        $llave = Asistente::llaveFotoDe($de);
        $ruta = Cache::get($llave);

        if (! $ruta) {
            return ['error' => 'No hay ninguna foto reciente en el chat. Pídele que la envíe y vuelve a intentarlo.'];
        }

        $anterior = $producto->imagen;
        $producto->update(['imagen' => $ruta]);

        // La foto se consume: si no, un "ponle esta misma al otro" seguido de
        // un descuido dejaría la misma imagen en media docena de productos.
        Cache::forget($llave);

        // La imagen vieja ya no la referencia nadie. Borrarla evita que el
        // disco crezca sin control a punta de fotos reemplazadas.
        if ($anterior && $anterior !== $ruta) {
            Storage::disk('public')->delete($anterior);
        }

        return [
            'ok' => true,
            'producto' => $producto->nombre,
            'mensaje' => 'Foto actualizada.',
        ];
    }

    // ── Categorías y portada ────────────────────────────────────────────────

    /** @param array<string, mixed> $input */
    private static function crearCategoria(array $input): array
    {
        $nombre = trim((string) ($input['nombre'] ?? ''));
        if ($nombre === '') {
            return ['error' => 'Falta el nombre de la categoría.'];
        }

        $modo = (string) ($input['modo_vitrina'] ?? 'grid');
        if (! in_array($modo, Categoria::VITRINAS, true)) {
            return ['error' => 'El modo debe ser grid, vertical u horizontal.'];
        }

        $categoria = Categoria::create([
            'nombre' => $nombre,
            'descripcion' => $input['descripcion'] ?? null,
            'modo_vitrina' => $modo,
            // Al final de la página si no dice dónde: menos sorpresas que
            // meterla de primeras y descuadrarle el orden que ya tenía.
            'orden' => (int) ($input['orden'] ?? ((int) Categoria::max('orden') + 1)),
        ]);

        return [
            'ok' => true,
            'creada' => ['id' => $categoria->id, 'nombre' => $categoria->nombre],
            'aviso' => 'La sección no sale en el sitio hasta que tenga al menos un producto.',
        ];
    }

    /** @param array<string, mixed> $input */
    private static function editarCategoria(array $input): array
    {
        $categoria = Categoria::find($input['categoria_id'] ?? null);
        if (! $categoria) {
            return ['error' => 'No existe esa categoría. Míralas con listar_categorias.'];
        }

        $cambios = array_intersect_key($input, array_flip(['nombre', 'descripcion', 'modo_vitrina', 'orden', 'activa']));
        if (! $cambios) {
            return ['error' => 'No mandaste ningún campo para cambiar.'];
        }
        if (isset($cambios['modo_vitrina']) && ! in_array($cambios['modo_vitrina'], Categoria::VITRINAS, true)) {
            return ['error' => 'El modo debe ser grid, vertical u horizontal.'];
        }

        $antes = $categoria->only(array_keys($cambios));
        $categoria->update($cambios);

        return ['ok' => true, 'categoria' => $categoria->nombre, 'antes' => $antes, 'despues' => $cambios];
    }

    /** @param array<string, mixed> $input */
    private static function editarPortada(array $input): array
    {
        $cambios = array_intersect_key($input, array_flip(['titulo', 'subtitulo', 'etiqueta', 'cta_texto']));
        if (! $cambios) {
            return ['error' => 'No mandaste ningún texto para cambiar.'];
        }

        // Solo hay una portada; si todavía no existe se crea con lo que mandó.
        $hero = Hero::where('activo', true)->orderBy('orden')->first();
        if (! $hero) {
            $hero = Hero::create($cambios + ['titulo' => $cambios['titulo'] ?? 'Café', 'activo' => true]);

            return ['ok' => true, 'mensaje' => 'Portada creada.', 'despues' => $hero->only(array_keys($cambios))];
        }

        $antes = $hero->only(array_keys($cambios));
        $hero->update($cambios);

        return ['ok' => true, 'antes' => $antes, 'despues' => $cambios];
    }

    // ── Utilidades ──────────────────────────────────────────────────────────

    /**
     * Chequeos que el esquema JSON no cubre. Devuelve el error o null.
     *
     * @param  array<string, mixed>  $datos
     */
    private static function validar(array $datos): ?string
    {
        if (isset($datos['precio_cop']) && (int) $datos['precio_cop'] < 0) {
            return 'El precio no puede ser negativo.';
        }
        if (isset($datos['gramos']) && (int) $datos['gramos'] < 0) {
            return 'El peso no puede ser negativo.';
        }
        if (isset($datos['puntaje_sca'])) {
            $puntaje = (float) $datos['puntaje_sca'];
            if ($puntaje < 0 || $puntaje > 100) {
                return 'El puntaje SCA debe estar entre 0 y 100.';
            }
        }
        if (isset($datos['altitud_msnm'])) {
            $altura = (int) $datos['altitud_msnm'];
            if ($altura < 0 || $altura > 4000) {
                return 'La altura debe estar entre 0 y 4000 msnm.';
            }
        }
        if (isset($datos['notas']) && is_array($datos['notas']) && count($datos['notas']) > 6) {
            return 'Máximo seis notas de cata.';
        }

        return null;
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
            // Los servicios no se cuentan en bolsas: se le dice al modelo en
            // vez de mandarle un stock en cero que interpretaría como agotado.
            'tipo' => $p->controla_stock ? 'producto' : 'servicio',
            'stock' => $p->controla_stock ? (int) $p->stock : null,
            'stock_minimo' => $p->controla_stock ? (int) $p->stock_minimo : null,
            'agotado' => $p->agotado(),
            'por_acabarse' => $p->porAcabarse(),
            'tiene_foto' => (bool) $p->imagen,
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
