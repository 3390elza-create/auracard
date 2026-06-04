import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return (
    <main className="min-h-screen bg-[#0A0A0F]">
      <AdminUsersTable adminEmail={session.email} />
    </main>
  )
}
