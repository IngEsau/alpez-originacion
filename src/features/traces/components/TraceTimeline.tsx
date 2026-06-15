import type { TraceEvent } from "../types/trace.types";
import { TraceEventStatusBadge } from "../../../shared/components/Badge";
import { Card } from "../../../shared/components/Card";
import { formatDateTime, traceStepLabels } from "../../../shared/lib/formatters";

export function TraceTimeline({ events, title = "Timeline de traza" }: { events: TraceEvent[]; title?: string }) {
  return (
    <Card title={title} description="Eventos técnicos y operativos registrados por trace_id">
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full bg-[#0F4C81]" />
              {index < events.length - 1 && <span className="mt-1 h-full w-px bg-slate-200" />}
            </div>
            <div className="min-w-0 flex-1 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">{event.title}</p>
                <TraceEventStatusBadge status={event.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{event.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                {traceStepLabels[event.step]} · {formatDateTime(event.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
