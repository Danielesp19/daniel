<?php

namespace App\Support\Chatbot;

use App\Models\Categoria;
use App\Models\ConsumoChatbot;
use App\Models\KitPieza;
use App\Models\Producto;
use App\Models\Sede;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Todo lo que el modelo puede hacerle al sitio.
 *
 * Este conjunto es el panel de administración: la idea es que quien atiende el
 * negocio nunca tenga que abrir un navegador. Por eso hay herramientas para
 * crear productos y ponerle fotos a las cosas, no solo
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
                'name' => 'consumo_del_mes',
                'description' => 'Cuánto lleva gastado el bot en lo que va del mes y cuánto le queda de tope. '
                    .'Úsala cuando el admin pregunte por el costo, el gasto o el saldo del chat. '
                    .'No tiene nada que ver con las ventas ni con el inventario.',
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
                'description' => 'Cambia las bolsas disponibles de un producto EN UNA SEDE. '
                    .'Elige la acción con cuidado: "sumar" cuando llega mercancía ("llegaron 12"), '
                    .'"restar" cuando salió ("vendí 3"), y "fijar" cuando el admin dice cuánto QUEDA en esa sede ("quedan 8"). '
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
                        'sede' => [
                            'type' => 'string',
                            'description' => 'NOMBRE de la sede donde se mueve el inventario, tal como lo dijo el admin '
                                .'("el centro", "Bogotá"). No es un id. Si el admin no dijo en cuál, PREGÚNTALE antes: '
                                .'mover bolsas en la sede equivocada daña dos inventarios. Solo se puede omitir cuando la tienda '
                                .'tiene una única sede.',
                        ],
                    ],
                    'required' => ['producto_id', 'accion', 'cantidad'],
                ],
            ],
            [
                'name' => 'listar_sedes',
                'description' => 'Las sedes de la tienda con su ciudad, dirección y cuántas bolsas tiene cada una en total. '
                    .'Úsala cuando necesites saber qué sedes existen para preguntarle al admin en cuál mover el inventario, '
                    .'o cuando pregunte "¿dónde está?" o "¿cómo va tal sede?".',
                'inputSchema' => ['type' => 'object', 'properties' => (object) []],
            ],

            // ── Productos ────────────────────────────────────────────────────
            [
                'name' => 'crear_producto',
                'description' => 'Agrega un producto nuevo al catálogo. Pide siempre categoría, nombre y precio '
                    .'antes de llamarla; el resto se puede completar después. '
                    .'Para un servicio (asesoría, clase, barra para eventos) pon controla_stock en false. '
                    .'Si lo que va a crear es un KIT —algo que trae varias cosas adentro— usa crear_kit, no esta.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'categoria_id' => ['type' => 'integer', 'description' => 'Id de la categoría (ver listar_categorias).'],
                        'nombre' => ['type' => 'string', 'description' => 'Nombre visible del producto.'],
                        'precio_cop' => ['type' => 'integer', 'description' => 'Precio en pesos, entero y sin puntos: 48000.'],
                        'descripcion' => ['type' => 'string'],
                        'gramos' => ['type' => 'integer', 'description' => 'Peso de la bolsa. Usa 0 en servicios.'],
                        'stock' => ['type' => 'integer', 'description' => 'Bolsas disponibles ahora.'],
                        'stock_minimo' => [
                            'type' => 'integer',
                            'description' => 'A partir de cuántas bolsas avisar que se está acabando. Por defecto 3.',
                        ],
                        'controla_stock' => [
                            'type' => 'boolean',
                            'description' => 'false para servicios: se agendan, no se cuentan ni se agotan.',
                        ],
                        'es_cafe' => [
                            'type' => 'boolean',
                            'description' => 'true si es un café. Es lo que hace que la página le pinte la ficha de origen '
                                .'(finca, región, altura, variedad, proceso, puntaje). Un molino o una prensa van en false: '
                                .'sin esto la ficha sale vacía. Si mandas datos de finca o región, esto tiene que ir en true.',
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
                        'stock_minimo' => [
                            'type' => 'integer',
                            'description' => 'A partir de cuántas bolsas avisar que se está acabando.',
                        ],
                        'es_cafe' => [
                            'type' => 'boolean',
                            'description' => 'true prende la ficha de origen en la página. Ponlo en true si le estás '
                                .'agregando finca, región, variedad o proceso a un producto que no la tenía.',
                        ],
                        'componentes' => [
                            'type' => 'array',
                            'items' => ['type' => 'integer'],
                            'description' => 'Ids de los productos del catálogo que vienen dentro, si es un kit. '
                                .'Reemplaza la lista completa: manda TODOS los que debe traer, no solo los nuevos. '
                                .'Una lista vacía le quita todos los componentes.',
                        ],
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
                'description' => 'Toma una de las fotos que el admin mandó por el chat y la pone donde digas: '
                    .'de portada de un producto, como foto adicional de su galería, o en una pieza de un kit. '
                    .'Solo sirve si hay fotos esperando; si no, avísale que la envíe primero. '
                    .'La foto se consume: queda usada y sale de la cola.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'producto_id' => [
                            'type' => 'integer',
                            'description' => 'El producto. Si es para una pieza, el id del KIT que la contiene.',
                        ],
                        'numero_foto' => [
                            'type' => 'integer',
                            'description' => 'Cuál de las fotos en espera, contando desde 1 por orden de llegada. '
                                .'Se puede omitir SOLO si hay una sola esperando. Con varias es obligatorio: '
                                .'míralas con fotos_pendientes y pregúntale al admin si no está claro.',
                        ],
                        'pieza' => [
                            'type' => 'string',
                            'description' => 'Nombre de la pieza del kit a la que va la foto ("filtros", "cuchara"). '
                                .'Solo para kits. Si se omite, la foto va al producto.',
                        ],
                        'modo' => [
                            'type' => 'string',
                            'enum' => ['portada', 'agregar'],
                            'description' => 'portada (por defecto) la pone de primera y reemplaza la imagen que '
                                .'estaba de portada; agregar la suma al final de la galería sin quitar ninguna. '
                                .'Usa agregar cuando el admin mande varias fotos del mismo producto.',
                        ],
                    ],
                    'required' => ['producto_id'],
                ],
            ],
            [
                'name' => 'fotos_pendientes',
                'description' => 'Qué fotos mandó el admin y siguen sin asignar, en orden de llegada con su número '
                    .'y la hora. Úsala cuando haya más de una esperando y necesites preguntarle cuál va dónde.',
                'inputSchema' => ['type' => 'object', 'properties' => (object) []],
            ],

            // ── Kits ─────────────────────────────────────────────────────────
            [
                'name' => 'crear_kit',
                'description' => 'Crea un kit: un producto que se vende como una sola cosa pero trae varias adentro. '
                    .'Las PIEZAS son cosas que solo existen dentro del kit y no se venden sueltas (filtros, cuchara '
                    .'medidora): van por nombre. Los COMPONENTES son productos que ya están en el catálogo y también '
                    .'vienen adentro: van por id. Crea el kit primero y pídele las fotos de las piezas después.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'categoria_id' => ['type' => 'integer', 'description' => 'Id de la categoría (ver listar_categorias).'],
                        'nombre' => ['type' => 'string'],
                        'precio_cop' => ['type' => 'integer', 'description' => 'Precio del kit completo, en pesos enteros.'],
                        'descripcion' => ['type' => 'string'],
                        'piezas' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'description' => 'Nombres de las piezas que no se venden sueltas: ["filtros de papel", '
                                .'"cuchara medidora"]. Máximo 12.',
                        ],
                        'componentes' => [
                            'type' => 'array',
                            'items' => ['type' => 'integer'],
                            'description' => 'Ids de productos del catálogo que vienen dentro. Búscalos antes con '
                                .'buscar_productos; nunca inventes un id. Máximo 12.',
                        ],
                        'stock' => ['type' => 'integer', 'description' => 'Cuántos kits hay armados y listos.'],
                        'sede' => [
                            'type' => 'string',
                            'description' => 'Sede donde están esos kits armados. Igual que en ajustar_stock: si hay '
                                .'varias sedes y no dijo cuál, pregúntale.',
                        ],
                    ],
                    'required' => ['categoria_id', 'nombre', 'precio_cop'],
                ],
            ],
            [
                'name' => 'editar_piezas_kit',
                'description' => 'Agrega, quita o renombra las piezas de un kit que ya existe. Trabaja de a una cosa '
                    .'por llamada. Renombrar conserva la foto de la pieza; quitar la borra.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'producto_id' => ['type' => 'integer', 'description' => 'El kit.'],
                        'accion' => [
                            'type' => 'string',
                            'enum' => ['agregar', 'quitar', 'renombrar'],
                        ],
                        'piezas' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'description' => 'Para agregar: los nombres de las piezas nuevas.',
                        ],
                        'pieza' => [
                            'type' => 'string',
                            'description' => 'Para quitar o renombrar: el nombre de la pieza actual. '
                                .'Puede ser parcial mientras no calce con dos.',
                        ],
                        'nombre_nuevo' => ['type' => 'string', 'description' => 'Para renombrar.'],
                    ],
                    'required' => ['producto_id', 'accion'],
                ],
            ],

            // ── Categorías ───────────────────────────────────────────────────
            [
                'name' => 'crear_categoria',
                'description' => 'Crea una sección nueva del catálogo. '
                    .'modo_vitrina decide cómo se acomoda lo que va dentro: "carrusel" es una fila que se corre '
                    .'de lado (buena cuando hay muchos productos), "dos" los pone de a dos por fila y "bandas" '
                    .'son franjas anchas de lado a lado (para lo más especial). '
                    .'Si el admin no pide nada en particular, deja carrusel.',
                'inputSchema' => [
                    'type' => 'object',
                    'properties' => [
                        'nombre' => ['type' => 'string'],
                        'descripcion' => ['type' => 'string', 'description' => 'Se muestra bajo el título de la sección.'],
                        'modo_vitrina' => ['type' => 'string', 'enum' => ['carrusel', 'dos', 'bandas']],
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
                        'modo_vitrina' => ['type' => 'string', 'enum' => ['carrusel', 'dos', 'bandas']],
                        'orden' => ['type' => 'integer', 'description' => 'Posición de la sección en la página: 0 va primero. Sirve para subir o bajar una sección sin tocar las demás.'],
                        'activa' => ['type' => 'boolean'],
                    ],
                    'required' => ['categoria_id'],
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
                'listar_sedes' => self::listarSedes(),
                'ajustar_stock' => self::ajustarStock($input),
                'crear_producto' => self::crearProducto($input),
                'editar_producto' => self::editarProducto($input),
                'crear_kit' => self::crearKit($input),
                'editar_piezas_kit' => self::editarPiezasKit($input),
                'asignar_foto' => self::asignarFoto($input, $de),
                'fotos_pendientes' => self::fotosPendientes($de),
                'crear_categoria' => self::crearCategoria($input),
                'editar_categoria' => self::editarCategoria($input),
                'consumo_del_mes' => self::consumoDelMes(),
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

        $sede = self::resolverSede($input['sede'] ?? null);

        // Cuando no se puede saber en qué estante mover las bolsas, esto
        // devuelve el error con la lista de sedes y el modelo pregunta. Es a
        // propósito que no adivine: descontar en la sede equivocada deja dos
        // inventarios malos en vez de uno.
        if (! $sede instanceof Sede) {
            return $sede;
        }

        [$antes, $despues, $total] = $producto->ajustarStockSede($sede, $accion, $cantidad);

        return [
            'ok' => true,
            'producto' => $producto->nombre,
            'sede' => $sede->nombre,
            'stock_antes' => $antes,
            'stock_despues' => $despues,
            // El total manda para el catálogo: un producto con cero en esta
            // sede pero tres en otra NO está agotado para el cliente, y el
            // modelo tiene que poder decirlo así.
            'stock_total' => $total,
            'quedo_agotado_en_sede' => $despues <= 0,
            'quedo_agotado' => $total <= 0,
            'quedo_por_acabarse' => $producto->fresh()->porAcabarse(),
        ];
    }

    /**
     * Traduce a una sede el nombre que el admin escribió por chat.
     *
     * Devuelve la Sede, o el arreglo de error que el modelo debe leer para
     * volver a preguntar. Nunca elige por su cuenta entre varias.
     *
     * @return Sede|array<string, mixed>
     */
    private static function resolverSede(mixed $nombre): Sede|array
    {
        $nombre = is_string($nombre) ? trim($nombre) : '';
        $disponibles = Sede::visibles();

        if ($disponibles->isEmpty()) {
            return ['error' => 'No hay ninguna sede activa. Hay que crear una en el panel antes de mover inventario.'];
        }

        // Una sola sede: no hay nada que preguntar, y exigir el nombre volvería
        // insoportable el chat de una tienda de un solo local.
        if ($disponibles->count() === 1 && $nombre === '') {
            return $disponibles->first();
        }

        if ($nombre === '') {
            return [
                'error' => 'Falta saber en qué sede. Pregúntale al admin en cuál y vuelve a llamar la herramienta.',
                'sedes' => $disponibles->pluck('nombre')->all(),
            ];
        }

        $encontradas = Sede::buscarPorNombre($nombre);

        if ($encontradas->isEmpty()) {
            return [
                'error' => "No hay ninguna sede que se parezca a \"{$nombre}\".",
                'sedes' => $disponibles->pluck('nombre')->all(),
            ];
        }

        if ($encontradas->count() > 1) {
            return [
                'error' => "\"{$nombre}\" calza con más de una sede. Pregúntale al admin a cuál se refiere.",
                'sedes' => $encontradas->pluck('nombre')->all(),
            ];
        }

        return $encontradas->first();
    }

    /** Las sedes con lo que hay en cada una: el "¿dónde está?" del inventario. */
    private static function listarSedes(): array
    {
        return [
            'sedes' => Sede::visibles()->map(fn (Sede $s) => [
                'nombre' => $s->nombre,
                'ciudad' => $s->ciudad,
                'direccion' => $s->direccion,
                'principal' => (bool) $s->principal,
                'bolsas_en_stock' => (int) $s->productos()->sum('producto_sede.stock'),
            ])->all(),
        ];
    }

    // ── Productos ───────────────────────────────────────────────────────────

    /**
     * Campos que el modelo puede escribir en un producto.
     *
     * `stock` NO está, y es a propósito: es la suma de las sedes, y escribirlo
     * directo descuadra el desglose. Para moverlo está ajustar_stock.
     * `es_kit` tampoco: lo pone crear_kit, porque un kit sin piezas ni
     * componentes es solo un producto con una bandera que no significa nada.
     */
    private const CAMPOS_PRODUCTO = [
        'nombre', 'descripcion', 'precio_cop', 'gramos', 'controla_stock',
        'stock_minimo', 'es_cafe',
        'finca', 'productor', 'region', 'altitud_msnm', 'variedad', 'proceso',
        'tueste', 'notas', 'puntaje_sca', 'activo', 'destacado', 'orden',
    ];

    /** Tope de piezas y de componentes de un kit, el mismo que usa el panel. */
    private const MAX_PIEZAS = 12;

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
        // Nace en cero SIEMPRE. El stock inicial, si viene, entra después como
        // un movimiento de sede: la columna es la suma de las sedes y escribirla
        // aquí dejaría un total sin bolsas detrás que lo respalden.
        $datos['stock'] = 0;

        if ($error = self::validar($datos)) {
            return ['error' => $error];
        }

        $inicial = max(0, (int) ($input['stock'] ?? 0));
        $controlaStock = $datos['controla_stock'] ?? true;
        $sede = null;

        // Se resuelve ANTES de crear: si hay que preguntar en qué sede, mejor
        // preguntar sobre un producto que todavía no existe que dejar uno
        // creado a medias y que el modelo lo cree otra vez al reintentar.
        if ($inicial > 0 && $controlaStock) {
            $sede = self::resolverSede($input['sede'] ?? null);

            if (! $sede instanceof Sede) {
                return $sede;
            }
        }

        $producto = $categoria->productos()->create($datos);

        if ($sede) {
            $producto->ajustarStockSede($sede, 'fijar', $inicial);
        }

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

        // Los componentes no son una columna, así que van por su lado. Solo
        // se tocan si el campo viene: sin eso, cambiarle el precio a un kit
        // le vaciaría lo que trae adentro.
        $componentes = null;
        if (array_key_exists('componentes', $input)) {
            $componentes = self::idsDeComponentes($input['componentes'], $producto->id);

            if (isset($componentes['error'])) {
                return $componentes;
            }
        }

        if (! $cambios && $componentes === null) {
            return ['error' => 'No mandaste ningún campo para cambiar.'];
        }
        if ($error = self::validar($cambios)) {
            return ['error' => $error];
        }

        $antes = $producto->only(array_keys($cambios));

        if ($cambios) {
            $producto->update($cambios);
        }

        if ($componentes !== null) {
            $producto->componentes()->sync(array_combine(
                $componentes,
                array_map(static fn (int $i) => ['orden' => $i], array_keys($componentes)),
            ));

            // Con algo adentro es un kit; sin nada, deja de serlo. Así la
            // bandera no se queda mintiendo después de vaciarle los
            // componentes a un producto que además no tiene piezas.
            $producto->update([
                'es_kit' => $componentes !== [] || $producto->piezas()->exists(),
            ]);
        }

        $resultado = [
            'ok' => true,
            'producto' => $producto->nombre,
            'antes' => $antes,
            'despues' => $producto->fresh()->only(array_keys($cambios)),
        ];

        if ($componentes !== null) {
            $resultado['componentes_ahora'] = $producto->componentes()->pluck('nombre')->all();
        }

        return $resultado;
    }

    /**
     * Engancha una de las fotos que están haciendo fila.
     *
     * @param  array<string, mixed>  $input
     */
    private static function asignarFoto(array $input, string $de): array
    {
        $producto = Producto::find($input['producto_id'] ?? null);
        if (! $producto) {
            return ['error' => 'No existe un producto con ese id. Búscalo primero con buscar_productos.'];
        }

        $enEspera = ColaDeFotos::cuantas($de);
        if ($enEspera === 0) {
            return ['error' => 'No hay ninguna foto esperando. Pídele que la envíe y vuelve a intentarlo.'];
        }

        $numero = isset($input['numero_foto']) ? (int) $input['numero_foto'] : null;

        // Con varias fotos en espera y sin número, la cola devuelve null en
        // vez de elegir una: adivinar aquí es ponerle al café la foto del
        // molino, y eso no se nota hasta que un cliente abre la página.
        if ($numero === null && $enEspera > 1) {
            return [
                'error' => "Hay {$enEspera} fotos esperando y no dijiste cuál. Mira fotos_pendientes y "
                    .'pregúntale al admin cuál va aquí.',
                'fotos_en_espera' => $enEspera,
            ];
        }

        if ($numero !== null && ($numero < 1 || $numero > $enEspera)) {
            return ['error' => "No hay una foto número {$numero}. En espera hay {$enEspera}."];
        }

        // Si va a una pieza, se resuelve ANTES de sacar la foto de la cola:
        // una pieza mal nombrada no puede costarle al admin volver a mandar
        // la imagen.
        $pieza = null;
        if ($nombrePieza = trim((string) ($input['pieza'] ?? ''))) {
            $pieza = self::buscarPieza($producto, $nombrePieza);

            if (! $pieza instanceof KitPieza) {
                return $pieza;
            }
        }

        $ruta = ColaDeFotos::tomar($de, $numero);
        if ($ruta === null) {
            return ['error' => 'Esa foto ya no está en la cola. Pídele que la reenvíe.'];
        }

        return $pieza
            ? self::fotoAPieza($pieza, $producto, $ruta)
            : self::fotoAProducto($producto, $ruta, (string) ($input['modo'] ?? 'portada'));
    }

    /** @return array<string, mixed> */
    private static function fotoAProducto(Producto $producto, string $ruta, string $modo): array
    {
        // El tope del panel, respetado también por acá: más medios de los que
        // el formulario puede editar dejaría fotos que solo se ven en la
        // página y que no hay cómo quitar sin entrar a la base.
        if ($producto->medios()->count() >= 8) {
            Storage::disk('public')->delete($ruta);

            return ['error' => "\"{$producto->nombre}\" ya tiene 8 fotos, que es el máximo. "
                .'Hay que quitarle alguna desde el panel antes de agregar otra.'];
        }

        if ($modo === 'agregar') {
            $producto->medios()->create([
                'tipo' => 'imagen',
                'ruta' => $ruta,
                'orden' => (int) $producto->medios()->max('orden') + 1,
            ]);

            return [
                'ok' => true,
                'producto' => $producto->nombre,
                'mensaje' => 'Foto agregada a la galería, al final.',
                'fotos_ahora' => $producto->medios()->count(),
            ];
        }

        // Portada: entra de primera, que es lo que espera quien manda una
        // foto diciendo "ponle esta".
        $anterior = $producto->medios()->where('tipo', 'imagen')->orderBy('orden')->first();
        $producto->medios()->create(['tipo' => 'imagen', 'ruta' => $ruta, 'orden' => -1]);
        foreach ($producto->medios()->orderBy('orden')->get()->values() as $i => $m) {
            $m->update(['orden' => $i]);
        }

        // La imagen vieja ya no la referencia nadie. Borrarla evita que el
        // disco crezca sin control a punta de fotos reemplazadas.
        if ($anterior && $anterior->ruta !== $ruta) {
            Storage::disk('public')->delete($anterior->ruta);
            $anterior->delete();
        }

        return [
            'ok' => true,
            'producto' => $producto->nombre,
            'mensaje' => $anterior ? 'Foto de portada reemplazada.' : 'Foto de portada puesta.',
        ];
    }

    /** @return array<string, mixed> */
    private static function fotoAPieza(KitPieza $pieza, Producto $kit, string $ruta): array
    {
        $anterior = $pieza->imagen;
        $pieza->update(['imagen' => $ruta]);

        if ($anterior && $anterior !== $ruta) {
            Storage::disk('public')->delete($anterior);
        }

        // Las piezas cuelgan del kit, y guardarlas no dispara la regeneración
        // del sitio —esa vive en Producto—, así que se toca el kit para que
        // la foto nueva se vea sin esperar el minuto del caché.
        $kit->touch();

        return [
            'ok' => true,
            'kit' => $kit->nombre,
            'pieza' => $pieza->nombre,
            'mensaje' => $anterior ? 'Foto de la pieza reemplazada.' : 'Foto puesta a la pieza.',
        ];
    }

    /** Lo que sigue esperando, numerado como lo cuenta el admin. */
    private static function fotosPendientes(string $de): array
    {
        $cola = ColaDeFotos::pendientes($de);

        if ($cola === []) {
            return ['fotos' => [], 'mensaje' => 'No hay fotos esperando.'];
        }

        return [
            'fotos' => array_map(
                static fn (int $i, array $foto) => ['numero' => $i + 1, 'recibida' => $foto['recibida']],
                array_keys($cola),
                $cola,
            ),
            'mensaje' => 'Van en orden de llegada. No se puede ver qué muestra cada una: '
                .'si no sabes cuál es cuál, pregúntale al admin por la hora o por el orden en que las mandó.',
        ];
    }

    // ── Kits ────────────────────────────────────────────────────────────────

    /** @param array<string, mixed> $input */
    private static function crearKit(array $input): array
    {
        $categoria = Categoria::find($input['categoria_id'] ?? null);
        if (! $categoria) {
            return ['error' => 'No existe esa categoría. Míralas con listar_categorias.'];
        }

        $nombre = trim((string) ($input['nombre'] ?? ''));
        if ($nombre === '') {
            return ['error' => 'Falta el nombre del kit.'];
        }

        $piezas = self::nombresDePiezas($input['piezas'] ?? []);
        if (count($piezas) > self::MAX_PIEZAS) {
            return ['error' => 'Un kit no puede tener más de '.self::MAX_PIEZAS.' piezas.'];
        }

        $componentes = self::idsDeComponentes($input['componentes'] ?? []);
        if (is_array($componentes) && isset($componentes['error'])) {
            return $componentes;
        }

        if ($piezas === [] && $componentes === []) {
            return ['error' => 'Un kit sin piezas ni componentes es un producto normal. '
                .'Pregúntale al admin qué trae adentro, o créalo con crear_producto.'];
        }

        $datos = array_intersect_key($input, array_flip(self::CAMPOS_PRODUCTO));
        $datos['nombre'] = $nombre;
        $datos['es_kit'] = true;
        // Igual que en crear_producto: nace en cero y el stock inicial entra
        // después como movimiento de sede, para que el total siempre tenga
        // bolsas de verdad detrás.
        $datos['stock'] = 0;

        if ($error = self::validar($datos)) {
            return ['error' => $error];
        }

        $inicial = max(0, (int) ($input['stock'] ?? 0));
        $sede = null;

        // Se resuelve antes de crear nada: si hay que preguntar en qué sede,
        // mejor preguntarlo sobre un kit que todavía no existe que dejar uno
        // a medias y que el modelo lo cree dos veces al reintentar.
        if ($inicial > 0) {
            $sede = self::resolverSede($input['sede'] ?? null);

            if (! $sede instanceof Sede) {
                return $sede;
            }
        }

        $kit = DB::transaction(function () use ($categoria, $datos, $piezas, $componentes) {
            $kit = $categoria->productos()->create($datos);

            $kit->piezas()->createMany(array_map(
                static fn (string $pieza, int $i) => ['nombre' => $pieza, 'orden' => $i],
                $piezas,
                array_keys($piezas),
            ));

            if ($componentes !== []) {
                $kit->componentes()->sync(array_combine(
                    $componentes,
                    array_map(static fn (int $i) => ['orden' => $i], array_keys($componentes)),
                ));
            }

            return $kit;
        });

        if ($sede) {
            $kit->ajustarStockSede($sede, 'fijar', $inicial);
        }

        return [
            'ok' => true,
            'creado' => self::resumir($kit->fresh(['categoria', 'piezas', 'componentes'])),
            'aviso' => $piezas === []
                ? 'Queda sin foto. Mándame una imagen y te la asigno.'
                : 'Las piezas quedaron sin foto. Mándame las imágenes y dime cuál es cuál.',
        ];
    }

    /** @param array<string, mixed> $input */
    private static function editarPiezasKit(array $input): array
    {
        $kit = Producto::find($input['producto_id'] ?? null);
        if (! $kit) {
            return ['error' => 'No existe un producto con ese id. Búscalo primero con buscar_productos.'];
        }

        $accion = (string) ($input['accion'] ?? '');

        return match ($accion) {
            'agregar' => self::agregarPiezas($kit, $input),
            'quitar' => self::quitarPieza($kit, $input),
            'renombrar' => self::renombrarPieza($kit, $input),
            default => ['error' => 'La acción debe ser agregar, quitar o renombrar.'],
        };
    }

    /** @param array<string, mixed> $input */
    private static function agregarPiezas(Producto $kit, array $input): array
    {
        $nuevas = self::nombresDePiezas($input['piezas'] ?? []);
        if ($nuevas === []) {
            return ['error' => 'No dijiste qué piezas agregar.'];
        }

        $tiene = $kit->piezas()->count();
        if ($tiene + count($nuevas) > self::MAX_PIEZAS) {
            return ['error' => "El kit ya tiene {$tiene} piezas y el máximo es ".self::MAX_PIEZAS.'.'];
        }

        $kit->piezas()->createMany(array_map(
            static fn (string $pieza, int $i) => ['nombre' => $pieza, 'orden' => $tiene + $i],
            $nuevas,
            array_keys($nuevas),
        ));

        // Un producto con piezas es un kit aunque no lo hubiera sido antes.
        if (! $kit->es_kit) {
            $kit->update(['es_kit' => true]);
        } else {
            $kit->touch();
        }

        return [
            'ok' => true,
            'kit' => $kit->nombre,
            'agregadas' => $nuevas,
            'piezas_ahora' => $kit->piezas()->pluck('nombre')->all(),
            'aviso' => 'Quedaron sin foto. Mándame las imágenes cuando quieras y te las asigno.',
        ];
    }

    /** @param array<string, mixed> $input */
    private static function quitarPieza(Producto $kit, array $input): array
    {
        $pieza = self::buscarPieza($kit, trim((string) ($input['pieza'] ?? '')));

        if (! $pieza instanceof KitPieza) {
            return $pieza;
        }

        $nombre = $pieza->nombre;

        // La foto se va con ella: si no, queda ocupando disco sin que nadie
        // pueda volver a verla ni borrarla.
        if ($pieza->imagen) {
            Storage::disk('public')->delete($pieza->imagen);
        }
        $pieza->delete();
        $kit->touch();

        return [
            'ok' => true,
            'kit' => $kit->nombre,
            'quitada' => $nombre,
            'piezas_ahora' => $kit->piezas()->pluck('nombre')->all(),
        ];
    }

    /** @param array<string, mixed> $input */
    private static function renombrarPieza(Producto $kit, array $input): array
    {
        $nuevo = trim((string) ($input['nombre_nuevo'] ?? ''));
        if ($nuevo === '') {
            return ['error' => 'Falta el nombre nuevo de la pieza.'];
        }

        $pieza = self::buscarPieza($kit, trim((string) ($input['pieza'] ?? '')));

        if (! $pieza instanceof KitPieza) {
            return $pieza;
        }

        $antes = $pieza->nombre;
        // Solo el nombre: la foto se queda donde estaba, que es lo que espera
        // quien solo quería corregir cómo se llama.
        $pieza->update(['nombre' => $nuevo]);
        $kit->touch();

        return ['ok' => true, 'kit' => $kit->nombre, 'antes' => $antes, 'despues' => $nuevo];
    }

    /**
     * Encuentra una pieza por su nombre, aunque venga a medias.
     *
     * Devuelve la pieza, o el arreglo de error que el modelo debe leer para
     * volver a preguntar. Nunca elige entre dos que calcen: borrar la pieza
     * equivocada de un kit no tiene deshacer.
     *
     * @return KitPieza|array<string, mixed>
     */
    private static function buscarPieza(Producto $kit, string $nombre): KitPieza|array
    {
        $piezas = $kit->piezas()->get();

        if ($piezas->isEmpty()) {
            return ['error' => "\"{$kit->nombre}\" no tiene piezas. "
                .'Si es un kit y deberían existir, agrégalas con editar_piezas_kit.'];
        }

        if ($nombre === '') {
            return [
                'error' => 'Falta decir cuál pieza.',
                'piezas' => $piezas->pluck('nombre')->all(),
            ];
        }

        $calzan = $piezas->filter(
            static fn (KitPieza $p) => mb_stripos($p->nombre, $nombre) !== false
        )->values();

        if ($calzan->isEmpty()) {
            return [
                'error' => "\"{$kit->nombre}\" no tiene ninguna pieza que se parezca a \"{$nombre}\".",
                'piezas' => $piezas->pluck('nombre')->all(),
            ];
        }

        if ($calzan->count() > 1) {
            return [
                'error' => "\"{$nombre}\" calza con más de una pieza. Pregúntale al admin a cuál se refiere.",
                'piezas' => $calzan->pluck('nombre')->all(),
            ];
        }

        return $calzan->first();
    }

    /**
     * Limpia una lista de nombres de piezas.
     *
     * @return array<int, string>
     */
    private static function nombresDePiezas(mixed $piezas): array
    {
        if (! is_array($piezas)) {
            return [];
        }

        return array_values(array_filter(array_map(
            static fn ($pieza) => is_string($pieza) ? trim($pieza) : '',
            $piezas,
        )));
    }

    /**
     * Valida los ids de los componentes de un kit.
     *
     * @return array<int, int>|array{error: string}
     */
    private static function idsDeComponentes(mixed $componentes, ?int $excluir = null): array
    {
        if (! is_array($componentes)) {
            return [];
        }

        $ids = array_values(array_unique(array_filter(array_map(
            static fn ($id) => (int) $id,
            $componentes,
        ))));

        // Un kit dentro de sí mismo deja la ficha dando vueltas al pintarse.
        if ($excluir !== null) {
            $ids = array_values(array_filter($ids, static fn (int $id) => $id !== $excluir));
        }

        if (count($ids) > self::MAX_PIEZAS) {
            return ['error' => 'Un kit no puede traer más de '.self::MAX_PIEZAS.' productos adentro.'];
        }

        $existen = Producto::whereIn('id', $ids)->pluck('id')->all();
        $faltan = array_diff($ids, $existen);

        if ($faltan !== []) {
            return ['error' => 'Estos ids no existen en el catálogo: '.implode(', ', $faltan)
                .'. Búscalos con buscar_productos en vez de inventarlos.'];
        }

        return $ids;
    }

    // ── Gasto ───────────────────────────────────────────────────────────────

    /** Lo que lleva gastado el chat este mes. */
    private static function consumoDelMes(): array
    {
        $consumo = ConsumoChatbot::delMes();
        $tope = (int) config('tienda.chatbot.tope_mensual_centavos');

        return [
            'mes' => $consumo->mes,
            'gastado_usd' => $consumo->dolares(),
            'mensajes_atendidos' => $consumo->mensajes,
            'tope_usd' => $tope > 0 ? number_format($tope / 100, 2) : null,
            'queda_usd' => $tope > 0 ? number_format(max(0, $tope - $consumo->costo_centavos) / 100, 2) : null,
            'nota' => $tope > 0
                ? 'Pasado el tope el bot deja de responder hasta el mes siguiente.'
                : 'No hay tope configurado: el gasto es libre.',
        ];
    }

    // ── Categorías ──────────────────────────────────────────────────────────

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
        if (isset($datos['stock_minimo']) && (int) $datos['stock_minimo'] < 0) {
            return 'El mínimo de bolsas no puede ser negativo.';
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
        $resumen = [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'categoria' => $p->categoria?->nombre,
            'precio_cop' => (int) $p->precio_cop,
            'gramos' => (int) $p->gramos,
            // Los servicios no se cuentan en bolsas: se le dice al modelo en
            // vez de mandarle un stock en cero que interpretaría como agotado.
            'tipo' => $p->controla_stock ? 'producto' : 'servicio',
            'stock' => $p->controla_stock ? (int) $p->stock : null,
            // El desglose, para que pueda responder "quedan dos, pero las dos
            // están en Bogotá" en vez de solo el total.
            'stock_por_sede' => $p->controla_stock
                ? $p->disponibilidad()->mapWithKeys(fn (array $f) => [$f['sede']->nombre => $f['stock']])->all()
                : null,
            'stock_minimo' => $p->controla_stock ? (int) $p->stock_minimo : null,
            'agotado' => $p->agotado(),
            'por_acabarse' => $p->porAcabarse(),
            'tiene_foto' => $p->medios()->where('tipo', 'imagen')->exists(),
            'activo' => (bool) $p->activo,
            'destacado' => (bool) $p->destacado,
            'es_cafe' => (bool) $p->es_cafe,
            'finca' => $p->finca,
            'region' => $p->region,
        ];

        // Lo que trae adentro solo se manda cuando es un kit. En un catálogo
        // de diez resultados, agregarle dos listas vacías a cada café sería
        // ruido que se paga por token en cada vuelta.
        if ($p->esKit()) {
            $resumen['es_kit'] = true;
            // Con la foto de cada pieza, que es lo que le permite al modelo
            // saber a cuál le falta imagen sin volver a preguntar.
            $resumen['piezas'] = $p->piezas()->get()
                ->map(static fn (KitPieza $z) => [
                    'nombre' => $z->nombre,
                    'tiene_foto' => $z->imagen !== null,
                ])->all();
            $resumen['componentes'] = $p->componentes()->get()
                ->map(static fn (Producto $c) => ['id' => $c->id, 'nombre' => $c->nombre])->all();
        }

        return $resumen;
    }

    /** Contexto fijo del catálogo: se arma una vez y se mete al system prompt. */
    public static function contextoCategorias(): string
    {
        $categorias = Categoria::orderBy('orden')->pluck('nombre')->implode(', ');

        return $categorias !== '' ? $categorias : '(sin categorías todavía)';
    }
}
