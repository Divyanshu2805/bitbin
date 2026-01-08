import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

async function main() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  console.log('Connecting to database...')

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // Test connection by querying item types
    console.log('\n📦 System Item Types:')
    const itemTypes = await prisma.itemType.findMany({
      where: { isSystem: true },
      orderBy: { name: 'asc' },
    })

    itemTypes.forEach((type) => {
      console.log(`   ${type.icon.padEnd(12)} ${type.name.padEnd(10)} ${type.color}`)
    })

    // Fetch demo user
    console.log('\n👤 Demo User:')
    const demoUser = await prisma.user.findUnique({
      where: { email: 'demo@bitbin.dev' },
      include: {
        collections: {
          include: {
            items: {
              include: {
                item: {
                  include: {
                    itemType: true,
                  },
                },
              },
            },
          },
        },
        items: {
          include: {
            itemType: true,
          },
        },
      },
    })

    if (demoUser) {
      console.log(`   Email: ${demoUser.email}`)
      console.log(`   Name: ${demoUser.name}`)
      console.log(`   Pro: ${demoUser.isPro}`)
      console.log(`   Verified: ${demoUser.emailVerified ? 'Yes' : 'No'}`)

      // Display collections
      console.log(`\n📁 Collections (${demoUser.collections.length}):`)
      for (const collection of demoUser.collections) {
        console.log(`\n   ${collection.name}`)
        console.log(`   "${collection.description}"`)
        console.log(`   Items:`)
        for (const ic of collection.items) {
          const icon = ic.item.itemType.icon
          const type = ic.item.itemType.name
          console.log(`      • [${icon}] ${ic.item.title} (${type})`)
        }
      }

      // Summary by type
      console.log('\n📊 Items by Type:')
      const typeCounts: Record<string, number> = {}
      for (const item of demoUser.items) {
        const typeName = item.itemType.name
        typeCounts[typeName] = (typeCounts[typeName] || 0) + 1
      }
      for (const [type, count] of Object.entries(typeCounts).sort()) {
        console.log(`   ${type}: ${count}`)
      }
    } else {
      console.log('   Demo user not found. Run: npx prisma db seed')
    }

    // Count tables
    console.log('\n📈 Total Counts:')
    const [users, items, collections, tags] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.collection.count(),
      prisma.tag.count(),
    ])

    console.log(`   Users: ${users}`)
    console.log(`   Items: ${items}`)
    console.log(`   Collections: ${collections}`)
    console.log(`   Tags: ${tags}`)

    console.log('\n✅ Database connection successful!')
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
