"use client";

import { useEffect, useState } from "react";
import type { Aviso as AvisoDatos } from "@/lib/catalogo";

/**
 * La banda de aviso, arriba de todo: una feria, un lote que llegó, un cierre
 * por vacaciones.
 *
 * Se puede cerrar, y queda cerrada en ese navegador. La marca se guarda contra
 * el TEXTO del aviso y no contra su id: el panel edita siempre la misma fila,
 * así que un aviso nuevo reusa el id del anterior y quien ya había cerrado uno
 * no volvería a ver ninguno nunca más.
 *
 * Nace oculto y aparece con un efecto al montar. Es a propósito: en el HTML
 * del servidor no se sabe si este visitante ya lo cerró, y pintarlo para
 * quitarlo un instante después empuja la página entera hacia arriba.
 */
export default function Aviso({ aviso }: { aviso: AvisoDatos | null }) {
  const [visible, setVisible] = useState(false);

  const firma = aviso ? `${aviso.titulo}|${aviso.texto ?? ""}` : "";

  useEffect(() => {
    if (!aviso) return;
    try {
      // localStorage no existe durante el render del servidor: si este
      // visitante ya lo cerró solo se puede saber ya montados.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem("aviso-cerrado") !== firma) setVisible(true);
    } catch {
      // Sin acceso a localStorage (modo privado, permisos): se muestra. Un
      // aviso de más molesta menos que uno que nunca aparece.
      setVisible(true);
    }
  }, [aviso, firma]);

  if (!aviso || !visible) return null;

  const cerrar = () => {
    setVisible(false);
    try {
      localStorage.setItem("aviso-cerrado", firma);
    } catch {
      // Si no se puede recordar, se cierra igual por esta visita.
    }
  };

  return (
    <aside className="aviso" role="status">
      <span className="aviso-etiqueta">
        <span className="aviso-punto" aria-hidden="true" />
        {aviso.etiqueta}
      </span>

      <div className="aviso-texto">
        <p className="aviso-titulo">{aviso.titulo}</p>
        {aviso.texto && <p className="aviso-bajada">{aviso.texto}</p>}
      </div>

      {aviso.cta_texto && aviso.cta_url && (
        <a
          href={aviso.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="boton boton-solido-claro aviso-boton"
        >
          {aviso.cta_texto}
        </a>
      )}

      <button type="button" className="aviso-cerrar" onClick={cerrar} aria-label="Cerrar el aviso">
        ✕
      </button>
    </aside>
  );
}
