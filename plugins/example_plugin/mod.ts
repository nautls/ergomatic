import { Plugin, PluginDescriptor } from "../../src/plugins/mod.ts";

export const EXAMPLE_PLUGIN_ID = "example_plugin";

interface ExamplePluginConfig {
  tokenId: string;
  exitAtPage: number;
}

export class ExamplePlugin extends Plugin<ExamplePluginConfig> {
  get descriptor(): PluginDescriptor {
    return {
      name: "Example Plugin",
      description:
        "This is an example plugin showcasing how to create & implement ergomatic plugins.",
      version: "0.1.0",
    };
  }

  async onStart(): Promise<void> {
    this.logger.debug(
      `Example plugin started with config: ${JSON.stringify(this.config)}`,
    );

    const { tokenId, exitAtPage } = this.config;
    let currentPage = 0;

    for await (
      const page of this.blockchainProvider.getBoxesByTokenId(tokenId)
    ) {
      currentPage++;

      this.logger.info(
        `Got page ${currentPage} of boxes for token ${tokenId}`,
      );

      this.logger.info(`there was ${page.length} boxes in this page`);

      if (currentPage === exitAtPage) {
        this.logger.info(
          `Exiting at page ${currentPage} of boxes for token ${tokenId}`,
        );

        break;
      }
    }
  }
}
