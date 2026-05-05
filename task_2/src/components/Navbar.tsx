import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="flex items-center gap-4 px-6 py-3 border-b">
      <Link to="/">Explore</Link>
      <Link to="/tickets">My Tickets</Link>
      <Link to="/my-events">My Events</Link>

      <div className="ml-auto flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/hosts/new">Create Host</Link>
            <NotificationBell />
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}
