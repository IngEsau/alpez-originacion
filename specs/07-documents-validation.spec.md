---

## `specs/07-documents-validation.spec.md`

```markdown
# 07 — Documents and Validation Spec

## 1. Objetivo

Definir el comportamiento visual y funcional de documentos y validaciones simuladas dentro del MVP ALPEZ.

## 2. Componentes requeridos

```txt
DocumentChecklist
DocumentUploadCard
DocumentStatusBadge
ValidationPanel
IneValidationPanel
BureauValidationPanel
ListsValidationPanel
KnockoutPanel
SmsValidationPanel
```

## 3. Documentos

### 3.1 Estados de documento

```ts
export type DocumentStatus =
  | "pendiente"
  | "cargado"
  | "en_revision"
  | "validado"
  | "rechazado";
```

### 3.2 Etiquetas visibles

```txt
pendiente => Pendiente
cargado => Cargado
en_revision => En revisión
validado => Validado
rechazado => Rechazado
```

### 3.3 Documentos Persona Física

1. INE titular
2. CURP
3. Constancia de Situación Fiscal
4. Comprobante domicilio titular
5. Comprobante domicilio negocio
6. Estados de cuenta bancarios
7. Opinión positiva SAT
8. Garantía
9. INE aval
10. Comprobante domicilio aval

### 3.4 Documentos Persona Moral

1. INE representante legal
2. Constancia de Situación Fiscal
3. Comprobante domicilio empresa
4. Comprobante domicilio representante legal
5. Estados de cuenta bancarios
6. Estados financieros
7. Declaración anual
8. Poder representante legal
9. Acta constitutiva
10. Opinión positiva SAT
11. Garantía
12. INE aval
13. Comprobante domicilio aval

## 4. Comportamiento de carga simulada

Cada documento debe permitir:

1. Simular carga
2. Marcar en revisión
3. Marcar validado
4. Marcar rechazado
5. Agregar comentario

### 4.1 Al simular carga

Asignar:

```ts
status: "cargado"
fileName: "{tipoDocumento}.pdf"
fileSizeMb: número aleatorio entre 1 y 5
fileType: "pdf"
uploadedAt: fecha actual
```

## 5. Reglas visuales

1. Documento pendiente debe verse neutral.
2. Documento cargado debe verse informativo.
3. Documento en revisión debe verse advertencia.
4. Documento validado debe verse exitoso.
5. Documento rechazado debe verse crítico.
6. Si el documento es requerido, mostrar etiqueta "Requerido".
7. Si el documento es opcional, mostrar etiqueta "Opcional".
8. Si está rechazado, mostrar comentario.

## 6. Comentarios en documentos rechazados

Cuando un documento se marque como rechazado:

1. Debe abrirse campo de comentario.
2. El comentario debe ser requerido.
3. Debe mostrarse en la card del documento.

Ejemplos:

1. Documento ilegible.
2. Documento vencido.
3. No corresponde al solicitante.
4. Falta reverso del documento.

## 7. Validaciones

### 7.1 Estados de validación

```ts
export type ValidationStatus =
  | "pendiente"
  | "procesando"
  | "aprobado"
  | "rechazado"
  | "observado";
```

### 7.2 Etiquetas visibles

```txt
pendiente => Pendiente
procesando => Procesando
aprobado => Aprobado
rechazado => Rechazado
observado => Observado
```

### 7.3 Validaciones requeridas

1. Validación INE
2. Knockouts
3. Cliente existente
4. SMS
5. Consulta Buró
6. Validación de listas
7. Validación documental
8. Modelo de decisión
9. Investigación legal
10. Contratos

## 8. Validación INE

### 8.1 Reglas simuladas

La validación INE debe revisar visualmente:

1. Calidad de imagen
2. Vigencia de INE
3. Existencia en padrón

### 8.2 Resultado mock

```ts
export interface IneValidationResult {
  imageQuality: "ok" | "low_quality";
  isExpired: boolean;
  existsInRegistry: boolean;
  status: ValidationStatus;
  message: string;
}
```

### 8.3 Comportamiento

1. Si imageQuality = low_quality => Observado
2. Si isExpired = true => Rechazado
3. Si existsInRegistry = false => Rechazado
4. Si todo está correcto => Aprobado

### 8.4 Mensajes

1. INE validada correctamente.
2. La imagen no tiene calidad suficiente.
3. La INE se encuentra vencida.
4. No fue posible validar existencia en padrón.

## 9. Knockouts

### 9.1 Objetivo

Simular reglas eliminatorias.

### 9.2 Resultado mock

```ts
export interface KnockoutResult {
  passed: boolean;
  reasons: string[];
}
```

### 9.3 Motivos posibles

1. Edad fuera de política
2. Actividad no permitida
3. Cliente con bloqueo interno
4. RFC inválido para política demo

### 9.4 Comportamiento

1. Si passed = true => Aprobado
2. Si passed = false => Rechazado

## 10. Cliente existente

### 10.1 Objetivo

Simular si el prospecto ya existe como cliente.

### 10.2 Resultado mock

```ts
export interface ExistingClientResult {
  exists: boolean;
  customerId?: string;
  message: string;
}
```

### 10.3 Comportamiento

1. Si exists = true => Rechazado por cliente existente
2. Si exists = false => Aprobado

## 11. SMS

### 11.1 Objetivo

Simular envío y captura de código SMS.

### 11.2 Comportamiento

1. Botón "Enviar SMS".
2. Mostrar código demo.
3. Campo para capturar código.
4. Botón "Validar código".
5. Si el código coincide, aprobar validación.

### 11.3 Código demo

```txt
123456
```

No integrar proveedor real.

## 12. Consulta Buró

### 12.1 Objetivo

Simular consulta Buró y score.

### 12.2 Resultado mock

```ts
export interface BureauResult {
  hasHit: boolean;
  score: number | null;
  status: ValidationStatus;
  message: string;
}
```

### 12.3 Comportamiento

Para escenarios con hit Buró:

1. Generar o usar score mock.
2. Mostrar score.
3. Actualizar solicitud.

Para escenario sin hit Buró:

```ts
hasHit = false
score = null
message = "Sin historial crediticio disponible"
```

## 13. Validación de listas

### 13.1 Listas visibles

1. Listas negras
2. CURP
3. SAT
4. Antecedentes judiciales
5. Registro Público de Comercio
6. Listas de sanción SAT

### 13.2 Resultado mock

```ts
export interface ListsValidationResult {
  blacklists: boolean;
  curp: boolean;
  sat: boolean;
  judicialRecords: boolean;
  publicCommerceRegistry: boolean;
  satSanctions: boolean;
  status: ValidationStatus;
  message: string;
}
```

### 13.3 Comportamiento

1. Si todas están limpias => Aprobado
2. Si alguna falla => Rechazado

## 14. Validación documental

### 14.1 Regla

1. Si todos los documentos requeridos están cargados o validados => Aprobado
2. Si faltan documentos requeridos => Observado
3. Si hay documentos rechazados => Observado

## 15. Criterios de aceptación

1. Los documentos se muestran según tipo de persona.
2. Se puede simular carga de documentos.
3. Se puede cambiar estado documental.
4. Se puede rechazar documento con comentario.
5. Se puede ejecutar validación INE simulada.
6. Se puede ejecutar consulta Buró simulada.
7. Se puede ejecutar validación de listas simulada.
8. Se puede simular SMS.
9. Los estados se actualizan visualmente.
10. No hay llamadas a servicios reales.

---
```
