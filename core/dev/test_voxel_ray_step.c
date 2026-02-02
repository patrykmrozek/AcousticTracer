#include "acoustic/at.h"
#include "../src/at_internal.h"
#include "acoustic/at_model.h"
#include "../src/at_voxel.h"

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

#include "../external/raylib.h"

Color cols[3] = {BLACK, LIGHTGRAY, DARKGRAY};

static float AT_voxel_get_energy(AT_Voxel *voxel)
{
    float sum = 0.0f;
    for (size_t i = 0; i < voxel->count; i++) {
        sum += voxel->items[i];
    }
    return sum;
}

int main()
{
    printf("Voxel Ray Step\n");

    const char *filepath = "../assets/glb/Sponza.glb";

    AT_Model *model = NULL;
    if (AT_model_create(&model, filepath) != AT_OK) {
        fprintf(stderr, "Error creating model\n");
        return 1;
    }

    for (uint32_t i = 0; i < model->vertex_count; i++) {
        model->vertices[i] = AT_vec3_scale(model->vertices[i], 0.01);
    }

    int num_sources = 1;
    AT_Source s1 = {
        .direction = {0.2, -0.1, 0},
        .intensity = 50.0,
        .position = {1, 2, 0}
    };

    AT_SceneConfig conf = {
        .environment = model,
        .material = AT_MATERIAL_CONCRETE,
        .num_sources = num_sources,
        .sources = &s1
    };

    AT_Scene *scene = NULL;
    if (AT_scene_create(&scene, &conf) != AT_OK) {
        fprintf(stderr, "Error creating scene\n");
        return 1;
    }

    AT_Settings settings = {
        .fps = 60,
        .num_rays = 5,
        .voxel_size = 1
    };

    AT_Simulation *sim = NULL;
    if (AT_simulation_create(&sim, scene, &settings) != AT_OK) {
        fprintf(stderr, "Error creating simulation\n");
        return 1;
    }

    if (AT_simulation_run(sim) != AT_OK) {
        fprintf(stderr, "Error running simulation\n");
        return 1;
    }

    InitWindow(1280, 720, "Voxel Ray Test");

        SetTargetFPS(60);

        Camera3D camera = {
            .position = { 1.5f, 2.5f, 1.0f },
            .target = { 0.0f, 0.0f, 0.0f },
            .up = { 0.0f, 1.0f, 0.0f },
            .fovy = 60.0f,
            .projection = CAMERA_PERSPECTIVE
        };

        uint32_t t_count = sim->scene->environment->index_count / 3;
        AT_Triangle *ts = NULL;
        if (AT_model_get_triangles(&ts, sim->scene->environment) != AT_OK) {
            fprintf(stderr, "Failed to get triangles from model\n");
            return 1;
        }

        while (!WindowShouldClose())
        {
            UpdateCamera(&camera, CAMERA_FREE);
            BeginDrawing();
            {
                ClearBackground(RAYWHITE);
                BeginMode3D(camera);
                {
                    AT_Ray *rays = sim->rays;
                    for (uint32_t s = 0; s < sim->scene->num_sources; s++) {
                        for (uint32_t i = 0; i < sim->num_rays; i++) {
                            uint32_t ray_idx = s * sim->num_rays + i;
                            AT_Ray ray = rays[ray_idx];
                            DrawSphere((Vector3){
                            ray.origin.x,
                            ray.origin.y,
                            ray.origin.z},
                            0.1, RED);

                            AT_Ray *curr = &ray;
                            while (curr->child) {
                                curr = curr->child;
                                DrawSphere(
                                    (Vector3){
                                        curr->origin.x,
                                        curr->origin.y,
                                        curr->origin.z,
                                    }, 0.01, BLUE
                                );
                                if (curr->child) {
                                    DrawLine3D(
                                        (Vector3){curr->origin.x, curr->origin.y, curr->origin.z},
                                        (Vector3){curr->child->origin.x, curr->child->origin.y, curr->child->origin.z},
                                        PURPLE);
                                }
                            }

                            if (ray.child) {
                                DrawLine3D(
                                    (Vector3){ray.origin.x, ray.origin.y, ray.origin.z},
                                    (Vector3){ray.child->origin.x, ray.child->origin.y, ray.child->origin.z},
                                    RED);
                            } else {
                                DrawRay((Ray){
                                (Vector3){ray.origin.x, ray.origin.y, ray.origin.z},
                                (Vector3){ray.direction.x, ray.direction.y, ray.direction.z}
                                }, RED);
                            }
                        }
                    }

                    for (uint32_t i = 0; i < t_count; i++) {
                        DrawTriangle3D(
                            (Vector3){ts[i].v1.x, ts[i].v1.y, ts[i].v1.z},
                            (Vector3){ts[i].v2.x, ts[i].v2.y, ts[i].v2.z},
                            (Vector3){ts[i].v3.x, ts[i].v3.y, ts[i].v3.z},
                            (Color)cols[i%3]);
                    }

                    //draw voxels
                    for (uint32_t z = 0; z < sim->grid_dimensions.z; z++) {
                        for (uint32_t y = 0; y < sim->grid_dimensions.y; y++) {
                            for (uint32_t x = 0; x < sim->grid_dimensions.x; x++) {

                                uint32_t i =
                                    z * sim->grid_dimensions.y * sim->grid_dimensions.x +
                                    y * sim->grid_dimensions.x +
                                    x;

                                AT_Voxel *v = &sim->voxel_grid[i];

                                float energy = AT_voxel_get_energy(v);

                                Vector3 pos = {
                                    sim->origin.x + (x + 0.5f) * sim->voxel_size,
                                    sim->origin.y + (y + 0.5f) * sim->voxel_size,
                                    sim->origin.z + (z + 0.5f) * sim->voxel_size,
                                };

                                if (energy <= 0.0f) continue;

                                printf("Voxel (%i): Energy: %f\n", i, energy);

                                DrawCubeV(
                                    pos,
                                    (Vector3){sim->voxel_size, sim->voxel_size, sim->voxel_size},
                                    Fade(RED, 0.3)
                                );

                            }
                        }
                    }

                    DrawGrid(sim->voxel_size, 1.0f);
                }
                EndMode3D();
                DrawFPS(10, 10);
            }
            EndDrawing();
        }

    CloseWindow();
    free(ts);
    AT_simulation_destroy(sim);
    AT_scene_destroy(scene);
    AT_model_destroy(model);

    return 0;
}
