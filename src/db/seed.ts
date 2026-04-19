import 'dotenv/config';
import { db } from './index';
import { firms, users, clients, projects, siteStages } from './schema';
import bcrypt from 'bcryptjs';
import { STAGE_FLAT } from '../lib/constants/stage-hierarchy';

async function seed() {
  console.log('Seeding database...');

  // Create firm
  const [firm] = await db.insert(firms).values({
    name: 'Demo Architecture Studio',
    slug: 'demo',
    ownerPhone: '+919999999999',
  }).returning();
  console.log('Created firm:', firm.id);

  // Create owner user (PIN: 1234)
  const pinHash = await bcrypt.hash('1234', 10);
  const [owner] = await db.insert(users).values({
    firmId: firm.id,
    name: 'Demo Architect',
    phone: '+919999999999',
    role: 'owner',
    pinHash,
  }).returning();
  console.log('Created user:', owner.id, '(PIN: 1234)');

  // Create site supervisor
  const supHash = await bcrypt.hash('5678', 10);
  const [supervisor] = await db.insert(users).values({
    firmId: firm.id,
    name: 'Rajesh Kumar',
    phone: '+918888888888',
    role: 'site_supervisor',
    pinHash: supHash,
  }).returning();
  console.log('Created supervisor:', supervisor.id, '(PIN: 5678)');

  // Create client
  const [client] = await db.insert(clients).values({
    firmId: firm.id,
    name: 'Sharma Residence',
    phone: '+919876543210',
    email: 'sharma@example.com',
    city: 'Mumbai',
    state: 'Maharashtra',
  }).returning();
  console.log('Created client:', client.id);

  // Create project
  const [project] = await db.insert(projects).values({
    firmId: firm.id,
    clientId: client.id,
    name: 'Sharma Villa',
    addressLine1: '42 Green Avenue',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    currentPhase: 'drawing',
    status: 'active',
  }).returning();
  console.log('Created project:', project.id);

  // Seed all site stages (all nodes from hierarchy)
  const stageRows = STAGE_FLAT.map(stage => ({
    firmId: firm.id,
    projectId: project.id,
    stageKey: stage.key,
    displayName: stage.displayName,
    parentKey: stage.parentKey,
    sortOrder: stage.sortOrder,
    isCompleted: false,
    weight: String(stage.weight),
  }));

  await db.insert(siteStages).values(stageRows);
  console.log('Seeded', stageRows.length, 'site stages');

  console.log('\nSeed complete!');
  console.log('  Firm ID:', firm.id);
  console.log('  Owner phone: +919999999999, PIN: 1234');
  console.log('  Supervisor phone: +918888888888, PIN: 5678');
  console.log('  Project: Sharma Villa');
}

seed().catch(console.error).finally(() => process.exit(0));
