import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";

const iconMap = {
  total: Ticket,
  new: AlertCircle,
  progress: Clock,
  resolved: CheckCircle2,
  urgent: Activity,
};

export default function MetricCard({
  title,
  value,
  description,
  type = "total",
  color = "blue",
}) {
  const Icon = iconMap[type] || Ticket;

  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={21} />
      </div>

      <div className="metric-content">
        <p>{title}</p>
        <h2>{value}</h2>

        {description && (
          <span className="metric-description">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}