import os
import time
import json
import subprocess
import sys
import argparse
import shutil
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from datetime import datetime

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
BLENDER_PATH = os.environ.get("BLENDER_PATH", "blender")
FFMPEG_PATH = os.environ.get("FFMPEG_PATH", "ffmpeg")

def check_dependencies():
    # 1. Check BLENDER_PATH env var
    blender_path = os.environ.get("BLENDER_PATH")
    print(f"DEBUG: Initial BLENDER_PATH env: {blender_path}")
    
    # 2. Check for specified Windows path or common locations if not set
    if not blender_path:
        possible_paths = [
            r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 3.6\blender.exe"
        ]
        
        for path in possible_paths:
            print(f"DEBUG: Checking path: {path}")
            if os.path.exists(path):
                blender_path = path
                print(f"DEBUG: Found Blender at: {blender_path}")
                break
                
    # 3. Check PATH
    if not blender_path:
        blender_path = shutil.which("blender")
        print(f"DEBUG: Found Blender in PATH: {blender_path}")
        
    # Verify the found path
    if blender_path and os.path.exists(blender_path):
        os.environ["BLENDER_PATH"] = blender_path
        print(f"DEBUG: Using Blender at: {blender_path}")
    else:
        blender_path = None
        print("DEBUG: Blender not found")
        
    # Same logic for ffmpeg
    ffmpeg_path = os.environ.get("FFMPEG_PATH", shutil.which("ffmpeg"))
    if ffmpeg_path:
        os.environ["FFMPEG_PATH"] = ffmpeg_path
        print(f"DEBUG: Using FFmpeg at: {ffmpeg_path}")
        
    return blender_path is not None, ffmpeg_path is not None

def supabase_request(path, method="GET", data=None):
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        return None
        
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    body = json.dumps(data).encode('utf-8') if data else None
    req = Request(url, data=body, headers=headers, method=method)
    
    try:
        with urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode('utf-8')}")
    except URLError as e:
        print(f"URL Error: {e.reason}")
    except Exception as e:
        print(f"Error: {str(e)}")
    return None

def get_queued_job():
    # Fetch one queued job and mark it as processing atomically using PostgREST
    # In a real app, you might use a stored procedure or a more complex query
    # For now, we'll fetch then update (simple poll)
    jobs = supabase_request("render_jobs?status=eq.queued&limit=1")
    if jobs and len(jobs) > 0:
        job = jobs[0]
        # Update status to processing
        update_data = {
            "status": "processing",
            "started_at": datetime.utcnow().isoformat(),
            "progress": 0,
            "current_operation": "Initializing render"
        }
        updated = supabase_request(f"render_jobs?id=eq.{job['id']}", method="PATCH", data=update_data)
        if updated:
            return job
    return None

def update_job_progress(job_id, progress, operation):
    supabase_request(f"render_jobs?id=eq.{job_id}", method="PATCH", data={
        "progress": progress,
        "current_operation": operation
    })

def complete_job(job_id, output_path):
    supabase_request(f"render_jobs?id=eq.{job_id}", method="PATCH", data={
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
        "output_file": output_path,
        "progress": 100,
        "current_operation": "Render complete"
    })

def fail_job(job_id, error_msg):
    supabase_request(f"render_jobs?id=eq.{job_id}", method="PATCH", data={
        "status": "failed",
        "error": error_msg,
        "completed_at": datetime.utcnow().isoformat(),
        "current_operation": "Render failed"
    })

def upload_to_supabase(file_path, bucket_name, object_path):
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        return None
        
    # Supabase Storage REST API
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket_name}/{object_path}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "video/mp4"
    }
    
    with open(file_path, 'rb') as f:
        data = f.read()
    
    req = Request(url, data=data, headers=headers, method="POST")
    
    try:
        with urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Upload error: {str(e)}")
        return None

def run_render(job_id=None, test_mode=False):
    blender_ok, ffmpeg_ok = check_dependencies()
    if not blender_ok:
        if job_id: fail_job(job_id, "Blender not available")
        return False
        
    # Use platform-independent path
    output_dir = os.path.join(os.getcwd(), "renders")
    os.makedirs(output_dir, exist_ok=True)
    job_tag = job_id if job_id else "test_" + str(int(time.time()))
    
    # Do not add extension here, let Blender handle it based on format
    output_path = os.path.join(output_dir, job_tag)
    
    script_path = os.path.join(os.path.dirname(__file__), "blender", "minecraft_scene_builder.py")
    
    env = os.environ.copy()
    env["RENDER_OUTPUT_PATH"] = output_path
    
    print(f"Starting Blender render for {job_tag}...")
    if job_id: update_job_progress(job_id, 10, "Building scene in Blender")
    
    try:
        # Run Blender in background
        process = subprocess.run([
            os.environ.get("BLENDER_PATH", "blender"),
            "--background",
            "--python", script_path
        ], env=env)
        
        print(f"Blender exited with code: {process.returncode}")
        
        if process.returncode != 0:
            if job_id: fail_job(job_id, f"Blender failed with exit code {process.returncode}")
            return False
            
        # The actual file might have .mp4 appended by Blender
        final_output_path = output_path + ".mp4"
        if not os.path.exists(final_output_path) or os.path.getsize(final_output_path) == 0:
            # Check if it didn't add the extension
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                final_output_path = output_path
            else:
                print(f"Render produced no file or empty file: {final_output_path}")
                print(f"Output directory contents: {os.listdir(output_dir)}")
                if job_id: fail_job(job_id, "Render produced no file")
                return False
            
        file_size = os.path.getsize(final_output_path)
        print(f"Render successful: {final_output_path} ({file_size} bytes)")
        
        # Upload
        if not test_mode:
            print("Uploading to Supabase...")
            bucket_name = "renders"
            object_path = f"{job_tag}.mp4"
            upload_result = upload_to_supabase(final_output_path, bucket_name, object_path)
            
            if not upload_result:
                if job_id: fail_job(job_id, "Upload failed")
                return False
            
            # Assume public access
            final_url = f"{SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{object_path}"
            
            if job_id:
                complete_job(job_id, final_url)
        
        return True
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        if job_id: fail_job(job_id, f"Unexpected error: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="BlockMovie Render Worker")
    parser.add_argument("--test", action="store_true", help="Run a local test render")
    parser.add_argument("--once", action="store_true", help="Process one job and exit")
    args = parser.parse_args()
    
    if args.test:
        print("Running test render...")
        success = run_render(test_mode=True)
        if success:
            print("TEST PASSED")
            # Verify file with ffmpeg
            try:
                # Find the actual output path
                output_dir = os.path.join(os.getcwd(), "renders")
                # Look for mp4 files
                files = [f for f in os.listdir(output_dir) if f.endswith(".mp4")]
                if files:
                    file_to_check = os.path.join(output_dir, files[0])
                    subprocess.run([os.environ.get("FFMPEG_PATH", "ffmpeg"), "-i", file_to_check], stderr=subprocess.PIPE)
                    print(f"MP4 verified with FFmpeg: {file_to_check}")
                else:
                    print("No MP4 file found to verify")
            except Exception as e:
                print(f"Verification failed: {e}")
        else:
            print("TEST FAILED")
        return

    print("Render Worker starting...")
    while True:
        job = get_queued_job()
        if job:
            print(f"Found job: {job['id']} ({job['job_type']})")
            run_render(job['id'])
        else:
            if args.once:
                break
            time.sleep(10)

if __name__ == "__main__":
    main()
