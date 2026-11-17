export default function PriorityBadge({ priority }) {
  if (!priority) {
    return <span className="badge priority-unassigned">Unassigned</span>;
  }

  return (
    <span className={`badge priority-${priority.toLowerCase()}`}>
      {priority}
    </span>
  );
}