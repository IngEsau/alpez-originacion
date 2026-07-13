export function productizeStoredCopy(value: string): string {
  return value
    .replace(/Código demo:\s*\d+/gi, "Código de verificación generado")
    .replace(/El código capturado no coincide con el código demo/gi, "El código capturado no coincide")
    .replace(/Escenario demo aplicado/gi, "Configuración de evaluación aplicada")
    .replace(/Se aplicó un escenario de evaluación forzado para demostración/gi, "Se aplicaron parámetros específicos para la evaluación")
    .replace(/Sin backend real/gi, "")
    .replace(/\.demo@alpez\.local/gi, "@correo.mx")
    .replace(/demo@alpez\.local/gi, "ejecutivo@alpez.mx")
    .replace(/@alpez\.demo/gi, "@alpez.mx")
    .replace(/store (?:local )?demo/gi, "plataforma")
    .replace(/wizard demo/gi, "formulario de originación")
    .replace(/caso demo/gi, "solicitud")
    .replace(/regla demo/gi, "regla de evaluación")
    .replace(/\bDemo\b/gi, "ALPEZ")
    .replace(/\bsimulad(?:a|o|as|os)\b/gi, "")
    .replace(/\btrace_id\b/gi, "seguimiento")
    .replace(/\btrazas\b/gi, "seguimientos")
    .replace(/\btraza\b/gi, "seguimiento")
    .replace(/\s{2,}/g, " ")
    .trim();
}
