import { getSupabaseConfigError } from '../../lib/supabase'

export default function ConfigError() {
  const error = getSupabaseConfigError()
  
  if (!error) return null
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="ml-3 text-2xl font-bold text-gray-900">Configuration Error</h1>
        </div>
        
        <div className="mt-4">
          <p className="text-gray-700 mb-4">{error}</p>
          
          <div className="bg-gray-50 rounded-md p-4 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">To fix this:</p>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              <li>Go to your Vercel project settings</li>
              <li>Navigate to Environment Variables</li>
              <li>Add the following variables:
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li><code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_URL</code></li>
                  <li><code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code></li>
                </ul>
              </li>
              <li>Redeploy your application</li>
            </ol>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>For more details, see: <code className="bg-gray-100 px-1 rounded">VERCEL_DEPLOYMENT.md</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}

