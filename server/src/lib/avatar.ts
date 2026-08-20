const PALETTE: Array<[string, string]> = [
  ['#FF9AA6', '#8A6BC7'],
  ['#9AD4FF', '#6B7FC7'],
  ['#FFD9A0', '#C77B9A'],
  ['#A0FFD9', '#6BC7A0'],
];

export function randomAvatarGradient(): [string, string] {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}
