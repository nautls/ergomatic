# Ergomatic

[![ci](https://github.com/nautls/ergomatic/actions/workflows/ci.yaml/badge.svg)](https://github.com/nautls/ergomatic/actions/workflows/ci.yaml)
[![Discord badge][]][Discord link]

`ergomatic` is a generic off-chain execution framework for bots. Bot
functionality is provided via plugins which are audited by the nautilus team.

## Install

Shell (Mac, Linux):

```sh
curl -fsSL https://raw.githubusercontent.com/nautls/ergomatic/main/scripts/install/install.sh | sh
```

PowerShell (Windows):

```powershell
irm https://raw.githubusercontent.com/nautls/ergomatic/main/scripts/install/install.ps1 | iex
```

### Running

Ergomatic can be ran using the `run` CLI command. The `-c` flag can optionally
be passed to specify the config file path, if not provided it will default to
`$CWD/ergomatic.yaml`.

```sh
ergomatic run
```

Logs can be viewed in your terminal and are also persisted to disk depending on
OS:

- Linux: `$XDG_DATA_HOME/ergomatic`
- macOS: `$HOME/Library/Application Support/ergomatic`
- Windows: `$LOCALAPPDATA/ergomatic`

Log files will automatically be rotated with a maximum of 300mb of logs kept.

## Contributing

We appreciate your help!

To contribute, please read our [contributing instructions](CONTRIBUTING.md).

[Discord badge]: https://img.shields.io/discord/668903786361651200?logo=discord&style=social
[Discord link]: https://discord.gg/ergo-platform-668903786361651200
