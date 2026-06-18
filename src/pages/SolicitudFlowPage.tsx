import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FileUp,
  IdCard,
  Loader2,
  Store,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChoiceCard } from "../features/solicitud/components/ChoiceCard";
import { QuestionScreen } from "../features/solicitud/components/QuestionScreen";
import {
  acceptAuthorization,
  confirmIneReview,
  createSolicitudFlow,
  getSolicitudFlow,
  saveBasicData,
  saveBusinessData,
  saveDocumentFile,
  saveIneFile,
  saveRequestedAmount,
  setDocumentStatus,
  selectApplicantKind,
  submitSolicitudFlow,
  updateSolicitudStep,
} from "../features/solicitud/services/solicitudFlowService";
import type {
  ApplicantKind,
  BasicData,
  BusinessData,
  SolicitudDocument,
  SolicitudFlowState,
  SolicitudStep,
  StoredFile,
  PublicDocumentStatus,
} from "../features/solicitud/types/solicitud.types";
import { PUBLIC_DOCUMENT_STATUS_LABELS } from "../features/solicitud/types/solicitud.types";
import { Button } from "../shared/components/Button";
import { Input } from "../shared/components/Input";
import { cx } from "../shared/lib/formatters";

const TOTAL_STEPS = 10;
const AMOUNT_OPTIONS = [10000, 20000, 30000, 40000, 60000];

const STEP_NUMBER: Record<Exclude<SolicitudStep, "final" | "bienvenida">, number> = {
  tipo_solicitante: 2,
  ine: 3,
  revision_ine: 4,
  datos_basicos: 5,
  datos_negocio: 6,
  monto: 7,
  documentos: 8,
  autorizacion: 9,
  resumen: 10,
};

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function storedFileFromFile(file: File): StoredFile {
  return {
    name: file.name,
    type: file.type || "archivo",
    size: file.size,
  };
}

function documentStatusClass(status: SolicitudDocument["status"]): string {
  if (status === "uploaded") return "bg-emerald-50 text-emerald-700";
  if (status === "review_pending") return "bg-sky-50 text-sky-700";
  if (status === "needs_change") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function canContinueBasicData(flow: SolicitudFlowState): boolean {
  if (flow.applicantKind === "company") {
    return Boolean(
      flow.basicData.companyName.trim() &&
        flow.basicData.representativeName.trim() &&
        flow.basicData.phone.trim() &&
        flow.basicData.email.trim() &&
        flow.basicData.rfc.trim(),
    );
  }

  return Boolean(
    flow.basicData.fullName.trim() &&
      flow.basicData.phone.trim() &&
      flow.basicData.email.trim() &&
      flow.basicData.rfc.trim() &&
      flow.basicData.curp.trim(),
  );
}

function canContinueBusinessData(data: BusinessData): boolean {
  return Boolean(data.activity.trim() && data.seniorityYears.trim() && data.monthlyIncome.trim());
}

function BasicDataFields({
  applicantKind,
  value,
  onChange,
}: {
  applicantKind?: ApplicantKind;
  value: BasicData;
  onChange: (value: BasicData) => void;
}) {
  const patch = (field: keyof BasicData, fieldValue: string) => onChange({ ...value, [field]: fieldValue });

  if (applicantKind === "company") {
    return (
      <div className="grid gap-4">
        <Input
          className="h-12 text-base"
          label="Nombre de la empresa"
          value={value.companyName}
          onChange={(event) => patch("companyName", event.target.value)}
        />
        <Input
          className="h-12 text-base"
          label="Nombre del representante"
          value={value.representativeName}
          onChange={(event) => patch("representativeName", event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            className="h-12 text-base"
            label="Teléfono"
            value={value.phone}
            onChange={(event) => patch("phone", event.target.value)}
          />
          <Input
            className="h-12 text-base"
            label="Correo"
            type="email"
            value={value.email}
            onChange={(event) => patch("email", event.target.value)}
          />
        </div>
        <Input
          className="h-12 text-base"
          label="RFC"
          value={value.rfc}
          onChange={(event) => patch("rfc", event.target.value.toUpperCase())}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Input
        className="h-12 text-base"
        label="Nombre completo"
        value={value.fullName}
        onChange={(event) => patch("fullName", event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          className="h-12 text-base"
          label="Teléfono"
          value={value.phone}
          onChange={(event) => patch("phone", event.target.value)}
        />
        <Input
          className="h-12 text-base"
          label="Correo"
          type="email"
          value={value.email}
          onChange={(event) => patch("email", event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          className="h-12 text-base"
          label="RFC"
          value={value.rfc}
          onChange={(event) => patch("rfc", event.target.value.toUpperCase())}
        />
        <Input
          className="h-12 text-base"
          label="CURP"
          value={value.curp}
          onChange={(event) => patch("curp", event.target.value.toUpperCase())}
        />
      </div>
    </div>
  );
}

function BusinessDataFields({
  applicantKind,
  value,
  onChange,
}: {
  applicantKind?: ApplicantKind;
  value: BusinessData;
  onChange: (value: BusinessData) => void;
}) {
  const patch = (field: keyof BusinessData, fieldValue: string) => onChange({ ...value, [field]: fieldValue });

  return (
    <div className="grid gap-4">
      <Input
        className="h-12 text-base"
        label={applicantKind === "company" ? "Giro de la empresa" : "Actividad del negocio"}
        value={value.activity}
        onChange={(event) => patch("activity", event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          className="h-12 text-base"
          label="Años de operación"
          min="0"
          type="number"
          value={value.seniorityYears}
          onChange={(event) => patch("seniorityYears", event.target.value)}
        />
        <Input
          className="h-12 text-base"
          label="Ingresos mensuales"
          min="0"
          type="number"
          value={value.monthlyIncome}
          onChange={(event) => patch("monthlyIncome", event.target.value)}
        />
      </div>
      {applicantKind === "company" && (
        <Input
          className="h-12 text-base"
          label="Ventas anuales"
          min="0"
          type="number"
          value={value.annualSales}
          onChange={(event) => patch("annualSales", event.target.value)}
        />
      )}
    </div>
  );
}

export function SolicitudFlowPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<SolicitudFlowState | null>(null);
  const [loading, setLoading] = useState(Boolean(flowId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherAmount, setOtherAmount] = useState("");

  useEffect(() => {
    if (!flowId) {
      setFlow(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void getSolicitudFlow(flowId)
      .then((result) => {
        setFlow(result);
        if (result?.requestedAmount && !AMOUNT_OPTIONS.includes(result.requestedAmount)) {
          setOtherAmount(String(result.requestedAmount));
        }
      })
      .finally(() => setLoading(false));
  }, [flowId]);

  const stepNumber = useMemo(() => {
    if (!flow) return 1;
    if (flow.currentStep === "final" || flow.currentStep === "bienvenida") return 1;
    return STEP_NUMBER[flow.currentStep];
  }, [flow]);

  const runAction = async (action: () => Promise<SolicitudFlowState>, redirect?: string) => {
    setSaving(true);
    setError(null);
    try {
      const nextFlow = await action();
      setFlow(nextFlow);
      if (redirect) navigate(redirect);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No pudimos guardar este paso.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-[8px] bg-white px-5 py-4 text-slate-600 shadow-sm ring-1 ring-slate-200">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando tu solicitud
        </div>
      </section>
    );
  }

  if (!flowId) {
    return (
      <QuestionScreen
        step={1}
        totalSteps={TOTAL_STEPS}
        title="Vamos a iniciar tu solicitud"
        description="Te haremos algunas preguntas y te pediremos tu identificación para avanzar con la revisión."
        actions={
          <Button
            className="min-h-12 w-full sm:w-auto"
            icon={<ArrowRight className="h-4 w-4" />}
            loading={saving}
            size="lg"
            type="button"
            onClick={() =>
              runAction(async () => {
                const created = await createSolicitudFlow();
                navigate(`/solicitud/${created.flowId}`);
                return created;
              })
            }
          >
            Comenzar
          </Button>
        }
      >
        <div className="rounded-[8px] bg-[#F5FAFF] p-5 text-base leading-7 text-slate-700">
          Tus datos se usan únicamente para revisar tu solicitud.
        </div>
      </QuestionScreen>
    );
  }

  if (!flow) {
    return (
      <QuestionScreen
        step={1}
        totalSteps={TOTAL_STEPS}
        title="No encontramos esta solicitud"
        description="Puedes iniciar una nueva solicitud cuando quieras."
        actions={
          <Button size="lg" type="button" onClick={() => navigate("/solicitud")}>
            Iniciar solicitud
          </Button>
        }
      >
        <div />
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "tipo_solicitante") {
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="¿Quién solicita el crédito?"
        description="Esto nos ayuda a pedirte únicamente la información necesaria."
      >
        <div className="grid gap-4">
          <ChoiceCard
            icon={<User className="h-6 w-6" />}
            selected={flow.applicantKind === "physical"}
            title="Soy persona física"
            onClick={() => runAction(() => selectApplicantKind(flow.flowId, "physical"))}
          />
          <ChoiceCard
            icon={<Building2 className="h-6 w-6" />}
            selected={flow.applicantKind === "company"}
            title="Represento a una empresa"
            onClick={() => runAction(() => selectApplicantKind(flow.flowId, "company"))}
          />
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "ine") {
    const canContinue = Boolean(flow.ineFront && flow.ineBack);

    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Sube una foto de tu INE"
        description="Necesitamos una imagen clara del frente y reverso de tu identificación."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "tipo_solicitante"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!canContinue}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "revision_ine"))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "front", title: "Frente de la INE", file: flow.ineFront },
            { key: "back", title: "Reverso de la INE", file: flow.ineBack },
          ].map((item) => (
            <label
              className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-[#0F4C81] hover:bg-[#F5FAFF]"
              key={item.key}
            >
              <FileUp className="mb-3 h-8 w-8 text-[#0F4C81]" />
              <span className="text-base font-bold text-slate-950">{item.title}</span>
              <span className="mt-2 text-sm text-slate-500">{item.file ? item.file.name : "Toca para agregar archivo"}</span>
              <input
                accept="image/*,.pdf"
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void runAction(() => saveIneFile(flow.flowId, item.key as "front" | "back", storedFileFromFile(file)));
                }}
              />
            </label>
          ))}
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "revision_ine") {
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Revisa que tu INE se vea bien"
        description="Antes de continuar, confirma que la información sea legible."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "ine"))}
            >
              Quiero cambiar la imagen
            </Button>
            <Button
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => confirmIneReview(flow.flowId, true))}
            >
              Sí, se ve bien
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => runAction(() => confirmIneReview(flow.flowId, true))}
            >
              Continuar de todos modos
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {["La foto no está borrosa", "El texto se puede leer", "La identificación aparece completa"].map((item) => (
            <div className="flex items-center gap-3 rounded-[8px] bg-slate-50 p-4 text-slate-700" key={item}>
              <Check className="h-5 w-5 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "datos_basicos") {
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title={flow.applicantKind === "company" ? "Cuéntanos sobre la empresa" : "Cuéntanos sobre ti"}
        description="Usaremos estos datos para identificar tu solicitud."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "revision_ine"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!canContinueBasicData(flow)}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => saveBasicData(flow.flowId, flow.basicData))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <BasicDataFields
          applicantKind={flow.applicantKind}
          value={flow.basicData}
          onChange={(basicData) => setFlow({ ...flow, basicData })}
        />
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "datos_negocio") {
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title={flow.applicantKind === "company" ? "Cuéntanos sobre la empresa" : "Cuéntanos sobre tu negocio"}
        description="Esta información nos ayuda a entender mejor tu actividad."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "datos_basicos"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!canContinueBusinessData(flow.businessData)}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => saveBusinessData(flow.flowId, flow.businessData))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <BusinessDataFields
          applicantKind={flow.applicantKind}
          value={flow.businessData}
          onChange={(businessData) => setFlow({ ...flow, businessData })}
        />
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "monto") {
    const selectedAmount = otherAmount ? Number(otherAmount) : flow.requestedAmount;

    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="¿Qué monto necesitas?"
        description="Elige una opción o escribe un monto diferente."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "datos_negocio"))}
            >
              Atrás
            </Button>
            <Button
              disabled={!selectedAmount || selectedAmount <= 0}
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => saveRequestedAmount(flow.flowId, selectedAmount ?? 0))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {AMOUNT_OPTIONS.map((amount) => (
            <button
              className={cx(
                "flex min-h-14 items-center justify-center rounded-[8px] border px-4 text-base font-bold transition",
                flow.requestedAmount === amount && !otherAmount
                  ? "border-[#0F4C81] bg-[#F5FAFF] text-[#0F4C81] ring-2 ring-[#E6F0FA]"
                  : "border-slate-200 bg-white text-slate-800 hover:border-[#0F4C81]",
              )}
              key={amount}
              type="button"
              onClick={() => {
                setOtherAmount("");
                setFlow({ ...flow, requestedAmount: amount });
              }}
            >
              {money(amount)}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Input
            className="h-12 text-base"
            label="Otro monto"
            min="1"
            type="number"
            value={otherAmount}
            onChange={(event) => {
              setOtherAmount(event.target.value);
              setFlow({ ...flow, requestedAmount: Number(event.target.value) || undefined });
            }}
          />
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "documentos") {
    const added = flow.documents.filter((document) => document.status !== "missing").length;

    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Agrega tus documentos"
        description="Puedes continuar aunque todavía falte algún documento."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "monto"))}
            >
              Atrás
            </Button>
            <Button
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "autorizacion"))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="mb-4 rounded-[8px] bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          {added} de {flow.documents.length} documentos agregados
        </div>
        <div className="grid gap-3">
          {flow.documents.map((document) => (
            <div className="flex flex-col gap-3 rounded-[8px] border border-slate-200 p-4 sm:flex-row sm:items-center" key={document.id}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-950">{document.label}</p>
                  {document.optional && <span className="text-xs font-semibold text-slate-400">Opcional</span>}
                </div>
                {document.file && <p className="mt-1 truncate text-sm text-slate-500">{document.file.name}</p>}
              </div>
              <span className={cx("w-fit rounded-full px-3 py-1 text-xs font-bold", documentStatusClass(document.status))}>
                {PUBLIC_DOCUMENT_STATUS_LABELS[document.status]}
              </span>
              <select
                className="min-h-11 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA]"
                value={document.status}
                onChange={(event) =>
                  runAction(() => setDocumentStatus(flow.flowId, document.id, event.target.value as PublicDocumentStatus))
                }
              >
                {Object.entries(PUBLIC_DOCUMENT_STATUS_LABELS).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <FileUp className="h-4 w-4" />
                Agregar
                <input
                  accept="image/*,.pdf"
                  className="sr-only"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void runAction(() => saveDocumentFile(flow.flowId, document.id, storedFileFromFile(file)));
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "autorizacion") {
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Autoriza la revisión"
        description="Necesitamos tu autorización para revisar la información que compartiste."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "documentos"))}
            >
              Atrás
            </Button>
            <Button
              icon={<ArrowRight className="h-4 w-4" />}
              loading={saving}
              size="lg"
              type="button"
              onClick={() => {
                if (!flow.authorizationAccepted) {
                  setError("Necesitamos tu autorización para continuar con la solicitud.");
                  return;
                }
                void runAction(() => acceptAuthorization(flow.flowId, true));
              }}
            >
              Continuar
            </Button>
          </>
        }
      >
        <label className="flex cursor-pointer gap-4 rounded-[8px] border border-slate-200 p-4 transition hover:border-[#0F4C81]">
          <input
            checked={flow.authorizationAccepted}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-[#0F4C81] focus:ring-[#E6F0FA]"
            type="checkbox"
            onChange={(event) => {
              setError(null);
              setFlow({ ...flow, authorizationAccepted: event.target.checked });
            }}
          />
          <span className="text-base leading-7 text-slate-700">
            Autorizo a ALPEZ a revisar la información de esta solicitud y contactarme para continuar.
          </span>
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </QuestionScreen>
    );
  }

  const docsAdded = flow.documents.filter((document) => document.status !== "missing").length;
  const displayName =
    flow.applicantKind === "company"
      ? flow.basicData.companyName || flow.basicData.representativeName
      : flow.basicData.fullName;

  return (
    <QuestionScreen
      step={stepNumber}
      totalSteps={TOTAL_STEPS}
      title="Revisa tu información"
      description="Confirma que todo esté correcto antes de enviar."
      actions={
        <>
          <Button
            icon={<ArrowLeft className="h-4 w-4" />}
            type="button"
            variant="outline"
            onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "autorizacion"))}
          >
            Atrás
          </Button>
          <Button
            icon={<ArrowRight className="h-4 w-4" />}
            loading={saving}
            size="lg"
            type="button"
            onClick={() => runAction(() => submitSolicitudFlow(flow.flowId), `/solicitud/${flow.flowId}/final`)}
          >
            Enviar solicitud
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {[
          ["Solicitante", flow.applicantKind === "company" ? "Empresa" : "Persona física"],
          ["Nombre", displayName || "Sin capturar"],
          ["Teléfono", flow.basicData.phone || "Sin capturar"],
          ["Correo", flow.basicData.email || "Sin capturar"],
          ["Monto", money(flow.requestedAmount ?? 0)],
          ["Documentos", `${docsAdded} agregados, ${flow.documents.length - docsAdded} faltantes`],
        ].map(([label, value]) => (
          <div className="flex items-center justify-between gap-4 rounded-[8px] bg-slate-50 p-4" key={label}>
            <span className="text-sm font-semibold text-slate-500">{label}</span>
            <span className="text-right font-bold text-slate-950">{value}</span>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </QuestionScreen>
  );
}
