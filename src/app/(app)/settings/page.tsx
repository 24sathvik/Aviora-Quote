import { SettingsForm } from './SettingsForm'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Settings</h1>
      <SettingsForm />
    </div>
  )
}
