export function uuid() {
  return crypto.randomUUID();
}

export function shortId() {
  return uuid().split('-')[0];
}
