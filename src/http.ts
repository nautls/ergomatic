import version from "./version.ts";

export const ERGOMATIC_USER_AGENT =
  `ergomatic/${version} (${Deno.build.os}; ${Deno.build.arch})`;
