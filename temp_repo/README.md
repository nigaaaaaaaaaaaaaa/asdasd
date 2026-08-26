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
   ```

2. **Clone the repository** (or copy `artifacts/render-worker` directory to the VM):

3. **Build the image**:
   ```bash
   cd artifacts/render-worker
   docker build -t render-worker .
   ```

4. **Prepare Environment Variables**:
   Create a `.env` file or export these variables:
   ```bash
   export SUPABASE_URL=...
   export SUPABASE_SERVICE_ROLE_KEY=...
   ```

5. **Run the worker**:
   ```bash
   docker run -d \
     -e SUPABASE_URL=$SUPABASE_URL \
     -e SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
     --name render-worker \
     render-worker
   ```

## Verification

### Verify Blender
```bash
docker run --rm render-worker blender --version
```

### Run Test Render
```bash
docker run --rm \
  -e SUPABASE_URL=test \
  -e SUPABASE_SERVICE_ROLE_KEY=test \
  render-worker --test
```
This will produce a test MP4 in the container.

## Logging
To view logs:
```bash
docker logs -f render-worker
```
