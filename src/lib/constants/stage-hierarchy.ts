export interface StageNode {
  key: string;
  displayName: string;
  parentKey: string | null;
  sortOrder: number;
  weight: number; // 0 for parent/group nodes, actual weight for leaf nodes
  isLeaf: boolean;
  children: StageNode[];
}

// Flat list — used for DB seeding
export const STAGE_FLAT: Omit<StageNode, 'children'>[] = [
  // DRAWING
  { key: 'drawing', displayName: 'Drawings', parentKey: null, sortOrder: 1, weight: 0, isLeaf: false },
  { key: 'drawing.brief', displayName: 'Brief', parentKey: 'drawing', sortOrder: 1, weight: 2.0, isLeaf: true },
  { key: 'drawing.planning', displayName: 'Planning', parentKey: 'drawing', sortOrder: 2, weight: 2.0, isLeaf: true },
  { key: 'drawing.structural', displayName: 'Structural Drawing', parentKey: 'drawing', sortOrder: 3, weight: 2.0, isLeaf: true },
  { key: 'drawing.mep', displayName: 'MEP Drawings', parentKey: 'drawing', sortOrder: 4, weight: 0, isLeaf: false },
  { key: 'drawing.mep.electrical', displayName: 'Electrical', parentKey: 'drawing.mep', sortOrder: 1, weight: 1.0, isLeaf: true },
  { key: 'drawing.mep.plumbing', displayName: 'Plumbing', parentKey: 'drawing.mep', sortOrder: 2, weight: 1.0, isLeaf: true },
  { key: 'drawing.mep.hvac', displayName: 'HVAC (Cassette/Split/Ducting)', parentKey: 'drawing.mep', sortOrder: 3, weight: 1.0, isLeaf: true },
  { key: 'drawing.exterior', displayName: 'Exterior Design', parentKey: 'drawing', sortOrder: 5, weight: 1.0, isLeaf: true },
  { key: 'drawing.interior', displayName: 'Interior Drawing', parentKey: 'drawing', sortOrder: 6, weight: 1.0, isLeaf: true },

  // BUILDING
  { key: 'building', displayName: 'Building', parentKey: null, sortOrder: 2, weight: 0, isLeaf: false },
  { key: 'building.foundation', displayName: 'Foundation', parentKey: 'building', sortOrder: 1, weight: 0, isLeaf: false },
  { key: 'building.foundation.excavation', displayName: 'Excavation', parentKey: 'building.foundation', sortOrder: 1, weight: 5.0, isLeaf: true },
  { key: 'building.foundation.footing', displayName: 'Footing', parentKey: 'building.foundation', sortOrder: 2, weight: 5.0, isLeaf: true },
  { key: 'building.foundation.plinth_beam', displayName: 'Plinth Beam', parentKey: 'building.foundation', sortOrder: 3, weight: 5.0, isLeaf: true },
  { key: 'building.brick_work', displayName: 'Brick Work', parentKey: 'building', sortOrder: 2, weight: 8.0, isLeaf: true },
  { key: 'building.slab', displayName: 'Slab Casting', parentKey: 'building', sortOrder: 3, weight: 0, isLeaf: false },
  { key: 'building.slab.slab_beam', displayName: 'Slab Beam', parentKey: 'building.slab', sortOrder: 1, weight: 6.0, isLeaf: true },
  { key: 'building.slab.slab_casting', displayName: 'Slab Casting', parentKey: 'building.slab', sortOrder: 2, weight: 7.0, isLeaf: true },

  // FINISHING
  { key: 'finishing', displayName: 'Finishing', parentKey: null, sortOrder: 3, weight: 0, isLeaf: false },
  { key: 'finishing.wall_finish', displayName: 'Wall Finish', parentKey: 'finishing', sortOrder: 1, weight: 0, isLeaf: false },
  { key: 'finishing.wall_finish.plaster', displayName: 'Plaster Work', parentKey: 'finishing.wall_finish', sortOrder: 1, weight: 4.0, isLeaf: true },
  { key: 'finishing.wall_finish.primer1', displayName: 'Primer (1st coat)', parentKey: 'finishing.wall_finish', sortOrder: 2, weight: 1.5, isLeaf: true },
  { key: 'finishing.wall_finish.putty', displayName: 'Putty', parentKey: 'finishing.wall_finish', sortOrder: 3, weight: 2.0, isLeaf: true },
  { key: 'finishing.wall_finish.primer2', displayName: 'Primer (2nd coat)', parentKey: 'finishing.wall_finish', sortOrder: 4, weight: 1.5, isLeaf: true },
  { key: 'finishing.wall_finish.paint', displayName: 'Paint', parentKey: 'finishing.wall_finish', sortOrder: 5, weight: 3.0, isLeaf: true },
  { key: 'finishing.floor', displayName: 'Floor', parentKey: 'finishing', sortOrder: 2, weight: 0, isLeaf: false },
  { key: 'finishing.floor.pcc_laying', displayName: 'PCC Laying', parentKey: 'finishing.floor', sortOrder: 1, weight: 2.5, isLeaf: true },
  { key: 'finishing.floor.tile_stone', displayName: 'Tile / Stone', parentKey: 'finishing.floor', sortOrder: 2, weight: 3.5, isLeaf: true },
  { key: 'finishing.fall_ceiling', displayName: 'Fall Ceiling', parentKey: 'finishing', sortOrder: 3, weight: 3.0, isLeaf: true },

  // ELECTRICAL
  { key: 'electrical', displayName: 'Electrical', parentKey: null, sortOrder: 4, weight: 0, isLeaf: false },
  { key: 'electrical.board_installation', displayName: 'Board Installation', parentKey: 'electrical', sortOrder: 1, weight: 2.5, isLeaf: true },
  { key: 'electrical.wiring', displayName: 'Wiring', parentKey: 'electrical', sortOrder: 2, weight: 3.0, isLeaf: true },
  { key: 'electrical.switch_board_lights', displayName: 'Switch Board & Lights Installation', parentKey: 'electrical', sortOrder: 3, weight: 2.5, isLeaf: true },

  // PLUMBING
  { key: 'plumbing', displayName: 'Plumbing', parentKey: null, sortOrder: 5, weight: 0, isLeaf: false },
  { key: 'plumbing.pipes', displayName: 'Pipes', parentKey: 'plumbing', sortOrder: 1, weight: 3.0, isLeaf: true },
  { key: 'plumbing.tap_sanitary', displayName: 'Tap & Sanitary Installation', parentKey: 'plumbing', sortOrder: 2, weight: 3.0, isLeaf: true },

  // DOOR/WINDOW
  { key: 'door_window', displayName: 'Door / Window', parentKey: null, sortOrder: 6, weight: 0, isLeaf: false },
  { key: 'door_window.chaukhat', displayName: 'Chaukhat', parentKey: 'door_window', sortOrder: 1, weight: 2.5, isLeaf: true },
  { key: 'door_window.door_frame', displayName: 'Door Frame', parentKey: 'door_window', sortOrder: 2, weight: 2.5, isLeaf: true },
  { key: 'door_window.window_frame', displayName: 'Window Frame', parentKey: 'door_window', sortOrder: 3, weight: 2.5, isLeaf: true },

  // RAILING
  { key: 'railing', displayName: 'Railing', parentKey: null, sortOrder: 7, weight: 0, isLeaf: false },
  { key: 'railing.railing_work', displayName: 'Railing Work', parentKey: 'railing', sortOrder: 1, weight: 3.0, isLeaf: true },
];

export const LEAF_STAGES = STAGE_FLAT.filter(s => s.isLeaf);
export const TOTAL_WEIGHT = LEAF_STAGES.reduce((sum, s) => sum + s.weight, 0); // ~92.5

export function calculateProgress(completedKeys: Set<string>): {
  overall: number;
  byCategory: Record<string, { completed: number; total: number; percent: number }>;
} {
  const byCategory: Record<string, { completed: number; total: number }> = {};

  for (const stage of LEAF_STAGES) {
    const category = stage.key.split('.')[0];
    if (!byCategory[category]) byCategory[category] = { completed: 0, total: 0 };
    byCategory[category].total += stage.weight;
    if (completedKeys.has(stage.key)) byCategory[category].completed += stage.weight;
  }

  const completedWeight = LEAF_STAGES
    .filter(s => completedKeys.has(s.key))
    .reduce((sum, s) => sum + s.weight, 0);

  const overall = TOTAL_WEIGHT > 0 ? (completedWeight / TOTAL_WEIGHT) * 100 : 0;

  return {
    overall: Math.round(overall * 10) / 10,
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [
        k,
        { ...v, percent: v.total > 0 ? Math.round((v.completed / v.total) * 1000) / 10 : 0 },
      ])
    ),
  };
}

export const DRAWING_TYPES = [
  { value: 'brief', label: 'Brief' },
  { value: 'planning', label: 'Planning' },
  { value: 'structural', label: 'Structural Drawing' },
  { value: 'mep_electrical', label: 'MEP — Electrical' },
  { value: 'mep_plumbing', label: 'MEP — Plumbing' },
  { value: 'mep_hvac', label: 'MEP — HVAC' },
  { value: 'exterior_design', label: 'Exterior Design' },
  { value: 'interior_drawing', label: 'Interior Drawing' },
] as const;
