import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default async function AdminLoginPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0F] px-4">
      <AdminLoginForm />
    </main>
  )
}
