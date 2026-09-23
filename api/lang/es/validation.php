<?php

/*
|--------------------------------------------------------------------------
| Mensajes de validación
|--------------------------------------------------------------------------
|
| La app corre con `APP_LOCALE=es` y el respaldo también es `es`, así que sin
| este archivo NINGÚN mensaje se traducía: el panel mostraba la clave cruda
| —"validation.min.numeric"— en vez de decir qué estaba mal. Y como el
| respaldo tampoco era inglés, no caía ni siquiera al texto del framework.
|
| Solo están las reglas que el proyecto usa. Las que falten vuelven a salir
| como clave, que es una señal visible de que hay que agregarlas acá.
|
*/

return [

    'accepted' => 'Hay que aceptar :attribute.',
    'array' => ':attribute tiene que ser una lista.',
    'between' => [
        'numeric' => ':attribute tiene que estar entre :min y :max.',
        'file' => ':attribute tiene que pesar entre :min y :max kilobytes.',
        'string' => ':attribute tiene que tener entre :min y :max caracteres.',
        'array' => ':attribute tiene que tener entre :min y :max elementos.',
    ],
    'boolean' => ':attribute solo puede ser sí o no.',
    'confirmed' => ':attribute no coincide con la confirmación.',
    'date' => ':attribute no es una fecha válida.',
    'different' => ':attribute y :other tienen que ser distintos.',
    'email' => ':attribute tiene que ser un correo válido.',
    'exists' => 'No existe :attribute con ese valor.',
    'file' => 'Hay que subir un archivo en :attribute.',
    'image' => ':attribute tiene que ser una imagen.',
    'in' => ':attribute no es una opción válida.',
    'integer' => ':attribute tiene que ser un número entero.',
    'max' => [
        'numeric' => ':attribute no puede ser mayor que :max.',
        'file' => ':attribute no puede pesar más de :max kilobytes.',
        'string' => ':attribute no puede tener más de :max caracteres.',
        'array' => ':attribute no puede tener más de :max elementos.',
    ],
    'mimes' => ':attribute tiene que ser un archivo de tipo :values.',
    'mimetypes' => ':attribute tiene que ser un archivo de tipo :values.',
    'min' => [
        'numeric' => ':attribute no puede ser menor que :min.',
        'file' => ':attribute tiene que pesar al menos :min kilobytes.',
        'string' => ':attribute tiene que tener al menos :min caracteres.',
        'array' => ':attribute tiene que tener al menos :min elementos.',
    ],
    'numeric' => ':attribute tiene que ser un número.',
    'present' => 'Falta :attribute.',
    'required' => 'Falta :attribute.',
    'required_with' => 'Falta :attribute.',
    'required_without' => 'Falta :attribute.',
    'string' => ':attribute tiene que ser texto.',
    'unique' => 'Ya existe otro registro con ese :attribute.',
    'uploaded' => 'No se pudo subir :attribute. Puede que pese demasiado.',
    'url' => ':attribute tiene que ser un enlace que empiece por http:// o https://.',

    /*
    |--------------------------------------------------------------------------
    | Nombres de los campos
    |--------------------------------------------------------------------------
    |
    | Para que el aviso diga "Falta el nombre" y no "Falta nombre". Van con su
    | artículo incluido porque las frases de arriba los ponen al principio.
    |
    */
    'attributes' => [
        'nombre' => 'el nombre',
        'titulo' => 'el título',
        'texto' => 'el texto',
        'descripcion' => 'la descripción',
        'precio_cop' => 'el precio',
        'categoria_id' => 'la categoría',
        'producto_id' => 'el producto',
        'sede_id' => 'la sede',
        'sede' => 'la sede',
        'padre_id' => 'la sección de la que cuelga',
        'stock' => 'el inventario',
        'stock_minimo' => 'el mínimo de inventario',
        'cantidad' => 'la cantidad',
        'accion' => 'la acción',
        'gramos' => 'el peso',
        'orden' => 'el orden',
        'activo' => 'si está activo',
        'activa' => 'si está activa',
        'destacado' => 'si está destacado',
        'es_cafe' => 'si es un café',
        'es_kit' => 'si es un kit',
        'controla_stock' => 'si lleva inventario',
        'modo_vitrina' => 'la forma de mostrarla',
        'finca' => 'la finca',
        'productor' => 'el productor',
        'region' => 'la región',
        'altitud_msnm' => 'la altura',
        'variedad' => 'la variedad',
        'proceso' => 'el proceso',
        'tueste' => 'el tueste',
        'notas' => 'las notas de cata',
        'puntaje_sca' => 'el puntaje SCA',
        'imagen' => 'la imagen',
        'video' => 'el video',
        'medios' => 'las fotos y videos',
        'piezas' => 'las piezas del kit',
        'componentes' => 'los productos que trae adentro',
        'cta_texto' => 'el texto del botón',
        'cta_url' => 'el enlace del botón',
        'etiqueta' => 'la etiqueta',
        'pregunta' => 'la pregunta',
        'respuesta' => 'la respuesta',
        'direccion' => 'la dirección',
        'ciudad' => 'la ciudad',
        'barrio' => 'el barrio',
        'telefono' => 'el teléfono',
        'whatsapp' => 'el WhatsApp',
        'horario' => 'el horario',
        'metodo' => 'el método',
        'resumen' => 'el resumen',
        'detalle' => 'el detalle',
        'video_youtube' => 'el video de YouTube',
        'cafe_g' => 'los gramos de café',
        'agua_g' => 'los gramos de agua',
        'molienda_micras' => 'la molienda',
        'duracion_seg' => 'la duración',
        'ingredientes' => 'los ingredientes',
        'pasos' => 'los pasos',
        'artefactos' => 'los artefactos',
        'ids' => 'la lista de ids',
        'mensaje' => 'el mensaje',
        'contacto' => 'el contacto',
    ],

];
