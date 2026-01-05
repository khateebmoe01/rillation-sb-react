import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FilterProvider } from './contexts/FilterContext'
import { AIProvider } from './contexts/AIContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <FilterProvider>
        <AIProvider>
          <App />
        </AIProvider>
      </FilterProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

