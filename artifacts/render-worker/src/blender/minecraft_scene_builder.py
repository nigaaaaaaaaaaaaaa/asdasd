import bpy
import math
import random
import os

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for collection in bpy.data.collections:
        bpy.data.collections.remove(collection)

def create_block(location, name="Block", material_name="Grass"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    mat = bpy.data.materials.new(name=material_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if material_name == "Grass":
        bsdf.inputs['Base Color'].default_value = (0.1, 0.5, 0.1, 1.0)
    elif material_name == "Dirt":
        bsdf.inputs['Base Color'].default_value = (0.3, 0.2, 0.1, 1.0)
    elif material_name == "Stone":
        bsdf.inputs['Base Color'].default_value = (0.5, 0.5, 0.5, 1.0)
    elif material_name == "Skin":
        bsdf.inputs['Base Color'].default_value = (0.8, 0.6, 0.5, 1.0)
    elif material_name == "Blue":
        bsdf.inputs['Base Color'].default_value = (0.1, 0.1, 0.8, 1.0)
    obj.data.materials.append(mat)
    return obj

def create_terrain(width=8, depth=8):
    for x in range(-width//2, width//2):
        for z in range(-depth//2, depth//2):
            height = random.randint(0, 1)
            create_block((x, z, height), material_name="Grass")
            if height > 0:
                create_block((x, z, height-1), material_name="Dirt")

def create_character(location):
    create_block((location[0], location[1], location[2] + 1.7), name="Head", material_name="Skin")
    create_block((location[0], location[1], location[2] + 1.0), name="Body", material_name="Blue")
    bpy.context.object.scale = (0.5, 0.25, 0.6)

def setup_lighting():
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
    sun = bpy.context.active_object
    sun.data.energy = 5
    bpy.ops.object.light_add(type='AREA', location=(0, 0, 5))
    area = bpy.context.active_object
    area.data.energy = 100
    area.scale = (10, 10, 1)

def setup_camera():
    bpy.ops.object.camera_add(location=(8, -8, 5))
    cam = bpy.context.active_object
    cam.rotation_euler = (math.radians(60), 0, math.radians(45))
    bpy.context.scene.camera = cam
    return cam

def animate_camera(cam, frames=48):
    cam.keyframe_insert(data_path="location", frame=1)
    cam.location = (6, -6, 4)
    cam.keyframe_insert(data_path="location", frame=frames)

def main():
    bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, "EeveeNextRenderSettings") else 'BLENDER_EEVEE'
    bpy.context.scene.render.resolution_x = 320
    bpy.context.scene.render.resolution_y = 180
    bpy.context.scene.render.fps = 24
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 48
    bpy.context.scene.render.image_settings.file_format = 'FFMPEG'
    bpy.context.scene.render.ffmpeg.format = 'MPEG4'
    bpy.context.scene.render.ffmpeg.codec = 'H264'
    output_path = os.environ.get("RENDER_OUTPUT_PATH", "/tmp/render_output.mp4")
    bpy.context.scene.render.filepath = output_path
    clear_scene()
    create_terrain()
    create_character((0, 0, 0.5))
    setup_lighting()
    cam = setup_camera()
    animate_camera(cam)
    bpy.ops.render.render(animation=True)

if __name__ == "__main__":
    main()
