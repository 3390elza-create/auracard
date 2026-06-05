import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/server/getAdminSession'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import { AdminDailyCreditTable } from '@/components/admin/AdminDailyCreditTable'
import { VaultAdminPanel } from '@/components/admin/VaultAdminPanel'
import { Web3Providers } from '@/lib/web3/providers'

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return (
    <Web3Providers>
      <main className="min-h-screen bg-[#0A0A0F] py-8">
        <VaultAdminPanel />
        <AdminDailyCreditTable />
        <AdminUsersTable adminEmail={session.email} />
      </main>
    </Web3Providers>
  )
}
