import os
import time
import json
import subprocess
import sys
import argparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from datetime import datetime

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
BLENDER_PATH = os.environ.get("BLENDER_PATH", "blender")
FFMPEG_PATH = os.environ.get("FFMPEG_PATH", "ffmpeg")

def check_dependencies():
    blender_ok = False
    ffmpeg_ok = False
    try:
        subprocess.run([BLENDER_PATH, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        blender_ok = True
    except FileNotFoundError:
        for path in ["/usr/bin/blender", "/usr/local/bin/blender"]:
            try:
                subprocess.run([path, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                os.environ["BLENDER_PATH"] = path
                blender_ok = True
                break
            except FileNotFoundError: continue
    if not blender_ok: print("BLENDER NOT AVAILABLE IN THIS ENVIRONMENT")
    try:
        subprocess.run([FFMPEG_PATH, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        ffmpeg_ok = True
    except FileNotFoundError:
        for path in ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]:
            try:
                subprocess.run([path, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                os.environ["FFMPEG_PATH"] = path
                ffmpeg_ok = True
                break
            except FileNotFoundError: continue
    if not ffmpeg_ok: print("FFMPEG NOT AVAILABLE IN THIS ENVIRONMENT")
    return blender_ok, ffmpeg_ok

def supabase_request(path, method="GET", data=None):
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY: return None
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {"apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}", "Content-Type": "application/json", "Prefer": "return=representation"}
    body = json.dumps(data).encode('utf-8') if data else None
    req = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(req) as response: return json.loads(response.read().decode('utf-8'))
    except: return None

def run_render(job_id=None, test_mode=False):
    blender_ok, ffmpeg_ok = check_dependencies()
    if not blender_ok: return False
    output_dir = "/tmp/renders"
    os.makedirs(output_dir, exist_ok=True)
    job_tag = job_id if job_id else "test_" + str(int(time.time()))
    output_path = os.path.join(output_dir, f"{job_tag}.mp4")
    script_path = os.path.join(os.path.dirname(__file__), "blender", "minecraft_scene_builder.py")
    env = os.environ.copy()
    env["RENDER_OUTPUT_PATH"] = output_path
    print(f"Starting Blender render for {job_tag}...")
    try:
        process = subprocess.run([os.environ.get("BLENDER_PATH", "blender"), "--background", "--python", script_path], env=env, capture_output=True, text=True)
        if process.returncode != 0: return False
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0: return False
        print(f"Render successful: {output_path}")
        return True
    except: return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args()
    if args.test:
        print("Running test render...")
        run_render(test_mode=True)
    else:
        print("Render Worker ready.")

if __name__ == "__main__":
    main()
