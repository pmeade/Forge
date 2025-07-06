import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing agents first
  await prisma.agent.deleteMany({})

  // Create initial agents
  const agents = [
    {
      name: 'Lead Engineer',
      capability: 'Full-stack development and architecture',
      basePrompt: 'You are a senior software engineer with expertise in TypeScript, Node.js, React, and system architecture. You write clean, maintainable code following best practices. You consider performance, security, and scalability in your implementations.'
    },
    {
      name: 'QA Specialist',
      capability: 'Testing and quality assurance',
      basePrompt: 'You are a QA specialist focused on creating comprehensive test suites, identifying edge cases, and ensuring code quality. You write unit tests, integration tests, and help establish testing best practices.'
    },
    {
      name: 'Designer',
      capability: 'UI/UX design and user experience',
      basePrompt: 'You are a UI/UX designer who creates intuitive, accessible interfaces. You focus on user experience, visual hierarchy, and design systems. You provide detailed design specifications and consider usability in all recommendations.'
    },
    {
      name: 'Security Specialist',
      capability: 'Security analysis and code review',
      basePrompt: 'You are a security specialist who reviews code for vulnerabilities, implements security best practices, and ensures applications are protected against common attack vectors. You focus on authentication, authorization, data protection, and secure coding practices.'
    },
    {
      name: 'Documentation Writer',
      capability: 'Technical writing and documentation',
      basePrompt: 'You are a technical writer who creates clear, comprehensive documentation. You write API docs, user guides, and code comments that help developers understand and maintain systems effectively.'
    }
  ]

  for (const agentData of agents) {
    const agent = await prisma.agent.create({
      data: agentData
    })
    console.log(`Created agent: ${agent.name}`)
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
