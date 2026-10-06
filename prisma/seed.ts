import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'
import { resetDemoContent } from './demo-content'
import { normalizeDatabaseUrl } from '../src/lib/db-url'
import { assertSafeToRunDestructive } from '../src/lib/db-safety'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Overwrites the demo account's password and library: stop unless this database is marked safe to reset
assertSafeToRunDestructive(connectionString, 'seed (this resets the demo account)')

const pool = new Pool({ connectionString: normalizeDatabaseUrl(connectionString) })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const systemItemTypes = [
  { name: 'snippet', icon: 'Code', color: '#3b82f6', isSystem: true },
  { name: 'prompt', icon: 'Sparkles', color: '#8b5cf6', isSystem: true },
  { name: 'command', icon: 'Terminal', color: '#f97316', isSystem: true },
  { name: 'note', icon: 'StickyNote', color: '#fde047', isSystem: true },
  { name: 'file', icon: 'File', color: '#6b7280', isSystem: true },
  { name: 'image', icon: 'Image', color: '#ec4899', isSystem: true },
  { name: 'link', icon: 'Link', color: '#10b981', isSystem: true },
]

async function main() {
  console.log('🌱 Starting seed...\n')

  // ============================================
  // 1. SEED SYSTEM ITEM TYPES
  // ============================================
  console.log('📦 Seeding system item types...')
  const itemTypeMap: Record<string, string> = {}

  for (const type of systemItemTypes) {
    const existing = await prisma.itemType.findFirst({
      where: {
        name: type.name,
        userId: null,
        isSystem: true,
      },
    })

    if (!existing) {
      const created = await prisma.itemType.create({
        data: {
          name: type.name,
          icon: type.icon,
          color: type.color,
          isSystem: type.isSystem,
        },
      })
      itemTypeMap[type.name] = created.id
      console.log(`   ✓ Created: ${type.name}`)
    } else {
      itemTypeMap[type.name] = existing.id
      console.log(`   • Already exists: ${type.name}`)
    }
  }

  // ============================================
  // 2. CREATE DEMO USER
  // ============================================
  console.log('\n👤 Creating demo user...')
  const hashedPassword = await bcrypt.hash('12345678', 12)

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@bitbin.dev' },
    update: {
      name: 'Demo User',
      password: hashedPassword,
      isPro: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      emailVerified: new Date(),
    },
    create: {
      email: 'demo@bitbin.dev',
      name: 'Demo User',
      password: hashedPassword,
      isPro: false,
      emailVerified: new Date(),
    },
  })
  console.log(`   ✓ Demo user: ${demoUser.email}`)

  // ============================================
  // 3. CLEAN UP AND FILL THE DEMO USER'S LIBRARY
  // ============================================
  console.log('\n📝 Resetting the demo user collections and items...')
  await prisma.$transaction((tx) => resetDemoContent(tx, demoUser.id), { timeout: 30_000 })
  console.log('   ✓ 3 collections, 17 items')

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n✅ Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   • 7 system item types`)
  console.log(`   • 1 demo user (demo@bitbin.dev / 12345678)`)
  console.log(`   • 3 collections`)
  console.log(`   • 17 items total`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
