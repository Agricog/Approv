/**
 * CreateClientPage
 * Page wrapper for creating new clients
 */
import { useNavigate } from 'react-router-dom'
import CreateClientForm from '../components/forms/CreateClientForm'

export default function CreateClientPage() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto">
      <CreateClientForm
        onSuccess={() => {
          // Success handled in form
        }}
        onCancel={() => navigate('/dashboard/clients')}
      />
    </div>
  )
}
