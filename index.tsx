import { Routes, Route, Navigate } from 'react-router-dom'
import { CRMProvider } from './context/CRMContext'
import { CRMLayout } from './components/layout/CRMLayout'
import { CRMDashboard } from './components/dashboard/CRMDashboard'
import { CompanyList } from './components/companies/CompanyList'
import { ContactList } from './components/contacts/ContactList'
import { DealsKanban } from './components/deals/DealsKanban'
import { TaskList } from './components/tasks/TaskList'

export default function AtomicCRM() {
  return (
    <CRMProvider>
      <CRMLayout>
        <Routes>
          <Route index element={<CRMDashboard />} />
          <Route path="companies" element={<CompanyList />} />
          <Route path="contacts" element={<ContactList />} />
          <Route path="deals" element={<DealsKanban />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </CRMLayout>
    </CRMProvider>
  )
}
