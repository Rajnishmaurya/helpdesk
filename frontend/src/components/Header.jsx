import { Bell, Search } from "lucide-react";

export default function Header({ title, subtitle }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" aria-label="Search">
          <Search size={19} />
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={19} />
        </button>
        <div className="topbar-avatar">U</div>
      </div>
    </header>
  );
}