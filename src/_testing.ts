import { mergeUserConfigAndValidate } from "./config.ts";

export function testConfig() {
  return mergeUserConfigAndValidate({
    plugins: [{ enabled: true, id: "test-plugin" }],
  });
}
