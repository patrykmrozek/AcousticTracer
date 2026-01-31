#include "../src/at_internal.h"
#include "acoustic/at_math.h"
#include "at_utils.h"
#include <math.h>

void AT_voxel_ray_step(AT_Simulation *simulation, AT_Vec3 ray_origin, AT_Vec3 ray_end, AT_Vec3 ray_direction, float ray_energy)
{

    // (worldpos - gridorigin) / voxelsize
    AT_Vec3 entry_point = AT_vec3_scale(
        AT_vec3_sub(ray_origin, simulation->origin),
        1.0f / simulation->voxel_size
    );

    const AT_Vec3 step = AT_get_sign_vec3(ray_direction);
    const AT_Vec3 delta = AT_vec3_delta(ray_direction);

    //should probably make an Vec3i type..
    AT_Vec3 pos = (AT_Vec3){
        AT_clamp((int)floorf(entry_point.x), 0, (int)simulation->dimensions.x - 1),
        AT_clamp((int)floorf(entry_point.y), 0, (int)simulation->dimensions.y - 1),
        AT_clamp((int)floorf(entry_point.z), 0, (int)simulation->dimensions.z - 1)
    };

    //helper var
    AT_Vec3 _pos_step = (AT_Vec3) {
        AT_max(step.x, 0.0f),
        AT_max(step.y, 0.0f),
        AT_max(step.z, 0.0f),
    };

    //what even is this bruh.. my bad
    // "time" along the ray when each axis crosses its next cell boundary
    // if that makes no sense check this: https://m4xc.dev/img/articles/amanatides-and-woo/tmax.png
    AT_Vec3 max_step = AT_vec3_mul(
        (AT_vec3_sub(pos, AT_vec3_add(entry_point, _pos_step))),
        AT_vec3_inv(ray_direction)
    );

    //loop through for some amount of MAX_STEPS and make bounds checks

}
