#include "../src/at_internal.h"
#include "acoustic/at_math.h"
#include "at_utils.h"

void AT_voxel_ray_step(AT_Simulation *simulation, AT_Vec3 ray_origin, AT_Vec3 ray_end, AT_Vec3 ray_direction, float ray_energy)
{

    // (worldpos - gridorigin) / voxelsize
    AT_Vec3 entry_point = AT_vec3_scale(
        AT_vec3_sub(ray_origin, simulation->origin),
        1.0f / simulation->voxel_size
    );

    const AT_Vec3 step = AT_get_sign_vec3(ray_direction);
    const AT_Vec3 delta = AT_vec3_delta(ray_direction);
}
