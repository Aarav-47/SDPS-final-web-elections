import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { VoteProvider } from "./context/VoteContext";
import AuthPage from "./pages/AuthPage";
import ConfirmPage from "./pages/ConfirmPage";
import VotePage from "./pages/VotePage";
import ThankYouPage from "./pages/ThankYouPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import LiveResults from "./pages/LiveResults";
import Declaration from "./pages/Declaration";
import NoticeBoard from "./pages/NoticeBoard";
import RequireAdmin from "./components/RequireAdmin";

export default function App() {
  return (
    <BrowserRouter>
      <VoteProvider>
        <Routes>
          {/* Public — no auth required */}
          <Route path="/" element={<AuthPage />} />
          <Route path="/confirm" element={<ConfirmPage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/thank-you" element={<ThankYouPage />} />
          <Route path="/board" element={<NoticeBoard />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected — admin login required, redirects back after login */}
          <Route path="/results" element={<RequireAdmin><LiveResults /></RequireAdmin>} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/declaration" element={<RequireAdmin><Declaration /></RequireAdmin>} />
        </Routes>
        <Toaster position="top-center" richColors closeButton />
      </VoteProvider>
    </BrowserRouter>
  );
}
