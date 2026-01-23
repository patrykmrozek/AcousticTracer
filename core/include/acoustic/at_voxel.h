#ifndef AT_VOXEL_H
#define AT_VOXEL_H

#include "acoustic/at.h"

typedef struct AT_Voxel AT_Voxel;

AT_Result AT_voxel_init(AT_Voxel *voxel);
void AT_voxel_cleanup(AT_Voxel *voxel);

#endif //AT_VOXEL_H
