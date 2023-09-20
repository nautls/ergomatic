#!/bin/sh

set -e

# Test that we can install the latest version at the default location.
rm -f ~/.ergomatic/bin/ergomatic
unset ERGOMATIC_INSTALL
sh ./scripts/install/install.sh
~/.ergomatic/bin/ergomatic --version

# Test that we can install a specific version at a custom location.
rm -rf ~/ergomatic-0.0.1
export ERGOMATIC_INSTALL="$HOME/ergomatic-0.0.1"
./scripts/install/install.sh v0.0.1
~/ergomatic-0.0.1/bin/ergomatic --version | grep 0.0.1

# Test that we can install at a relative custom location.
export ERGOMATIC_INSTALL="."
./scripts/install/install.sh v0.0.1
bin/ergomatic --version | grep 0.0.1
