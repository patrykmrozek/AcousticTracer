# AcousticTracer:  Complete Overview (Start to Finish)

## What the project does
**Simulate how sound travels through a 3D room, then replay that simulation as a 3D visualization in the browser.**

Think of it like ray tracing for graphics, but instead of light rays creating an image, you trace **sound rays** to estimate **where sound energy goes**, **when it arrives**, and **how intense it is**.

---

## High-level pipeline (6 stages)

```
1. User uploads room model (web)
   ↓
2. Backend runs offline acoustic simulation (C core)
   ↓
3. Results stored as binary replay files
   ↓
4. Frontend downloads replay data
   ↓
5. Frontend decodes + plays back frames
   ↓
6. User sees 3D voxel grid animating over time
```

---

## Stage 1: Upload (React frontend)

**User actions**
- Uploads a `.glb` or `.gltf` file (3D room model)
- Sets parameters: 
  - voxel size (resolution)
  - simulation duration + fps
  - number of rays to shoot
  - max reflections (bounces)
  - source position

**What happens**
- React sends `POST /api/simulations` with file + params
- Backend returns a `simId` immediately (job is queued, not blocking)
- React polls `GET /api/simulations/:id/status` until done

**Tech involved**
- React:  UI framework
- HTTP multipart upload

---

## Stage 2: Offline simulation (C core)

This is the "heavy compute" stage.  It happens on the server, not in the browser.

### Step 2.1: Load geometry from GLB
**What happens**
- Parse the `.glb` file using **cgltf** (single-header C library)
- Extract triangle positions + indices
- Apply node transforms (glTF supports hierarchies/transforms; you must "flatten" triangles into world space)
- Result: array of triangles (each = 3 vertices in 3D)

**Why**
- Surfaces are represented as triangles
- Ray tracing needs geometry to intersect

### Step 2.2: Build acceleration structure (BVH)
**What it is**
- A tree of bounding boxes around groups of triangles

**Why**
- Naive approach:  test each ray against every triangle → too slow
- BVH lets you skip large groups of triangles that can't possibly intersect the ray
- Turns O(n) per ray into O(log n)

**How it works (conceptual)**
- Compute bounding box around scene
- Split triangles into two groups (e.g., left/right by midpoint)
- Recursively split until groups are small
- Store as a tree

### Step 2.3: Define the voxel grid
**What it is**
- Divide the room volume into a 3D grid of small cubes ("voxels")

**How**
- Compute scene **AABB** (axis-aligned bounding box): min/max corners
- Choose voxel size (e.g., 0.25m)
- Compute dims: `nx = ceil((max. x - min.x) / voxelSize)`, etc. 
- Each voxel has integer coords `(x, y, z)` and a linear index:  `x + nx*(y + ny*z)`

**Why**
- You'll deposit sound energy into these voxels over time

### Step 2.4: Define time bins
**What it is**
- Discretize time into frames (e.g., 60 fps for 3 seconds = 180 frames/bins)

**Why**
- You need to track "when" sound arrives at each voxel

### Step 2.5: Emit rays from source
**What happens**
- Place a point source at chosen position
- Emit thousands of rays in all directions (or hemisphere if source is directional)
- Use **Fibonacci sphere** algorithm to distribute rays evenly

**Each ray starts with**
- `origin` = source position
- `direction` = unit vector
- `energy` = 1.0
- `totalDistance` = 0.0
- `bounceCount` = 0

### Step 2.6: Trace rays (the core loop)
For each ray, repeat until energy is negligible or max bounces reached:

#### A. Intersect with scene
- Use **Möller–Trumbore algorithm** to find nearest triangle hit
- BVH traversal makes this fast
- Result: hit point, surface normal, distance to hit

#### B. Deposit energy along segment (ray origin → hit point)
This is the key step that fills the voxel grid. 

**Goal:** as the ray travels from start to hit, it passes through many voxels. You want to "deposit" energy into those voxels. 

**How:  DDA (Digital Differential Analyzer)**
- A grid traversal algorithm
- Given ray direction + voxel grid, it computes exactly which voxel the ray enters next
- Steps through voxels one-by-one along the ray path
- For each voxel crossed: 
  - compute arrival time:  `totalDistance / speedOfSound` (343 m/s)
  - compute bin index: `floor(arrivalTime / binWidth)`
  - add energy to that voxel's bin
  - optionally apply distance attenuation:  `energy *= 1/(1 + k*d²)`

**Result**
- For each voxel, for each time bin, you accumulate energy

#### C. Reflect ray
- Compute reflection direction:  `newDir = reflect(oldDir, surfaceNormal)`
- Apply energy loss due to absorption: `energy *= reflectivity` (e.g., 0.8 for concrete)
- Update ray origin to hit point
- Increment `bounceCount`
- Increment `totalDistance`

#### D. Termination
Stop if:
- `energy < threshold` (too weak to matter)
- `bounceCount >= maxBounces`

### Step 2.7: Sparsify and quantize
After all rays traced, you have bins full of energy values.

**Problem**
- Most voxels in most time bins are empty (or near-zero)
- Storing dense `voxels × bins` array = huge

**Solution:  sparse frames**
- For each time bin, keep only voxels where `energy > threshold`
- Store as list of `(voxelIndex, intensity)` pairs
- Quantize intensity to `uint16` (2 bytes instead of 4 or 8)

### Step 2.8: Write output files
- `meta.json`: grid dims, origin, voxel size, fps, num chunks, etc.
- `chunk_000.bin`, `chunk_001.bin`, ...: binary files containing sparse frames

**Chunk format (binary)**
- Header: magic, version, chunkIndex, frameCount, startFrame
- Directory: offsets to each frame payload
- Per-frame payload: `activeCount` + list of `(voxelIndex, value)` pairs

---

## Stage 3: Storage
Backend stores: 
- `storage/sims/:id/meta. json`
- `storage/sims/:id/chunk_*. bin`

---

## Stage 4: Download (React frontend)
Once status is "done": 

1. `GET /api/simulations/:id/meta` → parse JSON
2. During playback, fetch chunks as needed: 
   - `GET /api/simulations/:id/chunks/0`
   - `GET /api/simulations/:id/chunks/1`
   - etc.

**Buffering strategy**
- Download 1–2 chunks ahead of current playback position
- Avoids stuttering

---

## Stage 5: Decode + playback loop (React)

### Decode chunk
- Chunk is an `ArrayBuffer`
- Use `DataView` to read header, directory, frame payloads
- For each frame, extract:
  - `activeCount`
  - `indices` (Uint32Array)
  - `values` (Uint16Array)

### Playback controller
- Maintains current frame index
- At 60 fps, advances frame every ~16.67ms
- Fetches + decodes chunks as needed
- Emits current frame data to renderer

---

## Stage 6: Visualization (React Three Fiber)

### Core rendering technique:  InstancedMesh
**What it is**
- A single mesh geometry/material that renders many instances
- Each instance has its own transform (position, scale, rotation) and optionally color

**Why**
- Creating thousands of individual meshes = terrible performance
- InstancedMesh = one draw call for all voxels = fast

### Per-frame update loop
1.  Receive `frameData`: `{ indices, values, activeCount }`
2. For each active voxel:
   - Convert `voxelIndex → (x, y, z)` using grid dims
   - Convert `(x,y,z) → world position` using origin + voxel size
   - Set instance matrix (position + scale)
   - Map intensity to color (e.g., blue→red gradient, or HSL)
   - Set instance color
3. Update `instancedMesh.count = activeCount`
4. Mark `instanceMatrix. needsUpdate = true`

**Result**
- Only active voxels are drawn
- Each frame, voxels appear/disappear/change color as sound propagates

### Color mapping
- Read `value` (uint16)
- Convert to intensity:  `intensity = value * meta.values.scale`
- Map to color, e.g.: 
  - `hue = 0.6 - 0.6 * min(1, intensity/maxIntensity)`
  - or use a gradient texture

---

## Summary of techniques used (alphabetical)

| Technique | What it does | Where used |
|-----------|-------------|-----------|
| **AABB (Axis-Aligned Bounding Box)** | Simplest bounding volume; min/max corners | Scene bounds, BVH nodes |
| **BVH (Bounding Volume Hierarchy)** | Tree of boxes to accelerate ray intersection | C core, ray tracing |
| **cgltf** | Single-header C library to parse glTF/GLB | C core, model loading |
| **DDA (Digital Differential Analyzer)** | Grid traversal to step through voxels exactly | C core, energy deposition |
| **Fibonacci sphere** | Evenly distribute points on sphere | C core, ray emission |
| **InstancedMesh (Three.js)** | Render many copies of geometry efficiently | React frontend, voxel rendering |
| **Möller–Trumbore** | Fast ray-triangle intersection test | C core, ray tracing |
| **Quantization** | Store floats as uint16 with scale factor | C core, reduce file size |
| **Sparse encoding** | Store only non-zero values | C core + frontend, memory/bandwidth |
| **Voxel grid** | 3D array of cubes representing space | C core + frontend, energy storage |

---

## Data flow diagram (visual summary)

```
[User:  upload room. glb + params]
         ↓
[Backend: queue job, return simId]
         ↓
[C Core: load GLB → build BVH → create voxel grid]
         ↓
[C Core: shoot rays → trace bounces → deposit energy via DDA]
         ↓
[C Core: sparsify → quantize → write meta. json + chunk_*. bin]
         ↓
[React:  poll status → fetch meta → buffer chunks]
         ↓
[React: decode binary → extract (indices, values) per frame]
         ↓
[R3F: update InstancedMesh matrices + colors]
         ↓
[User: sees 3D voxel grid animation]
```

---

## Key design decisions that make it work

1. **Offline compute** (not real-time)
   - Allows heavy processing without blocking UI
2. **Sparse frames** (not dense grid)
   - Keeps file sizes and memory reasonable
3. **Binary chunks** (not JSON)
   - Fast to parse, small to transfer
4. **InstancedMesh** (not individual meshes)
   - Renders tens of thousands of voxels smoothly
5. **HTTP polling + chunk fetching** (not WebSocket for MVP)
   - Simpler, easier to debug, works with static hosting

---