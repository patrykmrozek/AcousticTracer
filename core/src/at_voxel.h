#ifndef AT_VOXEL_H
#define AT_VOXEL_H

#include "acoustic/at.h"
#include "at_internal.h"
#include "../src/at_utils.h"
#include <stddef.h>

//these are pretty much voxel specific wrappers of the dynamic array
static inline AT_Result AT_voxel_init(AT_Voxel *voxel)
{
    if (!voxel) return AT_ERR_INVALID_ARGUMENT;
    AT_da_init(voxel);
    return AT_OK;
}

static inline AT_Result AT_voxel_bin_append(AT_Voxel *voxel, float bin)
{
    if (!voxel) return AT_ERR_INVALID_ARGUMENT;
    AT_da_append(voxel, bin);
    return AT_OK;
}

static inline AT_Result AT_voxel_add_energy(AT_Voxel *voxel, float energy, size_t bin_index)
{
    if (bin_index >= voxel->capacity) return AT_ERR_INVALID_ARGUMENT;
    voxel->items[bin_index] += energy;
    return AT_OK;
}

void AT_voxel_ray_step(AT_Simulation *simulation, AT_Ray *ray, AT_Vec3 ray_end);

static inline void AT_voxel_cleanup(AT_Voxel *voxel)
{
    AT_da_free(voxel);
}

#endif //AT_VOXEL_H
