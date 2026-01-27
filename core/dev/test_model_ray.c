#include "../src/at_internal.h"
#include "../src/at_ray.h"
#include "acoustic/at.h"
#include "acoustic/at_math.h"
#include "acoustic/at_model.h"
#include "../external/raylib.h"
#include "raylib.h"

#include <stdint.h>
#include <stdio.h>

AT_Triangle *AT_model_get_triangles(const AT_Model *model)
{
    uint32_t triangle_count = model->index_count / 3;
    AT_Triangle *ts = (AT_Triangle*)malloc(sizeof(AT_Triangle) * triangle_count);
    for (uint32_t i = 0; i < triangle_count; i++) {
        ts[i] = (AT_Triangle){
            .v1 = model->vertices[model->indices[i*3 + 0]],
            .v2 = model->vertices[model->indices[i*3 + 1]],
            .v3 = model->vertices[model->indices[i*3 + 2]]
        };
    }
    return ts;
}

int main()
{
    const char *filepath = "../assets/glb/box_room.gltf";

    AT_Model *model = NULL;
    if (AT_model_create(&model, filepath) != AT_OK) {
        fprintf(stderr, "Failed to create model\n");
        return 1;
    }

    AT_Ray ray = AT_ray_init(
        (AT_Vec3){0.5f, 0.5, 10.0f},
        (AT_Vec3){0.0f, 0.0f, -1.0f},
        0
    );

    uint32_t t_count = model->index_count / 3;
    AT_Triangle *ts = AT_model_get_triangles(model);

    AT_RayHit hit = {0};

    for (uint32_t i = 0; i < t_count; i++) {
        if (AT_ray_triangle_intersect(&ray, &ts[i], &hit)) {
            AT_ray_add_hit(&ray, hit);
            printf("HIT!\n");
        }
    }

    printf("Initializing Window\n");
    InitWindow(1280, 720, "Model Ray Test");

    SetTargetFPS(60);

    Camera3D camera = {
        .position = { 10.0f, 10.0f, 10.0f },
        .target = { 0.0f, 0.0f, 0.0f },
        .up = { 0.0f, 1.0f, 0.0f },
        .fovy = 60.0f,
        .projection = CAMERA_PERSPECTIVE
    };



    while (!WindowShouldClose())
    {
        UpdateCamera(&camera, CAMERA_FREE);
        BeginDrawing();
        {
            ClearBackground(RAYWHITE);
            BeginMode3D(camera);
            {
                DrawRay((Ray){
                (Vector3){ray.origin.x, ray.origin.y, ray.origin.z},
                (Vector3){ray.direction.x, ray.direction.y, ray.direction.z}
                }, RED);
                //DrawModel(rl_model, (Vector3){ 0.0f, 0.0f, 0.0f }, 1, GREEN);
                for (uint32_t i = 0; i < t_count; i++) {
                    DrawTriangle3D(
                        (Vector3){ts[i].v1.x, ts[i].v1.y, ts[i].v1.z},
                        (Vector3){ts[i].v2.x, ts[i].v2.y, ts[i].v2.z},
                        (Vector3){ts[i].v3.x, ts[i].v3.y, ts[i].v3.z},
                        GREEN);
                }
                DrawGrid(10, 1.0f);

                for (uint32_t i = 0; i < ray.hits.count; i++) {
                    DrawSphere(
                        (Vector3){
                            ray.hits.items[i].position.x,
                            ray.hits.items[i].position.y,
                            ray.hits.items[i].position.z,},
                        0.1, BLUE);
                }

            }
            EndMode3D();
            DrawFPS(10, 10);
        }
        EndDrawing();
    }

    CloseWindow();
    free(ts);
    AT_model_destroy(model);
    return 0;
}
