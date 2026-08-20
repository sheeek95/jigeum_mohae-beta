export function formatCountdown(expiresAt: number): string {
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return '만료됨';
  const hours = Math.floor(msLeft / (60 * 60 * 1000));
  const minutes = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}시간 ${minutes}분 후 삭제`;
  return `${minutes}분 후 삭제`;
}

export function formatRelative(timestamp: number): string {
  const msAgo = Date.now() - timestamp;
  const minutes = Math.floor(msAgo / (60 * 1000));
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
