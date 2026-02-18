// Redirect wizard users to the landing page
import { redirect } from 'next/navigation'

export default function WizardPage() {
  redirect('/')
}
