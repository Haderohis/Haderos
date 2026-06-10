import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <button onClick={handleSignOut} className="btn-secondary text-sm px-3 py-1.5">
          Déconnexion
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="card">
          <p className="text-sm text-gray-500">Connecté en tant que</p>
          <p className="font-medium text-gray-900 mt-1">{user?.email}</p>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-2">Démarrage rapide</h2>
          <p className="text-sm text-gray-500">
            Modifiez <code className="bg-gray-100 px-1 rounded">src/pages/Dashboard.jsx</code> pour
            commencer à construire votre application.
          </p>
        </div>
      </div>
    </main>
  )
}
