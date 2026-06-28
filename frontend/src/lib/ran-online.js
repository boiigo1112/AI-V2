// Official Ran Online School IDs — DO NOT CHANGE
export const School = {
  SacredGate: 0,
  MysticPeak: 1,
  Phoenix: 2,
};

export const schoolNames = {
  0: 'Sacred Gate',
  1: 'Mystic Peak',
  2: 'Phoenix',
};

// Official Ran Online Character Class bit flags — DO NOT CHANGE
export const ClassFlag = {
  FighterMale: 1,
  KnightMale: 2,
  ArcherFemale: 4,
  SpiritFemale: 8,
  ExtremeMale: 16,
  ExtremeFemale: 32,
  FighterFemale: 64,
  KnightFemale: 128,
  ArcherMale: 256,
  SpiritMale: 512,
  ScientistMale: 1024,
  ScientistFemale: 2048,
  AssassinMale: 4096,
  AssassinFemale: 8192,
  MagicianMale: 16384,
  MagicianFemale: 32768,
};

export const classNames = {
  1: 'Fighter Male',
  2: 'Knight Male',
  4: 'Archer Female',
  8: 'Spirit Female',
  16: 'Extreme Male',
  32: 'Extreme Female',
  64: 'Fighter Female',
  128: 'Knight Female',
  256: 'Archer Male',
  512: 'Spirit Male',
  1024: 'Scientist Male',
  2048: 'Scientist Female',
  4096: 'Assassin Male',
  8192: 'Assassin Female',
  16384: 'Magician Male',
  32768: 'Magician Female',
};

export const classColors = {
  1: '#818cf8',
  2: '#3b82f6',
  4: '#34d399',
  8: '#c9a84c',
  16: '#f87171',
  32: '#a78bfa',
  64: '#f472b6',
  128: '#fb923c',
  256: '#e11d48',
  512: '#6b7280',
  1024: '#06b6d4',
  2048: '#f59e0b',
  4096: '#8b5cf6',
  8192: '#ec4899',
  16384: '#14b8a6',
  32768: '#f97316',
};

export function getClassName(flag) {
  return classNames[flag] || `Class ${flag}`;
}

export function getClassColor(flag) {
  return classColors[flag] || '#818cf8';
}

export function getSchoolName(id) {
  return schoolNames[id] || `School ${id}`;
}
