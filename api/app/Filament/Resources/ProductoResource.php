<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductoResource\Pages;
use App\Models\Categoria;
use App\Models\Producto;
use App\Support\ImageOptimizer;
use App\Support\VideoOptimizer;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\Action;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

class ProductoResource extends Resource
{
    protected static ?string $model = Producto::class;

    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag';

    protected static ?string $navigationLabel = 'Productos';

    protected static ?string $modelLabel = 'Producto';

    protected static ?string $pluralModelLabel = 'Productos';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Section::make('Lo básico')->schema([
                Select::make('categoria_id')
                    ->label('Categoría')
                    ->options(fn () => Categoria::orderBy('orden')->pluck('nombre', 'id'))
                    ->required()
                    ->searchable(),

                TextInput::make('nombre')->label('Nombre')->required()->maxLength(255),

                Textarea::make('descripcion')->label('Descripción')->rows(3)->nullable(),

                TextInput::make('precio_cop')
                    ->label('Precio')
                    ->helperText('En pesos, entero y sin puntos: 48000')
                    ->required()
                    ->numeric()
                    ->prefix('$')
                    ->minValue(0),

                TextInput::make('gramos')
                    ->label('Peso de la bolsa')
                    ->helperText('En gramos. Deja 0 para equipos y métodos de la barra.')
                    ->required()
                    ->numeric()
                    ->suffix('g')
                    ->default(340)
                    ->minValue(0),
            ])->columns(2),

            Section::make('Inventario')
                ->description('El stock se cuenta en bolsas. También se puede ajustar por el chatbot de WhatsApp.')
                ->schema([
                    Toggle::make('controla_stock')
                        ->label('Llevar inventario')
                        ->helperText('Apágalo para servicios (asesorías, barra para eventos): se agendan, no se agotan.')
                        ->default(true)
                        ->live()
                        ->columnSpanFull(),

                    TextInput::make('stock')
                        ->label('Bolsas disponibles')
                        ->required()
                        ->numeric()
                        ->default(0)
                        ->minValue(0)
                        // Con el inventario apagado estos dos campos no dicen
                        // nada; esconderlos evita que alguien ponga un número
                        // ahí y espere que signifique algo.
                        ->visible(fn ($get) => (bool) $get('controla_stock')),

                    TextInput::make('stock_minimo')
                        ->label('Avisar por debajo de')
                        ->helperText('Con esta cantidad o menos, el producto sale marcado como "por acabarse".')
                        ->required()
                        ->numeric()
                        ->default(3)
                        ->minValue(0)
                        ->visible(fn ($get) => (bool) $get('controla_stock')),
                ])->columns(2),

            Section::make('Ficha de origen')
                ->description('Solo para cafés. Lo que dejes vacío no se muestra en el catálogo.')
                ->collapsed()
                ->schema([
                    TextInput::make('finca')->label('Finca')->nullable()->maxLength(255),
                    TextInput::make('productor')->label('Productor')->nullable()->maxLength(255),
                    TextInput::make('region')->label('Región')->placeholder('Huila')->nullable()->maxLength(255),
                    TextInput::make('altitud_msnm')
                        ->label('Altura')->suffix('msnm')->numeric()->nullable()->minValue(0)->maxValue(4000),
                    TextInput::make('variedad')->label('Variedad')->placeholder('Castillo')->nullable()->maxLength(255),
                    TextInput::make('proceso')->label('Proceso')->placeholder('Lavado')->nullable()->maxLength(255),
                    TextInput::make('tueste')->label('Tueste')->placeholder('Medio')->nullable()->maxLength(255),
                    TextInput::make('puntaje_sca')
                        ->label('Puntaje SCA')->numeric()->nullable()->minValue(0)->maxValue(100)->step(0.25),

                    TagsInput::make('notas')
                        ->label('Notas de cata')
                        ->helperText('Escribe una y pulsa Enter. Máximo seis; en el catálogo se ven las tres primeras.')
                        ->placeholder('panela')
                        ->columnSpanFull(),
                ])->columns(2),

            Section::make('Fotos y video')
                ->collapsed()
                ->schema([
                    FileUpload::make('imagen')
                        ->label('Foto principal')
                        ->image()
                        ->disk('public')
                        ->directory('productos')
                        // Se reduce y se pasa a WebP al subirla: una foto de
                        // celular de 5 MB queda en ~150 KB sin diferencia
                        // visible en pantalla.
                        ->saveUploadedFileUsing(
                            fn (TemporaryUploadedFile $archivo) => ImageOptimizer::store($archivo, 'productos'),
                        ),

                    FileUpload::make('video')
                        ->label('Video')
                        ->helperText('Clip corto y sin audio. Se recomprime al subirlo; el póster se genera solo.')
                        ->disk('public')
                        ->directory('productos/videos')
                        ->acceptedFileTypes(['video/mp4', 'video/webm', 'video/quicktime'])
                        ->maxSize(15360)
                        ->saveUploadedFileUsing(
                            fn (TemporaryUploadedFile $archivo) => VideoOptimizer::store($archivo, 'productos/videos'),
                        ),
                ])->columns(2),

            Section::make('Publicación')->schema([
                Toggle::make('activo')
                    ->label('Visible en el catálogo')
                    ->helperText('Distinto de agotado: un producto sin stock se sigue mostrando, con su sello.')
                    ->default(true),

                Toggle::make('destacado')->label('Destacado')->default(false),

                TextInput::make('orden')
                    ->label('Orden dentro de la categoría')
                    ->numeric()->default(0)->minValue(0),
            ])->columns(3),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('categoria_id')
            ->columns([
                ImageColumn::make('imagen')->label('')->disk('public')->square(),

                TextColumn::make('nombre')->label('Nombre')->searchable()->sortable()->weight('bold'),

                TextColumn::make('categoria.nombre')->label('Categoría')->sortable()->toggleable(),

                TextColumn::make('precio_cop')
                    ->label('Precio')
                    ->formatStateUsing(fn ($state) => '$'.number_format((int) $state, 0, ',', '.'))
                    ->sortable(),

                TextColumn::make('stock')
                    ->label('Bolsas')
                    ->badge()
                    // Un servicio no tiene bolsas: mostrar "0" en gris dice
                    // más que un cero rojo que parece un problema.
                    ->formatStateUsing(fn ($state, Producto $p) => $p->controla_stock ? $state : 'Servicio')
                    // El color dice el estado de un vistazo: rojo agotado,
                    // ámbar por acabarse, verde con inventario sano.
                    ->color(fn (Producto $p) => match (true) {
                        ! $p->controla_stock => 'gray',
                        $p->agotado() => 'danger',
                        $p->porAcabarse() => 'warning',
                        default => 'success',
                    })
                    ->sortable(),

                IconColumn::make('activo')->label('Visible')->boolean()->sortable(),
                IconColumn::make('destacado')->label('Destacado')->boolean()->toggleable(),
            ])
            ->filters([
                SelectFilter::make('categoria_id')
                    ->label('Categoría')
                    ->options(fn () => Categoria::orderBy('orden')->pluck('nombre', 'id')),

                // Los dos filtros de inventario excluyen los servicios: no
                // tienen stock, así que un "solo agotados" los arrastraría a
                // todos por tener el contador en cero.
                Filter::make('agotados')
                    ->label('Solo agotados')
                    ->query(fn (Builder $q) => $q->where('controla_stock', true)->where('stock', '<=', 0)),

                Filter::make('por_acabarse')
                    ->label('Solo por acabarse')
                    // Columna contra columna: el umbral es propio de cada
                    // producto, no un número global.
                    ->query(fn (Builder $q) => $q->where('controla_stock', true)
                        ->where('stock', '>', 0)
                        ->whereColumn('stock', '<=', 'stock_minimo')),
            ])
            ->actions([
                // Ajuste rápido sin abrir el formulario completo: es la acción
                // que más se repite en el día a día.
                Action::make('stock')
                    ->label('Stock')
                    ->icon('heroicon-o-archive-box')
                    ->visible(fn (Producto $producto) => $producto->controla_stock)
                    ->form([
                        Select::make('accion')
                            ->label('Qué pasó')
                            ->options([
                                'sumar' => 'Llegó mercancía (sumar)',
                                'restar' => 'Salió mercancía (restar)',
                                'fijar' => 'Conteo físico (dejar en)',
                            ])
                            ->default('sumar')
                            ->required(),
                        TextInput::make('cantidad')
                            ->label('Bolsas')->numeric()->required()->minValue(0)->maxValue(100000),
                    ])
                    ->action(function (Producto $producto, array $data) {
                        $producto->ajustarStock($data['accion'], (int) $data['cantidad']);
                    })
                    ->successNotificationTitle('Inventario actualizado'),

                EditAction::make(),
                DeleteAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProductos::route('/'),
            'create' => Pages\CreateProducto::route('/create'),
            'edit' => Pages\EditProducto::route('/{record}/edit'),
        ];
    }
}
