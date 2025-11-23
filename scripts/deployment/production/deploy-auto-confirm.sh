#!/bin/bash
# Automatic deployment wrapper
# Confirms all prompts automatically

export DEBIAN_FRONTEND=noninteractive

# Override read command to auto-confirm
read() {
    echo "yes"
    REPLY="yes"
}

# Source the main deployment script
source ./deploy-ocr-fix-to-production.sh
