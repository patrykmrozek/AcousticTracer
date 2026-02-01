#include "at_voxel.h"
#include "../src/at_internal.h"
#include "acoustic/at_math.h"
#include "at_utils.h"
#include <stdint.h>

#define VOXEL_MAX_STEPS 100
#define SPEED_OF_SOUND 343.0f

void AT_voxel_ray_step(AT_Simulation *simulation, AT_Ray *ray, AT_Vec3 ray_end)
{
    //the ray segment spans from p0 (origin) to p1 (end)
    // out current position within the segement is "t"

    //origin in voxel space
    AT_Vec3 p0 = AT_vec3_scale(
        AT_vec3_sub(ray->origin, simulation->origin),
        1.0f / simulation->voxel_size
    );

    //ray end in voxel space
    AT_Vec3 p1 = AT_vec3_scale(
        AT_vec3_sub(ray_end, simulation->origin),
        1.0f / simulation->voxel_size
    );

    //step direction (+1 or -1 per axis)
    const AT_Vec3 step = AT_get_sign_vec3(ray->direction);

    //distance along "t" to move one voxel
    const AT_Vec3 delta = AT_vec3_delta(ray->direction);

    const int grid_x = simulation->grid_dimensions.x;
    const int grid_y = simulation->grid_dimensions.y;
    const int grid_z = simulation->grid_dimensions.z;

    AT_Vec3i pos = (AT_Vec3i){
        AT_clamp((int)floorf(p0.x), 0, grid_x - 1),
        AT_clamp((int)floorf(p0.y), 0, grid_y - 1),
        AT_clamp((int)floorf(p0.z), 0, grid_z - 1)
    };

    //distance along ray until we cross next voxel boundary each axis
    // aka the max "t" :|
    // since the ray can only leave through one face of the voxel first,
    // the smallest of the three t_max values tells us which face
    //this gif kinda helps visualize it: https://m4xc.dev/anim/articles/amanatides-and-woo/walk-anim.mp4
    AT_Vec3 t_max;

    t_max.x = (step.x > 0) ?
        ((pos.x + 1.0f) - p0.x) * delta.x :
        (p0.x - pos.x) * delta.x;

    t_max.y = (step.y > 0) ?
        ((pos.y + 1.0f) - p0.y) * delta.y :
        (p0.y - pos.y) * delta.y;

    t_max.z = (step.z > 0) ?
        ((pos.z + 1.0f) - p0.z) * delta.z :
        (p0.z - pos.z) * delta.z;

    float ray_length = AT_vec3_length(
        AT_vec3_sub(ray->origin, ray_end)
    );

    //curr pos within ray segment
    float t = 0.0f;
    const float t_end = AT_vec3_length(AT_vec3_sub(p1, p0));

    //while we havent yet reached the end of the ray segment
    while (t < t_end) {
        if (pos.x < 0 || pos.x >= grid_x ||
            pos.y < 0 || pos.y >= grid_y ||
            pos.z < 0 || pos.z >= grid_z) break;

        //index into the voxel_grid array
        const uint32_t voxel_idx =
            (uint32_t)pos.z * grid_y * grid_x +
            (uint32_t)pos.y * grid_x +
            (uint32_t)pos.x;

        AT_Voxel *voxel = &simulation->voxel_grid[voxel_idx];
        AT_voxel_init(voxel);

        float t_current = fminf(t_max.x, fminf(t_max.y, t_max.z));
        if (t_current > ray_length) break; //if we reached the end of the ray

        //this is where we add energy to voxels bin
        //implement something like this
        //to get the bin_index we woudl have to know the length of the ray at this point,
        // this would include the length of its parents (if it has any)
        // we cant just use the current t, as then new rays would be adding energy to old bins
        //
        float total_world_dist = ray->total_distance + (t * simulation->voxel_size);
        float curr_time = total_world_dist / SPEED_OF_SOUND;
        size_t bin_index = (size_t)(curr_time / simulation->bin_width);

        //grow bin count
        while (voxel->count <= bin_index) {
            AT_voxel_bin_append(voxel, 0.0f);
        }

        if (AT_voxel_add_energy(voxel, ray->energy, bin_index) != AT_OK) {
            break;
        }

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
