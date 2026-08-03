import type { NextConfig } from "next";

// URL interna del backend Laravel. En local, localhost:8001. En producción se
// define BACKEND_URL (el dominio de la API o la URL interna del contenedor).
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // El navegador nunca le pega directo al backend: así no hay que lidiar
      // con CORS y las peticiones pasan por el CDN.
      { source: "/api-tienda/:path*", destination: `${BACKEND}/api/:path*` },
      // Los archivos subidos también van por acá. Sirviéndolos desde Laravel
      // se atiende de a una petición por proceso de PHP; por el proxy los
      // absorbe el CDN.
      { source: "/tienda-storage/:path*", destination: `${BACKEND}/storage/:path*` },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // El sitio no puede embeberse en un iframe ajeno (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // El navegador no debe adivinar tipos MIME distintos al declarado.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // El catálogo no necesita ninguna API sensible del navegador.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Laravel guarda los archivos con nombre hasheado: una subida nueva es
        // una URL nueva, así que se pueden cachear con tranquilidad.
        source: "/tienda-storage/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Video y póster del hero. Sin esto salen con max-age=0 y cada visita
        // vuelve a bajar el video completo — en datos móviles esa es la
        // diferencia entre "el fondo aparece" y "el fondo no carga".
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },

  images: {
    // Las imágenes llegan por el rewrite, así que no hay host externo que
    // declarar. Sin optimizar: ya salen del backend en WebP y redimensionadas.
    remotePatterns: [],
    unoptimized: true,
  },
};

export default nextConfig;
