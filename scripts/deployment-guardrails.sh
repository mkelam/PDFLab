#!/bin/bash
################################################################################
# PDFLab Deployment Guardrails
################################################################################
# Enforce deployment policies and prevent dangerous operations
#
# Usage: ./deployment-guardrails.sh [enforce|disable|status]
################################################################################

ACTION="${1:-status}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[GUARDRAILS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

################################################################################
# Guardrail Functions
################################################################################

enforce_guardrails() {
    log "Enforcing deployment guardrails..."
    echo ""

    # Create docker-compose wrapper
    info "Creating docker-compose wrapper..."
    cat > /usr/local/bin/docker-compose-wrapper << 'EOF'
#!/bin/bash

# Intercept docker-compose commands
if [[ "$@" =~ "up -d" ]] || [[ "$@" =~ "up" ]] && [[ ! "$@" =~ "--no-deps" ]]; then
    echo ""
    echo "⚠️  DEPLOYMENT GUARDRAIL TRIGGERED"
    echo ""
    echo "Direct docker-compose up commands are disabled."
    echo "Use the approved deployment script instead:"
    echo ""
    echo "  /usr/local/bin/pdflab-scripts/safe-deploy.sh [production|staging]"
    echo ""
    echo "This ensures all validation checks run before deployment."
    echo ""
    echo "To bypass (use with caution):"
    echo "  /usr/bin/docker-compose $@"
    echo ""
    exit 1
fi

# Allow safe commands (ps, logs, config, down)
/usr/bin/docker-compose "$@"
EOF

    chmod +x /usr/local/bin/docker-compose-wrapper

    # Create symbolic link (backup original first)
    if [ ! -f "/usr/bin/docker-compose.original" ]; then
        info "Backing up original docker-compose..."
        cp /usr/bin/docker-compose /usr/bin/docker-compose.original
    fi

    # Replace docker-compose with wrapper
    warn "Replacing docker-compose with guardrail wrapper..."
    rm -f /usr/bin/docker-compose
    ln -s /usr/local/bin/docker-compose-wrapper /usr/bin/docker-compose

    echo ""
    log "✓ Guardrails enforced successfully"
    echo ""
    info "docker-compose up commands will now trigger validation"
    info "Use /usr/local/bin/pdflab-scripts/safe-deploy.sh for deployments"
    echo ""
}

disable_guardrails() {
    log "Disabling deployment guardrails..."
    echo ""

    # Restore original docker-compose
    if [ -f "/usr/bin/docker-compose.original" ]; then
        info "Restoring original docker-compose..."
        rm -f /usr/bin/docker-compose
        cp /usr/bin/docker-compose.original /usr/bin/docker-compose
        log "✓ Guardrails disabled successfully"
    else
        error "Original docker-compose not found - cannot restore"
        exit 1
    fi

    echo ""
}

check_status() {
    echo "=========================================="
    echo "PDFLab Deployment Guardrails Status"
    echo "=========================================="
    echo ""

    if [ -L "/usr/bin/docker-compose" ]; then
        TARGET=$(readlink /usr/bin/docker-compose)
        if [[ "$TARGET" == *"wrapper"* ]]; then
            echo -e "${GREEN}✓ Guardrails ENABLED${NC}"
            echo ""
            echo "docker-compose → $TARGET"
            echo ""
            echo "Direct docker-compose up is blocked"
            echo "Use: /usr/local/bin/pdflab-scripts/safe-deploy.sh"
        else
            echo -e "${YELLOW}⚠ Guardrails DISABLED${NC}"
            echo ""
            echo "docker-compose → $TARGET"
        fi
    else
        echo -e "${YELLOW}⚠ Guardrails DISABLED${NC}"
        echo ""
        echo "docker-compose is not symlinked (standard installation)"
    fi

    echo ""
}

################################################################################
# Main Execution
################################################################################

case "$ACTION" in
    enforce)
        enforce_guardrails
        ;;
    disable)
        disable_guardrails
        ;;
    status)
        check_status
        ;;
    *)
        error "Invalid action: $ACTION"
        echo ""
        echo "Usage: $0 [enforce|disable|status]"
        echo ""
        echo "Actions:"
        echo "  enforce  - Enable deployment guardrails"
        echo "  disable  - Disable deployment guardrails"
        echo "  status   - Check guardrail status"
        echo ""
        exit 1
        ;;
esac
