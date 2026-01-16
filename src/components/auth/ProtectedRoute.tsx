import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, client } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rillation-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-rillation-purple" />
          <p className="text-rillation-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check if user has access: either client is "Rillation Revenue" or email domain is @rillationrevenue.com
  const emailDomain = user.email?.split('@')[1]?.toLowerCase()
  const hasRillationRevenueEmail = emailDomain === 'rillationrevenue.com'
  const hasRillationRevenueClient = client === 'Rillation Revenue'
  
  if (!hasRillationRevenueClient && !hasRillationRevenueEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rillation-bg">
        <div className="max-w-md w-full bg-rillation-card rounded-lg shadow-lg p-8 border border-rillation-border">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-rillation-text mb-2">
              Access Restricted
            </h1>
            <p className="text-rillation-text-muted">
              This application is restricted to Rillation Revenue users only.
              {client && (
                <span className="block mt-2">
                  Your account is associated with "{client}".
                </span>
              )}
              {!client && (
                <span className="block mt-2">
                  Your account does not have a client assigned.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
