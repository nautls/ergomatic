export function isTesting() {
  return Deno.env.get("ERGOMATIC_TEST") === "true";
}
