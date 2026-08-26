# BlockMovie Render Worker

This is a persistent worker that polls the Supabase `render_jobs` table and renders Minecraft-style scenes using Blender and FFmpeg.

## VM Requirements

- **OS**: Linux (Debian 12 Bookworm or Ubuntu 22.04 LTS recommended)
- **Minimum Specs**: 2 vCPU, 4GB RAM (Blender and FFmpeg are memory intensive)
- **Docker**: Installed on the host VM.

## Setup

1. **Install Docker** (if not already installed):
   ```bash
   # Follow official Docker installation guide for your Linux distribution
