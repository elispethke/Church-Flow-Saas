import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ── Church ────────────────────────────────────────────────────────────────
  const church = await prisma.church.upsert({
    where: { slug: 'church-flow-demo' },
    update: {},
    create: {
      name: 'Church Flow Demo',
      slug: 'church-flow-demo',
      email: 'demo@churchflow.app',
    },
  })

  // ── Permissions (global) ──────────────────────────────────────────────────
  const permissionDefs = [
    { code: 'users.read', name: 'View Users', description: 'List and view user profiles' },
    { code: 'users.write', name: 'Manage Users', description: 'Create, update, and deactivate users' },
    { code: 'finance.read', name: 'View Finances', description: 'View transactions, budgets, and reports' },
    { code: 'finance.write', name: 'Manage Finances', description: 'Create and manage financial transactions' },
    { code: 'assets.read', name: 'View Assets', description: 'View church asset inventory' },
    { code: 'assets.write', name: 'Manage Assets', description: 'Create and manage church assets' },
    { code: 'departments.read', name: 'View Departments', description: 'View department structure and members' },
    { code: 'departments.write', name: 'Manage Departments', description: 'Create and manage departments and leaders' },
  ]

  const permissions = await Promise.all(
    permissionDefs.map((p) =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: p,
      }),
    ),
  )

  const permissionByCode = Object.fromEntries(permissions.map((p) => [p.code, p]))

  // ── Roles (per church) ────────────────────────────────────────────────────
  const roleDefs = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full system access across all modules',
      codes: permissionDefs.map((p) => p.code),
    },
    {
      name: 'ADMIN',
      description: 'Church administration and user management',
      codes: ['users.read', 'users.write', 'departments.read', 'departments.write'],
    },
    {
      name: 'FINANCE_MANAGER',
      description: 'Financial and asset management',
      codes: ['finance.read', 'finance.write', 'assets.read', 'assets.write'],
    },
    {
      name: 'DEPARTMENT_LEADER',
      description: 'Department creation and management',
      codes: ['departments.read', 'departments.write'],
    },
    {
      name: 'VIEWER',
      description: 'Read-only access to all modules',
      codes: ['users.read', 'finance.read', 'assets.read', 'departments.read'],
    },
  ]

  for (const roleDef of roleDefs) {
    const role = await prisma.role.upsert({
      where: { churchId_name: { churchId: church.id, name: roleDef.name } },
      update: {},
      create: {
        churchId: church.id,
        name: roleDef.name,
        description: roleDef.description,
      },
    })

    await prisma.rolePermission.createMany({
      data: roleDef.codes.map((code) => ({
        roleId: role.id,
        permissionId: permissionByCode[code].id,
      })),
      skipDuplicates: true,
    })
  }

  console.log('Seed completed')
  console.log(`  Church : ${church.name} (${church.slug})`)
  console.log(`  Permissions: ${permissions.length}`)
  console.log(`  Roles      : ${roleDefs.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
