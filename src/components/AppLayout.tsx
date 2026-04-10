import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/plan", label: "Plan" },
  { to: "/meals", label: "Meals" },
  { to: "/recipes", label: "Recipes" },
  { to: "/calc", label: "Calc" },
  { to: "/progress", label: "Progress" },
];

export default function AppLayout() {
  return (
    <>
      <Outlet />
      <nav className="nav-bottom">
        {links.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
