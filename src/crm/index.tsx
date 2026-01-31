import { Routes, Route, Navigate } from 'react-router-dom'
import { CRMProvider } from './context/CRMContext'
import { DropdownProvider } from '../contexts/DropdownContext'
import { CRMLayout } from './components/layout/CRMLayout'
import { ContactList } from './components/contacts/ContactList'
import { DealsKanban } from './components/deals/DealsKanban'
import { TaskList } from './components/tasks/TaskList'

export default function AtomicCRM() {
  return (
    <CRMProvider>
      <DropdownProvider>
      <CRMLayout>
        <Routes>
          <Route index element={<Navigate to="/crm/contacts" replace />} />
          <Route path="contacts" element={<ContactList />} />
          <Route path="deals" element={<DealsKanban />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="*" element={<Navigate to="/crm/contacts" replace />} />
        </Routes>
      </CRMLayout>
      </DropdownProvider>
    </CRMProvider>
  )
}
