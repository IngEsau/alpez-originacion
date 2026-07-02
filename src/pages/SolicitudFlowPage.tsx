import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  FileText,
  FileUp,
  Loader2,
  MessageSquare,
  RefreshCw,
  Trash2,
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
  removeDocumentFile,
  saveBasicData,
  saveBusinessData,
  saveDocumentFile,
  saveIneFile,
  saveRequestedAmount,
  sendPhoneVerificationCode,
  startSolicitudProcessing,
  setCollateralChoice,
  setGuarantorChoice,
  selectApplicantKind,
  submitSolicitudFlow,
  updateSolicitudStep,
  verifyPhoneCode,
} from "../features/solicitud/services/solicitudFlowService";
import type {
  ApplicantKind,
  BasicData,
  BusinessData,
  SolicitudDocument,
  SolicitudFlowState,
  SolicitudStep,
  StoredFile,
} from "../features/solicitud/types/solicitud.types";
import { PUBLIC_DOCUMENT_STATUS_LABELS } from "../features/solicitud/types/solicitud.types";
import { demoScenarioPersonTypeWarning, parseDemoCreditScenario } from "../features/solicitud/utils/demoCreditScenario";
import { isRequestedAmountInDemoRange, MAX_REQUESTED_AMOUNT, MIN_REQUESTED_AMOUNT } from "../features/solicitud/utils/requestedAmount";
import { Button } from "../shared/components/Button";
import { Input } from "../shared/components/Input";
import { cx } from "../shared/lib/formatters";

const TOTAL_STEPS = 12;
const AMOUNT_OPTIONS = [10000, 20000, 30000, 40000, 60000];

const STEP_NUMBER: Record<Exclude<SolicitudStep, "final" | "bienvenida">, number> = {
  tipo_solicitante: 2,
  ine: 3,
  revision_ine: 4,
  datos_basicos: 5,
  datos_negocio: 6,
  monto: 7,
  documentos: 8,
  phone_verification: 9,
  autorizacion: 10,
  resumen: 11,
  processing: 12,
};

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function storedFileFromFile(file: File): Promise<StoredFile> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || "archivo",
        size: file.size,
        previewUrl: typeof reader.result === "string" ? reader.result : undefined,
      });
    };
    reader.onerror = () => {
      resolve({
        name: file.name,
        type: file.type || "imagen",
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  });
}

function openStoredFile(file?: StoredFile): void {
  if (file?.previewUrl) {
    window.open(file.previewUrl, "_blank", "noopener,noreferrer");
  }
}

function isImageFile(file?: StoredFile): boolean {
  return Boolean(file?.type.startsWith("image/") && file.previewUrl);
}

function documentStatusClass(status: SolicitudDocument["status"]): string {
  if (status === "uploaded") return "bg-emerald-50 text-emerald-700";
  if (status === "review_pending") return "bg-sky-50 text-sky-700";
  if (status === "needs_change") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function getDocument(flow: SolicitudFlowState, id: string): SolicitudDocument | undefined {
  return flow.documents.find((document) => document.id === id);
}

function visibleSolicitudDocuments(flow: SolicitudFlowState): SolicitudDocument[] {
  return flow.documents.filter((document) => {
    if ((document.id === "ine_aval" || document.id === "comprobante_domicilio_aval") && !flow.hasGuarantor) {
      return false;
    }
    if (document.id === "garantia" && !flow.hasCollateral) return false;
    return true;
  });
}

function documentCounts(flow: SolicitudFlowState): { added: number; pending: number } {
  const documents = visibleSolicitudDocuments(flow);
  const added = documents.filter((document) => {
    if (document.id === "ine_titular" || document.id === "ine_representante_legal") {
      return Boolean(flow.ineFront && flow.ineBack);
    }
    return document.status !== "missing";
  }).length;
  return { added, pending: documents.length - added };
}

function FilePreview({ file }: { file?: StoredFile }) {
  if (!file) return null;
  if (isImageFile(file)) {
    return (
      <img
        alt={file.name}
        className="mt-3 h-28 w-full rounded-[8px] border border-slate-200 object-cover"
        src={file.previewUrl}
      />
    );
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-[8px] bg-slate-50 p-3 text-sm text-slate-600">
      <FileText className="h-5 w-5 text-[#0F4C81]" />
      <span>Archivo agregado</span>
    </div>
  );
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
  const demoScenario = import.meta.env.VITE_DEMO_MODE === "true"
    ? parseDemoCreditScenario(new URLSearchParams(window.location.search).get("demoScenario"))
    : null;
  const [flow, setFlow] = useState<SolicitudFlowState | null>(null);
  const [loading, setLoading] = useState(Boolean(flowId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherAmount, setOtherAmount] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [processingIndex, setProcessingIndex] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

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
        setOtpSuccessMessage(result?.phoneVerification.codeVerified ? "Celular verificado correctamente." : "");
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

  const processingMessages = [
    "Revisando la información",
    "Verificando la autorización",
    "Consultando el historial crediticio",
    "Preparando el resultado",
  ];

  async function processAndSubmitSolicitud() {
    if (!flow) return;
    setSaving(true);
    setError(null);
    try {
      const processingFlow = await startSolicitudProcessing(flow.flowId);
      setFlow(processingFlow);
      for (let index = 0; index < processingMessages.length; index += 1) {
        setProcessingIndex(index);
        await new Promise((resolve) => window.setTimeout(resolve, 650));
      }
      const submitted = await submitSolicitudFlow(flow.flowId);
      setFlow(submitted);
      navigate(`/solicitud/${flow.flowId}/final`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No pudimos finalizar la solicitud.");
    } finally {
      setSaving(false);
    }
  }

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
                const created = await createSolicitudFlow(demoScenario ?? undefined);
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
    const demoWarning = import.meta.env.VITE_DEMO_MODE === "true"
      ? demoScenarioPersonTypeWarning(flow.demoCreditScenario, flow.applicantKind)
      : null;

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
          {demoWarning && (
            <p className="rounded-[8px] bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              {demoWarning}
            </p>
          )}
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
              <FilePreview file={item.file} />
              <input
                accept="image/*,.pdf"
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void storedFileFromFile(file).then((storedFile) =>
                    runAction(() => saveIneFile(flow.flowId, item.key as "front" | "back", storedFile)),
                  );
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
    const amountIsValid = isRequestedAmountInDemoRange(selectedAmount);

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
              disabled={!amountIsValid}
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
            max={MAX_REQUESTED_AMOUNT}
            min={MIN_REQUESTED_AMOUNT}
            type="number"
            value={otherAmount}
            onChange={(event) => {
              setOtherAmount(event.target.value);
              setFlow({ ...flow, requestedAmount: Number(event.target.value) || undefined });
            }}
          />
          {selectedAmount && !amountIsValid && (
            <p className="mt-2 text-sm font-semibold text-red-600">
              Selecciona un monto entre $10,000 y $60,000.
            </p>
          )}
        </div>
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "documentos") {
    const counts = documentCounts(flow);
    const titularDocuments = ["ine_titular", "curp", "constancia_situacion_fiscal", "comprobante_domicilio_titular", "comprobante_domicilio_negocio", "opinion_positiva_sat"]
      .map((id) => getDocument(flow, id))
      .filter(Boolean) as SolicitudDocument[];
    const financialDocuments = (flow.applicantKind === "company"
      ? ["estados_cuenta_bancarios", "declaracion_anual", "estados_financieros"]
      : ["estados_cuenta_bancarios", "declaracion_anual"])
      .map((id) => getDocument(flow, id))
      .filter(Boolean) as SolicitudDocument[];
    const companyEssentialDocuments = [
      "ine_representante_legal",
      "comprobante_domicilio_empresa",
      "comprobante_domicilio_representante",
      "constancia_situacion_fiscal",
      "opinion_positiva_sat",
      "poder_representante_legal",
      "acta_constitutiva",
    ]
      .map((id) => getDocument(flow, id))
      .filter(Boolean) as SolicitudDocument[];
    const guarantorDocuments = ["ine_aval", "comprobante_domicilio_aval"]
      .map((id) => getDocument(flow, id))
      .filter(Boolean) as SolicitudDocument[];
    const collateralDocument = getDocument(flow, "garantia");
    const hasMissing = counts.pending > 0;
    const saveFile = (document: SolicitudDocument, file: File) =>
      storedFileFromFile(file).then((storedFile) => runAction(() => saveDocumentFile(flow.flowId, document.id, storedFile)));
    const renderDocumentCard = (document: SolicitudDocument) => {
      const hasFile = Boolean(document.file);

      return (
        <div className="rounded-[8px] border border-slate-200 bg-white p-4" key={document.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-950">{document.label}</p>
                <span className={cx("rounded-full px-3 py-1 text-xs font-bold", documentStatusClass(document.status))}>
                  {PUBLIC_DOCUMENT_STATUS_LABELS[document.status]}
                </span>
              </div>
              {document.file && <p className="mt-1 truncate text-sm text-slate-500">{document.file.name}</p>}
              <FilePreview file={document.file} />
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {hasFile && (
                <Button
                  icon={<Eye className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => openStoredFile(document.file)}
                >
                  Ver archivo
                </Button>
              )}
              <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                {hasFile ? <RefreshCw className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                {hasFile ? "Cambiar" : "Agregar"}
                <input
                  accept="image/*,.pdf"
                  className="sr-only"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void saveFile(document, file);
                  }}
                />
              </label>
              {hasFile && (
                <Button
                  icon={<Trash2 className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => runAction(() => removeDocumentFile(flow.flowId, document.id))}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    };
    const renderIneCard = (document: SolicitudDocument) => {
      const hasIne = Boolean(flow.ineFront && flow.ineBack);

      return (
        <div className="rounded-[8px] border border-slate-200 bg-white p-4" key={document.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-950">{document.label}</p>
                <span
                  className={cx(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    hasIne ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {hasIne ? "Agregada desde el inicio" : "Falta agregar"}
                </span>
              </div>
              {hasIne ? (
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  <p className="truncate">Frente: {flow.ineFront?.name}</p>
                  <p className="truncate">Reverso: {flow.ineBack?.name}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Necesitamos frente y reverso para continuar la revisión.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {hasIne && (
                <Button
                  icon={<Eye className="h-4 w-4" />}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => openStoredFile(flow.ineFront)}
                >
                  Ver archivo
                </Button>
              )}
              <Button
                icon={hasIne ? <RefreshCw className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "ine"))}
              >
                {hasIne ? "Cambiar" : "Agregar"}
              </Button>
            </div>
          </div>
        </div>
      );
    };
    const renderSection = (title: string, description: string, documents: SolicitudDocument[]) => (
      <section className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="grid gap-3">
          {documents.map((document) =>
            document.id === "ine_titular" || document.id === "ine_representante_legal"
              ? renderIneCard(document)
              : renderDocumentCard(document),
          )}
        </div>
      </section>
    );
    const renderChoice = (value: boolean | undefined, onSelect: (value: boolean) => void) => (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Sí", value: true },
          { label: "No / aún no", value: false },
        ].map((choice) => (
          <button
            className={cx(
              "min-h-12 rounded-[8px] border px-4 text-base font-bold transition",
              value === choice.value
                ? "border-[#0F4C81] bg-[#F5FAFF] text-[#0F4C81] ring-2 ring-[#E6F0FA]"
                : "border-slate-200 bg-white text-slate-800 hover:border-[#0F4C81]",
            )}
            key={choice.label}
            type="button"
            onClick={() => onSelect(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    );

    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Completa tus documentos"
        description="Puedes agregarlos ahora o continuar y completarlos después si hace falta."
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
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "phone_verification"))}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="mb-5 grid gap-3 rounded-[8px] bg-slate-50 p-4 text-sm font-semibold text-slate-600 sm:grid-cols-2">
          <div>Documentos agregados: {counts.added}</div>
          <div>Pendientes por completar: {counts.pending}</div>
        </div>
        {hasMissing && (
          <div className="mb-5 rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Puedes continuar, pero es posible que un asesor te pida completar algunos documentos después.
          </div>
        )}
        {flow.applicantKind === "physical" ? (
          <div className="grid gap-5">
            {renderSection(
              "Documentos del titular",
              "Agrega los documentos principales para revisar tu solicitud.",
              titularDocuments,
            )}
            {renderSection(
              "Información financiera",
              "Estos documentos ayudan a revisar el comportamiento de tu negocio.",
              financialDocuments,
            )}
            <section className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950">Aval y garantía</h2>
              </div>
              <div className="grid gap-5">
                <div className="rounded-[8px] bg-white p-4">
                  <p className="mb-3 font-bold text-slate-950">¿Tu solicitud contará con aval?</p>
                  {renderChoice(flow.hasGuarantor, (value) =>
                    runAction(() => setGuarantorChoice(flow.flowId, value)),
                  )}
                  {flow.hasGuarantor === true && <div className="mt-4 grid gap-3">{guarantorDocuments.map(renderDocumentCard)}</div>}
                  {flow.hasGuarantor === false && (
                    <p className="mt-4 rounded-[8px] bg-[#F5FAFF] p-3 text-sm leading-6 text-slate-600">
                      Puedes continuar. Si se requiere aval, un asesor te lo solicitará más adelante.
                    </p>
                  )}
                </div>
                <div className="rounded-[8px] bg-white p-4">
                  <p className="mb-3 font-bold text-slate-950">¿Cuentas con una garantía para esta solicitud?</p>
                  {renderChoice(flow.hasCollateral, (value) =>
                    runAction(() => setCollateralChoice(flow.flowId, value)),
                  )}
                  {flow.hasCollateral === true && collateralDocument && (
                    <div className="mt-4">{renderDocumentCard(collateralDocument)}</div>
                  )}
                  {flow.hasCollateral === false && (
                    <p className="mt-4 rounded-[8px] bg-[#F5FAFF] p-3 text-sm leading-6 text-slate-600">
                      Puedes continuar. Si se requiere garantía, un asesor te lo indicará.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-5">
            {renderSection(
              "Documentos de la empresa y representante",
              "Agrega los documentos principales de la empresa y de su representante legal.",
              companyEssentialDocuments,
            )}
            {renderSection(
              "Información financiera",
              "Estos documentos ayudan a revisar el comportamiento de la empresa.",
              financialDocuments,
            )}
            <section className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950">Aval y garantía</h2>
              </div>
              <div className="grid gap-5">
                <div className="rounded-[8px] bg-white p-4">
                  <p className="mb-3 font-bold text-slate-950">¿La solicitud contará con aval?</p>
                  {renderChoice(flow.hasGuarantor, (value) =>
                    runAction(() => setGuarantorChoice(flow.flowId, value)),
                  )}
                  {flow.hasGuarantor === true && <div className="mt-4 grid gap-3">{guarantorDocuments.map(renderDocumentCard)}</div>}
                  {flow.hasGuarantor === false && (
                    <p className="mt-4 rounded-[8px] bg-[#F5FAFF] p-3 text-sm leading-6 text-slate-600">
                      Puedes continuar. Si se requiere aval, un asesor te lo solicitará más adelante.
                    </p>
                  )}
                </div>
                <div className="rounded-[8px] bg-white p-4">
                  <p className="mb-3 font-bold text-slate-950">¿Cuentan con una garantía para esta solicitud?</p>
                  {renderChoice(flow.hasCollateral, (value) =>
                    runAction(() => setCollateralChoice(flow.flowId, value)),
                  )}
                  {flow.hasCollateral === true && collateralDocument && (
                    <div className="mt-4">{renderDocumentCard(collateralDocument)}</div>
                  )}
                  {flow.hasCollateral === false && (
                    <p className="mt-4 rounded-[8px] bg-[#F5FAFF] p-3 text-sm leading-6 text-slate-600">
                      Puedes continuar. Si se requiere garantía, un asesor te lo indicará.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "phone_verification") {
    const verification = flow.phoneVerification;
    const hasValidPhone = verification.phone.length === 10;
    const phoneEnding = verification.phone.slice(-4);
    const canConfirmCode = otpCode.length === 6;
    const canContinue = verification.codeVerified;
    const sendCode = async (eventName?: "sms_enviado" | "otp_reenviado") => {
      setSaving(true);
      setError(null);
      setOtpSuccessMessage("");
      try {
        const nextFlow = await sendPhoneVerificationCode(flow.flowId, eventName);
        setFlow(nextFlow);
        setOtpCode("");
        setResendCooldown(30);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "No pudimos enviar el código.");
      } finally {
        setSaving(false);
      }
    };
    const confirmCode = async () => {
      setSaving(true);
      setError(null);
      setOtpSuccessMessage("");
      try {
        const nextFlow = await verifyPhoneCode(flow.flowId, otpCode);
        setFlow(nextFlow);
        if (nextFlow.phoneVerification.codeVerified) {
          setOtpSuccessMessage("Celular verificado correctamente.");
        } else {
          setError("El código no coincide. Revisa los dígitos e inténtalo de nuevo.");
        }
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "No pudimos confirmar el código.");
      } finally {
        setSaving(false);
      }
    };

    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Verifica tu celular"
        description="Te enviaremos un código para confirmar que podemos contactarte durante el proceso."
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
              disabled={!canContinue}
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
        {!hasValidPhone ? (
          <div className="rounded-[8px] bg-amber-50 p-5 text-amber-800">
            <p className="font-bold">Necesitamos tu número celular para enviarte el código.</p>
            <Button
              className="mt-4"
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "datos_basicos"))}
            >
              Volver a datos personales
            </Button>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="rounded-[8px] bg-[#F5FAFF] p-4 text-base leading-7 text-slate-700">
              <p>El código se enviará al número que capturaste en tus datos personales.</p>
              <p className="mt-2 font-bold text-slate-950">
                Enviaremos el código al número terminado en ...{phoneEnding}
              </p>
            </div>

            {!verification.codeSent && !verification.codeVerified && (
              <Button
                className="min-h-12 w-full"
                icon={<MessageSquare className="h-4 w-4" />}
                loading={saving}
                size="lg"
                type="button"
                onClick={() => void sendCode("sms_enviado")}
              >
                {saving ? "Enviando código..." : "Enviar código"}
              </Button>
            )}

            {verification.codeSent && !verification.codeVerified && (
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Código de verificación</span>
                  <input
                    className="h-14 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-center text-2xl font-bold tracking-[0.35em] text-slate-950 outline-none transition placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Ingresa el código de 6 dígitos"
                    value={otpCode}
                    onChange={(event) => {
                      setError(null);
                      setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    }}
                  />
                </label>
                <Button
                  className="min-h-12 w-full"
                  disabled={!canConfirmCode}
                  loading={saving}
                  size="lg"
                  type="button"
                  onClick={() => void confirmCode()}
                >
                  {saving ? "Verificando..." : "Confirmar código"}
                </Button>
                <div className="flex flex-col gap-2 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-center">
                  <span>¿No recibiste el código?</span>
                  <button
                    className="font-bold text-[#0F4C81] disabled:text-slate-400"
                    disabled={resendCooldown > 0 || saving}
                    type="button"
                    onClick={() => void sendCode("otp_reenviado")}
                  >
                    {resendCooldown > 0 ? `Reenviar código en ${resendCooldown}s` : "Reenviar código"}
                  </button>
                </div>
              </div>
            )}

            {otpSuccessMessage && (
              <div className="rounded-[8px] bg-emerald-50 p-4 text-center font-bold text-emerald-700">
                {otpSuccessMessage}
              </div>
            )}
            {error && <p className="text-center text-sm font-semibold text-red-600">{error}</p>}
            {verification.attempts >= 5 && !verification.codeVerified && (
              <p className="rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Has intentado varias veces. Puedes reenviar el código o pedir ayuda.
              </p>
            )}
          </div>
        )}
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "autorizacion") {
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Autorización para revisar tu información e historial crediticio"
        description="Necesitamos tu autorización para revisar la información que compartiste y continuar con el resultado."
        actions={
          <>
            <Button
              icon={<ArrowLeft className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => runAction(() => updateSolicitudStep(flow.flowId, "phone_verification"))}
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
            Autorizo a ALPEZ a revisar la información de esta solicitud, consultar mi historial crediticio y contactarme para continuar.
          </span>
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </QuestionScreen>
    );
  }

  if (flow.currentStep === "processing") {
    return (
      <QuestionScreen
        step={stepNumber}
        totalSteps={TOTAL_STEPS}
        title="Estamos revisando tu solicitud"
        description="Esto tomará solo unos segundos."
      >
        <div className="grid gap-3">
          {processingMessages.map((message, index) => (
            <div
              className={cx(
                "flex items-center gap-3 rounded-[8px] p-4 text-sm font-semibold transition",
                index <= processingIndex ? "bg-[#F5FAFF] text-[#0F4C81]" : "bg-slate-50 text-slate-400",
              )}
              key={message}
            >
              {index < processingIndex ? (
                <Check className="h-5 w-5 text-emerald-600" />
              ) : index === processingIndex ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="h-5 w-5 rounded-full border border-slate-300" />
              )}
              <span>{message}</span>
            </div>
          ))}
        </div>
        {error && <p className="mt-4 text-center text-sm font-semibold text-red-600">{error}</p>}
      </QuestionScreen>
    );
  }

  const docsSummary = documentCounts(flow);
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
            onClick={() => void processAndSubmitSolicitud()}
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
          ["Documentos", `${docsSummary.added} agregados, ${docsSummary.pending} faltantes`],
          ["Celular", flow.phoneVerified ? "Verificado" : "Pendiente"],
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
