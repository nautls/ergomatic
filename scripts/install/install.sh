#!/bin/sh

set -e

if ! command -v unzip >/dev/null; then
	echo "Error: unzip is required to install Ergomatic" 1>&2
	exit 1
fi

if [ "$OS" = "Windows_NT" ]; then
	target="x86_64-pc-windows-msvc"
else
	case $(uname -sm) in
	"Darwin x86_64") target="x86_64-apple-darwin" ;;
	"Darwin arm64") target="aarch64-apple-darwin" ;;
	"Linux aarch64")
		echo "Error: Official Ergomatic builds for Linux aarch64 are not available due to upstream limitations. (see: https://github.com/denoland/deno/issues/1846 )" 1>&2
		exit 1
		;;
	*) target="x86_64-unknown-linux-gnu" ;;
	esac
fi

if [ $# -eq 0 ]; then
	ergomatic_uri="https://github.com/nautls/ergomatic/releases/latest/download/ergomatic-${target}.zip"
else
	ergomatic_uri="https://github.com/nautls/ergomatic/releases/download/${1}/ergomatic-${target}.zip"
fi

ergomatic_install="${ERGOMATIC_INSTALL:-$HOME/.ergomatic}"
bin_dir="$ergomatic_install/bin"
exe="$bin_dir/ergomatic"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe.zip" "$ergomatic_uri"
unzip -d "$bin_dir" -o "$exe.zip"
chmod +x "$exe"
rm "$exe.zip"

echo "Ergomatic was installed successfully to $exe"
if command -v ergomatic >/dev/null; then
	echo "Run 'ergomatic --help' to get started"
else
	case $SHELL in
	/bin/zsh) shell_profile=".zshrc" ;;
	*) shell_profile=".bashrc" ;;
	esac
	echo "Manually add the directory to your \$HOME/$shell_profile (or similar)"
	echo "  export ERGOMATIC_INSTALL=\"$ergomatic_install\""
	echo "  export PATH=\"\$ERGOMATIC_INSTALL/bin:\$PATH\""
	echo "Run '$exe --help' to get started"
fi
echo
echo "Stuck? Join the Ergo Platform discord https://discord.gg/ergo-platform-668903786361651200"
