import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import People from './pages/People'
import Appreciation from './pages/Appreciation'
import Calendar from './pages/Calendar'
import Surveys from './pages/Surveys'
import SurveyFill from './pages/SurveyFill'
import AdminPanel from './pages/admin/AdminPanel'
import SurveyBuilder from './pages/admin/SurveyBuilder'
import SurveyResults from './pages/admin/SurveyResults'
import ChangePassword from './pages/ChangePassword'
import SalesOverview from './pages/SalesOverview'
import Pipeline from './pages/Pipeline'
import Performance from './pages/Performance'
import Leaderboard from './pages/Leaderboard'
import Library from './pages/Library'
import Clients from './pages/Clients'
import OrgChart from './pages/OrgChart'
import ForgotPassword from './pages/ForgotPassword'
import Onboarding from './pages/Onboarding'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
          <Route path="/people" element={<ProtectedRoute><Layout><People /></Layout></ProtectedRoute>} />
          <Route path="/appreciation" element={<ProtectedRoute><Layout><Appreciation /></Layout></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>} />
          <Route path="/surveys" element={<ProtectedRoute><Layout><Surveys /></Layout></ProtectedRoute>} />
          <Route path="/surveys/:id" element={<ProtectedRoute><Layout><SurveyFill /></Layout></ProtectedRoute>} />

          <Route path="/sales" element={<ProtectedRoute><Layout><SalesOverview /></Layout></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><Layout><Pipeline /></Layout></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute><Layout><Performance /></Layout></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Layout><Leaderboard /></Layout></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><Layout><Library /></Layout></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Layout><Clients /></Layout></ProtectedRoute>} />
          <Route path="/org-chart" element={<ProtectedRoute><Layout><OrgChart /></Layout></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><Layout><Onboarding /></Layout></ProtectedRoute>} />
          <Route path="/change-password" element={<ProtectedRoute><Layout><ChangePassword /></Layout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPanel /></Layout></ProtectedRoute>} />
          <Route path="/admin/surveys/new" element={<ProtectedRoute adminOnly><Layout><SurveyBuilder /></Layout></ProtectedRoute>} />
          <Route path="/admin/surveys/:id/results" element={<ProtectedRoute adminOnly><Layout><SurveyResults /></Layout></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
