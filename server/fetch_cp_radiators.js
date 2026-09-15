import fs from 'fs';

// 1. Define the 199 EXACT sizes requested by the user
export const REQUESTED_SIZES = [];

// K1 (70 sizes)
const k1_specs = [
  { height: 300, lengths: [400, 500, 1000, 1500, 2000, 2500, 3000] },
  { height: 450, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 600, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 700, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 900, lengths: [400, 500, 600, 700, 800, 900, 1000] }
];

for (const group of k1_specs) {
  for (const len of group.lengths) {
    REQUESTED_SIZES.push({
      type: 'K1',
      height_mm: group.height,
      length_mm: len,
      id: `rad_k1_${group.height}x${len}`
    });
  }
}

// P+ (60 sizes)
const p_plus_specs = [
  { height: 300, lengths: [500, 1000, 1500, 2000, 2500, 3000] },
  { height: 450, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 600, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 700, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] }
  // 900mm: NO P+ sizes per prompt instructions
];

for (const group of p_plus_specs) {
  for (const len of group.lengths) {
    REQUESTED_SIZES.push({
      type: 'P+',
      height_mm: group.height,
      length_mm: len,
      id: `rad_p_plus_${group.height}x${len}`
    });
  }
}

// K2 (69 sizes)
const k2_specs = [
  { height: 300, lengths: [500, 1000, 1500, 2000, 2500, 3000] },
  { height: 450, lengths: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 600, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 700, lengths: [300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000] },
  { height: 900, lengths: [400, 500, 600, 700, 800, 900, 1000] }
];

for (const group of k2_specs) {
  for (const len of group.lengths) {
    REQUESTED_SIZES.push({
      type: 'K2',
      height_mm: group.height,
      length_mm: len,
      id: `rad_k2_${group.height}x${len}`
    });
  }
}

console.log('Total requested radiator specifications:', REQUESTED_SIZES.length);
console.log('K1 count:', REQUESTED_SIZES.filter(s => s.type === 'K1').length);
console.log('P+ count:', REQUESTED_SIZES.filter(s => s.type === 'P+').length);
console.log('K2 count:', REQUESTED_SIZES.filter(s => s.type === 'K2').length);
