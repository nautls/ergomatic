export function isTesting() {
  return Deno.env.get("ERGOMATIC_TEST") === "true";
}

export function mbToBytes(mb: number) {
  return mb * 1000000;
}
