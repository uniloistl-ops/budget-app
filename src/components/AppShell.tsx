import { NavLink, Outlet } from "react-router-dom";
import { IconHome, IconReceipt, IconTag, IconTarget, IconWallet, IconSettings } from "./icons";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: IconHome, end: true },
  { to: "/transactions", label: "Transactions", icon: IconReceipt, end: false },
  { to: "/categories", label: "Categories", icon: IconTag, end: false },
  { to: "/goals", label: "Goals", icon: IconTarget, end: false },
  { to: "/paycheck", label: "Paycheck", icon: IconWallet, end: false },
  { to: "/settings", label: "Settings", icon: IconSettings, end: false },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <nav className="app-shell__nav" aria-label="Main">
        <div className="app-shell__brand">Calm Budget</div>
        <ul className="app-shell__nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  "app-shell__nav-link" + (isActive ? " app-shell__nav-link--active" : "")
                }
              >
                <item.icon className="app-shell__nav-icon" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
