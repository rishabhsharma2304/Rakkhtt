import { Link } from "react-router-dom";
import { Check } from "lucide-react";

export interface Stage {
  key: string;
  label: string;
}

export function PipelineStepper({
  stages,
  active,
  basePath,
}: {
  stages: Stage[];
  active: string;
  basePath: string;
}) {
  const activeIdx = stages.findIndex((s) => s.key === active);
  return (
    <div className="flex items-center">
      {stages.map((s, i) => {
        const done = i < activeIdx;
        const isActive = i === activeIdx;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <Link to={`${basePath}/${s.key}`} className="flex flex-col items-center gap-2">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                  isActive
                    ? "border-accent bg-accent text-white"
                    : done
                      ? "border-accent-deep bg-accent-deep text-white"
                      : "border-line-chip bg-card text-muted"
                }`}
              >
                {done ? <Check size={16} /> : i + 1}
              </span>
              <span className={`whitespace-nowrap text-[12.5px] font-semibold ${isActive ? "text-accent-deep" : "text-muted"}`}>
                {s.label}
              </span>
            </Link>
            {i < stages.length - 1 && (
              <span className={`mx-2 h-[2px] flex-1 ${i < activeIdx ? "bg-accent-deep" : "bg-line-chip"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AllCompleted({ label = "All Completed !" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
        <Check size={32} />
      </span>
      <p className="font-display text-lg font-bold text-success">{label}</p>
      <p className="text-sm text-muted">This stage's queue is empty.</p>
    </div>
  );
}
