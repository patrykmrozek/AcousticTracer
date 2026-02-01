#include "../src/at_internal.h"
#include "acoustic/at_math.h"
#include "at_utils.h"
#include <stdint.h>

#define VOXEL_MAX_STEPS 100

void AT_voxel_ray_step(AT_Simulation *simulation, AT_Vec3 ray_origin, AT_Vec3 ray_end, AT_Vec3 ray_direction, float ray_energy)
{

    // convert ray origin to voxel space
    // (world_pos - grid_origin) / voxel_size
    AT_Vec3 entry_point = AT_vec3_scale(
        AT_vec3_sub(ray_origin, simulation->origin),
        1.0f / simulation->voxel_size
    );

    //step direction (+1 or -1 per axis)
    const AT_Vec3 step = AT_get_sign_vec3(ray_direction);

    //distance along "t" to move one voxel
    const AT_Vec3 delta = AT_vec3_delta(ray_direction);

    const int grid_x = simulation->grid_dimensions.x;
    const int grid_y = simulation->grid_dimensions.y;
    const int grid_z = simulation->grid_dimensions.z;

    AT_Vec3i pos = (AT_Vec3i){
        AT_clamp((int)floorf(entry_point.x), 0, grid_x - 1),
        AT_clamp((int)floorf(entry_point.y), 0, grid_y - 1),
        AT_clamp((int)floorf(entry_point.z), 0, grid_z - 1)
    };

    //distance along ray until we cross next voxel boundary each axis
    // aka the max "t" :|
    // since the ray can only leave through one face of the voxel first,
    // the smallest of the three t_max values tells us which face
    //this gif kinda helps visualize it: https://m4xc.dev/anim/articles/amanatides-and-woo/walk-anim.mp4
    AT_Vec3 t_max;

    t_max.x = (step.x > 0) ?
        ((pos.x + 1.0f) - entry_point.x) * delta.x :
        (entry_point.x - pos.x) * delta.x;

    t_max.y = (step.y > 0) ?
        ((pos.y + 1.0f) - entry_point.y) * delta.y :
        (entry_point.y - pos.y) * delta.y;

    t_max.z = (step.z > 0) ?
        ((pos.z + 1.0f) - entry_point.z) * delta.z :
        (entry_point.z - pos.z) * delta.z;

    float ray_length = AT_vec3_length(
        AT_vec3_sub(ray_origin, ray_end)
    );

    for (uint32_t steps = 0; steps < VOXEL_MAX_STEPS; steps++) {
        if (pos.x < 0 || pos.x >= grid_x ||
            pos.y < 0 || pos.y >= grid_y ||
            pos.z < 0 || pos.z >= grid_z) break;

        //index into the voxel_grid array
        const uint32_t voxel_idx =
            (uint32_t)pos.z * grid_y * grid_x +
            (uint32_t)pos.y * grid_x +
            (uint32_t)pos.x;

        AT_Voxel *voxel = &simulation->voxel_grid[voxel_idx];

        float t_current = fminf(t_max.x, fminf(t_max.y, t_max.z));
        if (t_current > ray_length) break; //if we reached the end of the ray

        //this is where we add energy to voxels bin
        //implement something like this
        //AT_voxel_add_energy(voxel, ray_energy bin_index);

        //now we look for smallest t_max and advance through it
        //t_max.x smallest
        if (t_max.x < t_max.y && t_max.x < t_max.z) {
            pos.x += step.x;
            t_max.x += delta.x;
        } else if (t_max.y < t_max.z) { //smallest y
            pos.y += step.y;
            t_max.y += delta.y;
        } else { //smallest z
            pos.z += step.z;
            t_max.z += delta.z;
        }
    }
}
