# PDFLab

Professional PDF conversion and manipulation platform.

**Live Production**: [https://pdflab.pro](https://pdflab.pro)

## Quick Links

- **[Project Documentation](docs/README.md)** - Complete project documentation
- **[Getting Started](docs/README.md#quick-start)** - Local development setup
- **[API Documentation](docs/api/API_DOCUMENTATION.md)** - API reference
- **[Deployment Guides](docs/deployment/)** - Production deployment
- **[Testing](docs/testing/)** - Test strategy and execution

## Project Status

- **Version**: 1.3.0 (Phase 1 Complete)
- **Status**: ✅ Live in Production
- **Last Updated**: 2025-11-22

## For Developers

All documentation has been moved to the [`docs/`](docs/) directory for better organization.

- **Project Overview**: [docs/README.md](docs/README.md)
- **Claude Code Guide**: [docs/CLAUDE.md](docs/CLAUDE.md)
- **Roadmap**: [docs/project-status/ROADMAP_ANALYSIS_V1.3.0.md](docs/project-status/ROADMAP_ANALYSIS_V1.3.0.md)
- **Latest Milestones**: [docs/project-status/](docs/project-status/)

## Quick Start

```bash
# Install dependencies
npm install

# Start Docker containers
docker start pdflab-mysql pdflab-redis

# Start backend (port 3006)
cd backend && npm run dev

# Start frontend (port 3000)
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Express.js, MySQL 8, Redis 7
- **External**: CloudConvert API, PayFast Payments

---

📚 **Full Documentation**: [docs/README.md](docs/README.md)
