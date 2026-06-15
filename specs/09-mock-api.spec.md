---

## `specs/09-mock-api.spec.md`

```markdown
# 09 — Mock API Spec

## 1. Objetivo

Definir servicios simulados que permitan construir el frontend sin backend real, pero dejando la estructura preparada para consumir una API externa en el futuro.

## 2. Principio técnico

Los componentes no deben importar mocks directamente.

Los componentes deben consumir servicios desde:

```txt
features/*/services
```

Los mocks deben vivir en:

```txt
src/mocks
```

## 3. Estructura requerida

```txt
src/
  features/
    applications/
      services/
        applicationService.ts
        applicationMockService.ts
    documents/
      services/
        documentService.ts
        documentMockService.ts
    validations/
      services/
        validationService.ts
        validationMockService.ts
  mocks/
    applications.mock.ts
    documents.mock.ts
    dashboard.mock.ts
    catalogs.mock.ts
```

## 4. Regla de abstracción

`applicationService.ts` debe exportar funciones públicas.

Internamente, para el MVP, debe delegar a `applicationMockService.ts`.

Después podrá cambiarse por HTTP real sin modificar pantallas.

## 5. Servicios requeridos

### 5.1 Dashboard

```ts
getDashboardSummary(): Promise<DashboardSummary>
```

Debe retornar métricas calculadas desde solicitudes mock.

### 5.2 Solicitudes

```ts
getApplications(filters?: ApplicationFilters): Promise<Application[]>
getApplicationById(id: string): Promise<Application | null>
createApplication(payload: CreateApplicationPayload): Promise<Application>
updateApplication(id: string, payload: Partial<Application>): Promise<Application>
updateApplicationStatus(id: string, status: ApplicationStatus): Promise<Application>
```

### 5.3 Documentos

```ts
getApplicationDocuments(applicationId: string): Promise<DocumentItem[]>
simulateDocumentUpload(
  applicationId: string,
  documentId: string
): Promise<DocumentItem>
updateDocumentStatus(
  applicationId: string,
  documentId: string,
  status: DocumentStatus,
  comments?: string
): Promise<DocumentItem>
```

### 5.4 Validaciones

```ts
runIneValidation(applicationId: string): Promise<IneValidationResult>
runKnockoutValidation(applicationId: string): Promise<KnockoutResult>
runExistingClientValidation(applicationId: string): Promise<ExistingClientResult>
sendSmsCode(applicationId: string): Promise<{ code: string; message: string }>
verifySmsCode(
  applicationId: string,
  code: string
): Promise<{ valid: boolean; message: string }>
runBureauQuery(applicationId: string): Promise<BureauResult>
runListsValidation(applicationId: string): Promise<ListsValidationResult>
runDecisionModel(applicationId: string): Promise<CreditDecision>
```

## 6. Simulación de delay

Cada función mock debe simular latencia.

```ts
const MOCK_DELAY_MS = 600;
```

Usar helper:

```ts
export function wait(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## 7. Mock store

Para el MVP, usar un store en memoria.

```ts
let applicationsStore: Application[] = APPLICATIONS_MOCK;
```

Opcional:

Guardar en localStorage para persistir durante la demo.

```txt
localStorage key: alpez_applications
```

### 7.1 Regla

1. Si localStorage existe, usarlo.
2. Si no existe, cargar `APPLICATIONS_MOCK`.

## 8. Mocks mínimos requeridos

Crear al menos 8 solicitudes.

### 8.1 Solicitud 1

1. Persona Física
2. Hit Buró
3. Aprobada
4. Score 680
5. Riesgo medio
6. Línea $30,000
7. Estado: contratos

### 8.2 Solicitud 2

1. Persona Física
2. Hit Buró
3. Rechazada
4. Motivo: INE vencida
5. Estado: rechazada

### 8.3 Solicitud 3

1. Persona Física
2. Hit Buró
3. Documentos pendientes
4. Estado: documentos_pendientes

### 8.4 Solicitud 4

1. Persona Física
2. Hit Buró
3. Rechazada
4. Score 610
5. Motivo: score insuficiente

### 8.5 Solicitud 5

1. Persona Moral
2. Hit Buró
3. Aprobada
4. Score 710
5. Riesgo bajo
6. Línea $60,000
7. Estado: investigacion_legal

### 8.6 Solicitud 6

1. Persona Moral
2. Hit Buró
3. Rechazada
4. Score 480
5. Motivo: score insuficiente

### 8.7 Solicitud 7

1. Persona Moral
2. Sin hit Buró
3. Modelo decisión pendiente
4. Estado: modelo_decision

### 8.8 Solicitud 8

1. Persona Moral
2. Sin hit Buró
3. Aprobada
4. Final score 78
5. Riesgo medio
6. Línea $20,000
7. Estado: contratos

## 9. Contratos esperados para API futura

Estos endpoints no se implementan todavía, pero deben guiar la estructura del frontend.

```txt
GET    /api/dashboard/summary

GET    /api/applications
GET    /api/applications/:id
POST   /api/applications
PATCH  /api/applications/:id
PATCH  /api/applications/:id/status

GET    /api/applications/:id/documents
POST   /api/applications/:id/documents
PATCH  /api/applications/:id/documents/:documentId

POST   /api/applications/:id/ine/validate
POST   /api/applications/:id/knockouts/validate
POST   /api/applications/:id/existing-client/validate
POST   /api/applications/:id/sms/send
POST   /api/applications/:id/sms/verify
POST   /api/applications/:id/bureau/query
POST   /api/applications/:id/lists/validate
POST   /api/applications/:id/decision/run

GET    /api/catalogs/document-types
GET    /api/catalogs/statuses
```

## 10. Payloads

### 10.1 CreateApplicationPayload

```ts
export interface CreateApplicationPayload {
  personType: PersonType;
  scenario: ApplicationScenario;
  requestedAmount: number;
  executiveName: string;

  physicalPerson?: PhysicalPerson;
  moralPerson?: MoralPerson;
  legalRepresentative?: LegalRepresentative;
  guarantor?: Guarantor;
}
```

### 10.2 ApplicationFilters

```ts
export interface ApplicationFilters {
  search?: string;
  status?: ApplicationStatus | "todos";
  personType?: PersonType | "todos";
  decision?: ApplicationDecision | "todas";
  scenario?: ApplicationScenario | "todos";
}
```

## 11. Error handling

Los servicios mock pueden lanzar errores simulados solo si se necesita mostrar estado error.

Formato:

```ts
throw new Error("No se pudo completar la operación demo.");
```

Los componentes deben capturar errores y mostrar mensaje amigable.

## 12. Criterios de aceptación

1. Los componentes consumen servicios, no mocks directos.
2. Existe `applicationService.ts`.
3. Existe `applicationMockService.ts`.
4. Existen mocks de al menos 8 solicitudes.
5. Las funciones retornan Promises.
6. Las funciones simulan delay.
7. Crear solicitud agrega al mock store.
8. Actualizar documentos modifica la solicitud.
9. Ejecutar validaciones actualiza datos relacionados.
10. Ejecutar decisión actualiza solicitud.
11. El código queda preparado para reemplazar mocks por API HTTP.
```
