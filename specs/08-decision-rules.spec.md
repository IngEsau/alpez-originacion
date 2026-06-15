---

## `specs/08-decision-rules.spec.md`

```markdown
# 08 — Decision Rules Spec

## 1. Objetivo

Definir las reglas de decisión simuladas para el MVP ALPEZ.

Estas reglas no representan un motor de crédito real. Solo sirven para demo frontend.

## 2. Principio general

La decisión debe ser determinística y fácil de explicar durante la presentación.

La decisión debe producir:

```txt
Decisión
Estado
Score
Nivel de riesgo
Línea asignada
Motivo de rechazo
Mensaje visible
```

## 3. Entradas de decisión

```ts
export interface DecisionInput {
  applicationId: string;
  scenario: ApplicationScenario;
  requestedAmount: number;
  bureauScore: number | null;
  finalScore: number | null;
  documents: DocumentItem[];
  validations: ValidationItem[];
}
```

## 4. Salida de decisión

```ts
export interface CreditDecision {
  applicationId: string;
  decision: ApplicationDecision;
  status: ApplicationStatus;
  requestedAmount: number;
  assignedCreditLine: number | null;
  bureauScore: number | null;
  finalScore: number | null;
  riskLevel: RiskLevel;
  rejectionReason?: RejectionReason;
  message: string;
  evaluatedAt: string;
}
```

## 5. Reglas globales previas

Antes de evaluar score:

### 5.1 Regla 1 — INE rechazada

Si la validación INE está rechazada:

```ts
decision = rechazada
status = rechazada
assignedCreditLine = null
riskLevel = no_aplica
rejectionReason = ine_vencida | ine_calidad_baja | ine_no_encontrada
```

Mensaje:

```txt
Solicitud rechazada por validación de INE.
```

### 5.2 Regla 2 — Knockouts rechazados

Si knockouts está rechazado:

```ts
decision = rechazada
status = rechazada
assignedCreditLine = null
riskLevel = no_aplica
rejectionReason = rechazo_knockouts
```

Mensaje:

```txt
Solicitud rechazada por reglas knockout.
```

### 5.3 Regla 3 — Cliente existente

Si cliente existente está rechazado:

```ts
decision = rechazada
status = rechazada
assignedCreditLine = null
riskLevel = no_aplica
rejectionReason = cliente_existente
```

Mensaje:

```txt
Solicitud rechazada por cliente existente.
```

### 5.4 Regla 4 — Listas rechazadas

Si validación de listas está rechazada:

```ts
decision = rechazada
status = rechazada
assignedCreditLine = null
riskLevel = no_aplica
rejectionReason = validacion_listas_rechazada
```

Mensaje:

```txt
Solicitud rechazada por validación de listas.
```

### 5.5 Regla 5 — Documentos incompletos

Si faltan documentos requeridos:

```ts
decision = observada
status = documentos_pendientes
assignedCreditLine = null
riskLevel = no_aplica
rejectionReason = documentos_incompletos
```

Mensaje:

```txt
Solicitud observada por documentos pendientes.
```

Esta regla puede configurarse para no bloquear durante demo, pero el panel de decisión debe mostrar advertencia.

## 6. Persona Física con hit Buró

### 6.1 Escenario

```ts
scenario = "persona_fisica_hit_buro"
```

### 6.2 Score requerido

Usar:

```txt
bureauScore
```

### 6.3 Bandas

1. Score < 630 => Rechazada por score
2. 630 - 649 => Riesgo alto, línea $10,000
3. 650 - 669 => Riesgo medio, línea $20,000
4. 670 - 689 => Riesgo medio, línea $30,000
5. 690 - 719 => Riesgo bajo, línea $40,000
6. Score > 720 => Riesgo bajo, línea $60,000

### 6.4 Resultado score menor a 630

```ts
decision = "rechazada"
status = "rechazada"
assignedCreditLine = null
riskLevel = "no_aplica"
rejectionReason = "score_insuficiente"
message = "Solicitud rechazada por score menor al mínimo requerido."
```

### 6.5 Resultado aprobado

```ts
decision = "aprobada"
status = "investigacion_legal"
assignedCreditLine = según banda
riskLevel = según banda
message = "Solicitud aprobada en modelo de decisión. Continúa investigación legal."
```

## 7. Persona Moral con hit Buró

### 7.1 Escenario

```ts
scenario = "persona_moral_hit_buro"
```

### 7.2 Score requerido

Usar:

```txt
bureauScore
```

### 7.3 Bandas

1. Score <= 499 => Rechazada por score
2. 500 - 549 => Riesgo alto, línea $10,000
3. 550 - 599 => Riesgo medio, línea $20,000
4. 600 - 649 => Riesgo medio, línea $30,000
5. 650 - 699 => Riesgo bajo, línea $40,000
6. Score > 700 => Riesgo bajo, línea $60,000

### 7.4 Resultado score menor o igual a 499

```ts
decision = "rechazada"
status = "rechazada"
assignedCreditLine = null
riskLevel = "no_aplica"
rejectionReason = "score_insuficiente"
message = "Solicitud rechazada por score menor al mínimo requerido para Persona Moral."
```

### 7.5 Resultado aprobado

```ts
decision = "aprobada"
status = "investigacion_legal"
assignedCreditLine = según banda
riskLevel = según banda
message = "Solicitud aprobada en modelo de decisión. Continúa investigación legal."
```

## 8. Persona Moral sin hit Buró

### 8.1 Escenario

```ts
scenario = "persona_moral_no_hit_buro"
```

### 8.2 Score requerido

Usar:

```txt
finalScore
```

### 8.3 Regla demo

1. finalScore < 65 => Rechazada
2. finalScore >= 65 => Aprobada

### 8.4 Cálculo sugerido de finalScore

El cálculo es simulado.

```ts
finalScore =
  documentScore * 0.30 +
  incomeScore * 0.25 +
  bankBalanceScore * 0.20 +
  seniorityScore * 0.15 +
  solvencyScore * 0.10
```

## 9. Subscores

Cada subscore debe ir de 0 a 100.

### 9.1 documentScore

1. 100 si todos los documentos requeridos están cargados/validados
2. 70 si falta máximo 1 documento
3. 40 si faltan 2 o más documentos

### 9.2 incomeScore

1. 100 si ingresos promedio >= monto solicitado * 0.50
2. 75 si ingresos promedio >= monto solicitado * 0.30
3. 50 si ingresos promedio >= monto solicitado * 0.15
4. 30 en caso contrario

### 9.3 bankBalanceScore

1. 100 si saldo promedio >= monto solicitado * 0.50
2. 75 si saldo promedio >= monto solicitado * 0.30
3. 50 si saldo promedio >= monto solicitado * 0.15
4. 30 en caso contrario

### 9.4 seniorityScore

1. 100 si antigüedad empresa >= 5 años
2. 80 si antigüedad empresa >= 3 años
3. 60 si antigüedad empresa >= 1 año
4. 30 en caso contrario

### 9.5 solvencyScore

1. 100 si activo total > pasivo total * 2
2. 75 si activo total > pasivo total * 1.5
3. 50 si activo total > pasivo total
4. 30 en caso contrario

## 10. Resultado PM sin hit rechazado

```ts
decision = "rechazada"
status = "rechazada"
assignedCreditLine = null
riskLevel = "no_aplica"
rejectionReason = "modelo_decision_rechazado"
message = "Solicitud rechazada por modelo de decisión simulado."
```

## 11. Resultado PM sin hit aprobado

### 11.1 Línea asignada sugerida

1. finalScore 65 - 74 => $10,000
2. finalScore 75 - 84 => $20,000
3. finalScore 85 - 94 => $40,000
4. finalScore 95 - 100 => $60,000

### 11.2 Riesgo

1. 65 - 74 => Alto
2. 75 - 84 => Medio
3. 85 - 100 => Bajo

### 11.3 Resultado

```ts
decision = "aprobada"
status = "investigacion_legal"
assignedCreditLine = según banda
riskLevel = según banda
message = "Solicitud aprobada por modelo alternativo sin hit Buró."
```

## 12. Funciones requeridas

Crear:

```ts
evaluatePhysicalPersonHitBuro(application: Application): CreditDecision
evaluateMoralPersonHitBuro(application: Application): CreditDecision
evaluateMoralPersonNoHitBuro(application: Application): CreditDecision
runDecisionRules(application: Application): CreditDecision
```

## 13. Reglas de actualización de solicitud

Después de ejecutar decisión:

1. Actualizar decision.
2. Actualizar status.
3. Actualizar assignedCreditLine.
4. Actualizar bureauScore o finalScore.
5. Actualizar riskLevel.
6. Actualizar rejectionReason.
7. Agregar evento al timeline.
8. Actualizar fecha updatedAt.

## 14. Criterios de aceptación

1. Las reglas de Persona Física usan score Buró.
2. Las reglas de Persona Moral hit usan score Buró.
3. Las reglas de Persona Moral sin hit usan finalScore.
4. Score insuficiente rechaza.
5. Score aprobado asigna línea.
6. Rechazos previos bloquean decisión.
7. Documentos pendientes generan observación.
8. La decisión se muestra en el detalle.
9. La decisión actualiza timeline.
10. No existe motor de crédito real.
```
