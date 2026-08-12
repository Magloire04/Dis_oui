import { useMemo } from "react";
import QRCodeLib from "qrcode";

type QrCodeProps = {
  /** Contenu encodé — ici l'URL destinataire de l'invitation. */
  value: string;
  /** Côté du rendu en pixels CSS. */
  size?: number;
  className?: string;
  title?: string;
};

/**
 * QR code rendu en SVG à partir de la matrice de modules.
 *
 * On n'utilise ni `toDataURL` (image matricielle, floue à l'impression) ni
 * `toString({ type: "svg" })` (qui imposerait un `dangerouslySetInnerHTML`) :
 * la matrice est parcourue pour produire de vrais nœuds SVG, nets à toute
 * échelle.
 */
export function QrCode({ value, size = 160, className, title }: QrCodeProps) {
  const matrix = useMemo(() => {
    try {
      // Correction « M » : ~15 % de tolérance, le bon compromis pour un QR
      // affiché à l'écran puis photographié.
      const qr = QRCodeLib.create(value, { errorCorrectionLevel: "M" });
      return { size: qr.modules.size, data: qr.modules.data };
    } catch {
      // Valeur trop longue pour la version maximale : mieux vaut ne rien
      // afficher qu'un QR illisible.
      return null;
    }
  }, [value]);

  if (!matrix) return null;

  // Marge blanche obligatoire autour du code (« quiet zone »), 4 modules.
  const quietZone = 4;
  const total = matrix.size + quietZone * 2;

  const rects: React.ReactElement[] = [];
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.data[row * matrix.size + col]) continue;
      rects.push(
        <rect
          key={`${row}-${col}`}
          x={col + quietZone}
          y={row + quietZone}
          width={1}
          height={1}
          shapeRendering="crispEdges"
        />
      );
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      className={className}
      role="img"
      aria-label={title ?? "QR code du lien d'invitation"}
    >
      <rect width={total} height={total} fill="#ffffff" />
      <g fill="#1c1917">{rects}</g>
    </svg>
  );
}
