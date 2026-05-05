import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ExplorePage from "./pages/ExplorePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TicketsPage from "./pages/TicketsPage";
import MyEventsPage from "./pages/MyEventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import CreateHostPage from "./pages/CreateHostPage";
import HostProfilePage from "./pages/HostProfilePage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import CheckinPage from "./pages/CheckinPage";
import DashboardRouter from "./pages/DashboardRouter";
import HostDashboardPage from "./pages/HostDashboardPage";
import HostReportsPage from "./pages/HostReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/hosts/:slug" element={<HostProfilePage />} />
          <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
          <Route path="/my-events" element={<ProtectedRoute><MyEventsPage /></ProtectedRoute>} />
          <Route path="/hosts/new" element={<ProtectedRoute><CreateHostPage /></ProtectedRoute>} />
          <Route path="/invite/:token" element={<ProtectedRoute><AcceptInvitePage /></ProtectedRoute>} />
          <Route path="/events/:eventId/checkin" element={<ProtectedRoute><CheckinPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/hosts/:hostId/dashboard" element={<ProtectedRoute><HostDashboardPage /></ProtectedRoute>} />
          <Route path="/hosts/:hostId/reports" element={<ProtectedRoute><HostReportsPage /></ProtectedRoute>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
