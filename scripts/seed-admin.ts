import { prisma } from '../lib/db/prisma'
import { hashPassword } from '../lib/admin/server/password'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars to seed an admin.')
  }
  const passwordHash = await hashPassword(password)
  const lower = email.toLowerCase()
  const admin = await prisma.admin.upsert({
    where: { email: lower },
    create: { email: lower, passwordHash },
    update: { passwordHash },
  })
  console.log(`Seeded admin: ${admin.email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
