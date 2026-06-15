import type { TimelineEvent } from "../types/application.types";
import { Card } from "../../../shared/components/Card";
import { formatDateTime, applicationStatusLabels } from "../../../shared/lib/formatters";

export function ApplicationTimeline({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <Card title="Timeline de avance" description="Eventos recorridos por la solicitud">
      <div className="space-y-4">
        {timeline.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full bg-[#0F4C81]" />
              {index < timeline.length - 1 && <span className="mt-1 h-full w-px bg-slate-200" />}
            </div>
            <div className="pb-3">
              <p className="font-semibold text-slate-950">{event.title}</p>
              <p className="mt-1 text-sm text-slate-500">{event.description ?? applicationStatusLabels[event.status]}</p>
              <p className="mt-1 text-xs text-slate-400">
                {event.actor} · {formatDateTime(event.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
