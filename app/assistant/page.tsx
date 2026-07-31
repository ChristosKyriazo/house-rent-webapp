import UsageAssistantPanel from '@/app/components/UsageAssistantPanel'

// The page is a thin shell; server-side scoping (admin vs. self) happens inside
// the API route, so the same UI serves both audiences.
export default function AssistantPage() {
  return (
    <main className="px-4 py-8">
      <UsageAssistantPanel />
    </main>
  )
}
