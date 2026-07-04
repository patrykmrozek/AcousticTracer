#include "../src/at_ray.h"
#include "acoustic/at.h"
#include "acoustic/at_math.h"
#include "at_utils.h"

#define SURFACE_EPSILON  0.001f

//Möller–Trumbore intersection alg
bool AT_ray_triangle_intersect(AT_Ray *ray,
                               const AT_Triangle *triangle,
                               AT_Ray *out_ray,
                               AT_Vec3 *out_normal)
{
    AT_Vec3 edge1 = AT_vec3_sub(triangle->v2, triangle->v1);
    AT_Vec3 edge2 = AT_vec3_sub(triangle->v3, triangle->v1);

    AT_Vec3 pvec = AT_vec3_cross(ray->direction, edge2);
    float det  = AT_vec3_dot(edge1, pvec);
    if (fabs(det) < EPSILON) return false;

    float inv_det = 1.0f / det;
    AT_Vec3 tvec = AT_vec3_sub(ray->origin, triangle->v1);

    float u = AT_vec3_dot(tvec, pvec) * inv_det;
    if (u < 0 || u > 1) return false;

    AT_Vec3 qvec = AT_vec3_cross(tvec, edge1);
    float v = AT_vec3_dot(ray->direction, qvec) * inv_det;
    if (v < 0 || u + v > 1) return false;

    float t = AT_vec3_dot(edge2, qvec) * inv_det;
    const float MIN_T = 1e-6f;
    if (t < MIN_T) return false;

    AT_Vec3 hit_point = {
            .x = ray->origin.x + ray->direction.x * t,
            .y = ray->origin.y + ray->direction.y * t,
            .z = ray->origin.z + ray->direction.z * t,
        };

    if (AT_vec3_distance_sq(ray->origin, hit_point) < AT_vec3_distance_sq(ray->origin, out_ray->origin)) {
        out_ray->origin = hit_point;
        AT_Vec3 normal = AT_vec3_normalize(AT_vec3_cross(edge1, edge2));
        if (AT_vec3_dot(normal, ray->direction) > 0) normal = AT_vec3_scale(normal, -1);
        *out_normal = normal;
        out_ray->direction = AT_ray_reflect(ray->direction, normal);
        return true;
    }

    return false;
}

AT_Result AT_ray_child_create_and_init(AT_Ray *ray,
                                       AT_Ray out_ray,
                                       uint32_t num_rays,
                                       AT_Vec3 out_normal,
                                       AT_MaterialType mat_type,
                                       AT_Ray *out_child)
{
    AT_Ray *child = (AT_Ray *)malloc(sizeof(AT_Ray));
    if (!child) return AT_ERR_ALLOC_ERROR;
    *child = out_ray;
    child->child = NULL;
    child->ray_id = ray->ray_id + num_rays;
    ray->hit_point = out_ray.origin;

    AT_Vec3 offset = AT_vec3_scale(out_normal, SURFACE_EPSILON);
    child->origin = AT_vec3_add(ray->hit_point, offset);

    child->total_distance = ray->total_distance + AT_vec3_distance(ray->origin, ray->hit_point);
    child->energy = ray->energy * (1.0f - AT_MATERIAL_TABLE[mat_type].absorption);

    float rand = AT_get_random_float();
    if (rand < AT_MATERIAL_TABLE[mat_type].scattering) {
        child->direction = AT_sample_cosine_hemisphere(out_normal);
    }

    *out_child = *child;

    return AT_OK;
}

void AT_ray_destroy_children(AT_Ray *ray) {
    if (!ray) return;
    if (ray->child) {
        AT_ray_destroy_children(ray->child);
    }
    free(ray);
}
