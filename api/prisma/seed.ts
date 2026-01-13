/**
 * Database Seed Script
 * Creates sample data for development/testing
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ==========================================================================
  // ORGANIZATION
  // ==========================================================================
  
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-architects' },
    update: {},
    create: {
      name: 'Demo Architects Ltd',
      slug: 'demo-architects',
      domain: 'demo-architects.co.uk',
      primaryColor: '#16a34a',
      defaultExpiryDays: 14,
      reminderDays: [3, 7, 10]
    }
  })
  
  console.log(`✅ Organization: ${org.name}`)

  // ==========================================================================
  // USERS
  // ==========================================================================
  
  const owner = await prisma.user.upsert({
    where: { externalId: 'user_demo_owner' },
    update: {},
    create: {
      externalId: 'user_demo_owner',
      email: 'owner@demo-architects.co.uk',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'OWNER',
      organizationId: org.id
    }
  })
  
  const architect = await prisma.user.upsert({
    where: { externalId: 'user_demo_architect' },
    update: {},
    create: {
      externalId: 'user_demo_architect',
      email: 'james@demo-architects.co.uk',
      firstName: 'James',
      lastName: 'Wilson',
      role: 'MEMBER',
      organizationId: org.id
    }
  })
  
  console.log(`✅ Users: ${owner.firstName}, ${architect.firstName}`)

  // ==========================================================================
  // CLIENTS
  // ==========================================================================
  
  const client1 = await prisma.client.upsert({
    where: { 
      organizationId_email: {
        organizationId: org.id,
        email: 'john.smith@example.com'
      }
    },
    update: {},
    create: {
      email: 'john.smith@example.com',
      firstName: 'John',
      lastName: 'Smith',
      company: 'Smith Developments',
      phone: '+447700900123',
      organizationId: org.id
    }
  })
  
  const client2 = await prisma.client.upsert({
    where: { 
      organizationId_email: {
        organizationId: org.id,
        email: 'emma.jones@example.com'
      }
    },
    update: {},
    create: {
      email: 'emma.jones@example.com',
      firstName: 'Emma',
      lastName: 'Jones',
      company: 'Jones Property Group',
      phone: '+447700900456',
      organizationId: org.id
    }
  })
  
  console.log(`✅ Clients: ${client1.firstName}, ${client2.firstName}`)

  // ==========================================================================
  // PROJECTS
  // ==========================================================================
  
  const project1 = await prisma.project.upsert({
    where: { 
      organizationId_reference: {
        organizationId: org.id,
        reference: 'PRJ-2024-001'
      }
    },
    update: {},
    create: {
      name: 'Riverside House Extension',
      reference: 'PRJ-2024-001',
      description: 'Two-storey rear extension with contemporary design',
      address: '42 Riverside Drive, London, SW15 2NU',
      status: 'ACTIVE',
      currentStage: 'DETAILED_DESIGN',
      organizationId: org.id,
      clientId: client1.id,
      members: {
        create: [
          { userId: owner.id, role: 'LEAD' },
          { userId: architect.id, role: 'MEMBER' }
        ]
      }
    }
  })
  
  const project2 = await prisma.project.upsert({
    where: { 
      organizationId_reference: {
        organizationId: org.id,
        reference: 'PRJ-2024-002'
      }
    },
    update: {},
    create: {
      name: 'Oakwood Barn Conversion',
      reference: 'PRJ-2024-002',
      description: 'Grade II listed barn conversion to residential',
      address: '15 Church Lane, Guildford, GU1 3RH',
      status: 'ACTIVE',
      currentStage: 'PLANNING_PACK',
      organizationId: org.id,
      clientId: client2.id,
      members: {
        create: [
          { userId: architect.id, role: 'LEAD' }
        ]
      }
    }
  })
  
  const project3 = await prisma.project.upsert({
    where: { 
      organizationId_reference: {
        organizationId: org.id,
        reference: 'PRJ-2024-003'
      }
    },
    update: {},
    create: {
      name: 'Victoria Terrace Renovation',
      reference: 'PRJ-2024-003',
      description: 'Full renovation of Victorian terraced house',
      address: '8 Victoria Terrace, Brighton, BN1 4ED',
      status: 'ACTIVE',
      currentStage: 'INITIAL_DRAWINGS',
      organizationId: org.id,
      clientId: client1.id,
      members: {
        create: [
          { userId: owner.id, role: 'LEAD' }
        ]
      }
    }
  })
  
  console.log(`✅ Projects: ${project1.name}, ${project2.name}, ${project3.name}`)

  // ==========================================================================
  // APPROVALS
  // ==========================================================================
  
  // Project 1 - Completed initial, pending detailed design
  await prisma.approval.upsert({
    where: { token: 'demo-approval-001' },
    update: {},
    create: {
      token: 'demo-approval-001',
      stage: 'INITIAL_DRAWINGS',
      stageLabel: 'Initial Drawings',
      status: 'APPROVED',
      deliverableUrl: 'https://example.com/drawings/initial-001.pdf',
      deliverableType: 'PDF',
      deliverableName: 'Initial Concept Drawings v1.0',
      respondedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      responseNotes: 'Love the design direction. Approved!',
      responseTimeHours: 48.5,
      viewCount: 5,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      projectId: project1.id,
      clientId: client1.id,
      sentById: owner.id
    }
  })
  
  await prisma.approval.upsert({
    where: { token: 'demo-approval-002' },
    update: {},
    create: {
      token: 'demo-approval-002',
      stage: 'DETAILED_DESIGN',
      stageLabel: 'Detailed Design',
      status: 'PENDING',
      deliverableUrl: 'https://example.com/drawings/detailed-001.pdf',
      deliverableType: 'PDF',
      deliverableName: 'Detailed Design Package v1.0',
      viewCount: 2,
      viewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      projectId: project1.id,
      clientId: client1.id,
      sentById: architect.id
    }
  })
  
  // Project 2 - Changes requested
  await prisma.approval.upsert({
    where: { token: 'demo-approval-003' },
    update: {},
    create: {
      token: 'demo-approval-003',
      stage: 'INITIAL_DRAWINGS',
      stageLabel: 'Initial Drawings',
      status: 'APPROVED',
      respondedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      responseTimeHours: 72,
      viewCount: 3,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      projectId: project2.id,
      clientId: client2.id,
      sentById: architect.id
    }
  })
  
  await prisma.approval.upsert({
    where: { token: 'demo-approval-004' },
    update: {},
    create: {
      token: 'demo-approval-004',
      stage: 'DETAILED_DESIGN',
      stageLabel: 'Detailed Design',
      status: 'APPROVED',
      respondedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      responseTimeHours: 36,
      viewCount: 4,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      projectId: project2.id,
      clientId: client2.id,
      sentById: architect.id
    }
  })
  
  await prisma.approval.upsert({
    where: { token: 'demo-approval-005' },
    update: {},
    create: {
      token: 'demo-approval-005',
      stage: 'PLANNING_PACK',
      stageLabel: 'Planning Pack',
      status: 'CHANGES_REQUESTED',
      respondedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      responseNotes: 'Could we revisit the window placement on the north elevation? Concerned about overlooking neighbours.',
      responseTimeHours: 24,
      viewCount: 6,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      projectId: project2.id,
      clientId: client2.id,
      sentById: architect.id
    }
  })
  
  // Project 3 - Pending (bottleneck - 5 days old)
  await prisma.approval.upsert({
    where: { token: 'demo-approval-006' },
    update: {},
    create: {
      token: 'demo-approval-006',
      stage: 'INITIAL_DRAWINGS',
      stageLabel: 'Initial Drawings',
      status: 'PENDING',
      deliverableUrl: 'https://example.com/drawings/victoria-initial.pdf',
      deliverableType: 'PDF',
      deliverableName: 'Initial Concept Drawings',
      viewCount: 1,
      viewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      reminderCount: 1,
      lastReminderAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      projectId: project3.id,
      clientId: client1.id,
      sentById: owner.id
    }
  })
  
  console.log('✅ Approvals created')

  // ==========================================================================
  // EMAIL TEMPLATES
  // ==========================================================================
  
  await prisma.emailTemplate.upsert({
    where: { 
      organizationId_slug: {
        organizationId: org.id,
        slug: 'approval_request'
      }
    },
    update: {},
    create: {
      name: 'Approval Request',
      slug: 'approval_request',
      subject: 'Approval Required: {{projectName}} - {{stageName}}',
      bodyHtml: '<h1>Approval Required</h1><p>Hi {{clientName}},</p><p>Please review and approve the {{stageName}} for {{projectName}}.</p><p><a href="{{approvalUrl}}">Review Now</a></p>',
      bodyText: 'Hi {{clientName}}, Please review and approve the {{stageName}} for {{projectName}}. Review here: {{approvalUrl}}',
      organizationId: org.id
    }
  })
  
  await prisma.emailTemplate.upsert({
    where: { 
      organizationId_slug: {
        organizationId: org.id,
        slug: 'approval_reminder'
      }
    },
    update: {},
    create: {
      name: 'Approval Reminder',
      slug: 'approval_reminder',
      subject: 'Reminder: Approval Needed for {{projectName}}',
      bodyHtml: '<h1>Reminder</h1><p>Hi {{clientName}},</p><p>This is a reminder that {{stageName}} for {{projectName}} is awaiting your approval.</p><p><a href="{{approvalUrl}}">Review Now</a></p>',
      bodyText: 'Hi {{clientName}}, This is a reminder that {{stageName}} for {{projectName}} is awaiting your approval. Review here: {{approvalUrl}}',
      organizationId: org.id
    }
  })
  
  console.log('✅ Email templates created')

  // ==========================================================================
  // AUDIT LOG ENTRIES
  // ==========================================================================
  
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'project.created',
        entityType: 'project',
        entityId: project1.id,
        organizationId: org.id,
        userId: owner.id,
        projectId: project1.id,
        metadata: { name: project1.name }
      },
      {
        action: 'approval.created',
        entityType: 'approval',
        entityId: 'demo-approval-001',
        organizationId: org.id,
        userId: owner.id,
        projectId: project1.id,
        metadata: { stage: 'INITIAL_DRAWINGS' }
      },
      {
        action: 'approval.approve',
        entityType: 'approval',
        entityId: 'demo-approval-001',
        organizationId: org.id,
        projectId: project1.id,
        metadata: { stage: 'INITIAL_DRAWINGS' },
        newState: { status: 'APPROVED' }
      }
    ],
    skipDuplicates: true
  })
  
  console.log('✅ Audit logs created')

  console.log('')
  console.log('🎉 Seed complete!')
  console.log('')
  console.log('Demo credentials:')
  console.log('  Organization: demo-architects')
  console.log('  Owner: owner@demo-architects.co.uk')
  console.log('  Architect: james@demo-architects.co.uk')
  console.log('')
  console.log('Test approval URLs:')
  console.log('  Pending: /approve/demo-approval-002')
  console.log('  Pending (bottleneck): /approve/demo-approval-006')
  console.log('')
  console.log('Client portal token:', client1.portalToken)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
