import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Checklist = lazy(() => import('./pages/Checklist'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Settings = lazy(() => import('./pages/Settings'))
const Collection = lazy(() => import('./pages/Collection'))
const Sport = lazy(() => import('./pages/Sport'))
const Calendar = lazy(() => import('./pages/Calendar'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
          <Route path="/sport" element={<ProtectedRoute><Sport /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ThemeProvider>
  )
}
