import { ID, Query, type Models } from "appwrite";
import { tablesDB, storage } from "@/lib/appwrite";
import type { SimulationDocument } from "@/api/contracts";

const CONFIG = {
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  tableId: import.meta.env.VITE_APPWRITE_TABLE_ID_SIMULATIONS,
  bucketId: import.meta.env.VITE_APPWRITE_BUCKET_ID_SIMULATIONS,
} as const;

export interface Simulation {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed" | "staging";
  userId: string;
  inputFileId: string;
  resultFileId?: string;
  computeTimeMs?: number;
  fileName: string;
  config: {
    voxelSize: number;
    fps: number;
    numRays: number;
    material: string;
  };
  dimensions?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface SimulationList {
  simulations: Simulation[];
  total: number;
}

export interface CreateSimulationParams {
  userId: string;
  name: string;
  fileId: string;
  fileName: string;
  config: {
    voxelSize: number;
    fps: number;
    numRays: number;
    material: string;
  };
  dimensions: { x: number; y: number; z: number };
}

export interface UpdateSimulationParams {
  status?: Simulation["status"];
  resultFileId?: string;
  computeTimeMs?: number;
} 

// Auto-convert snake_case to camelCase

function documentToSimulation(doc: SimulationDocument): Simulation {
  return {
    $id: doc.$id,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
    name: doc.name,
    status: doc.status,
    userId: doc.user_id,
    inputFileId: doc.input_file_id,
    resultFileId: doc.result_file_id,
    computeTimeMs: doc.compute_time_ms,
    fileName: doc.file_name,
    config: {
      voxelSize: doc.voxel_size,
      fps: doc.fps,
      numRays: doc.num_rays,
      material: doc.material,
    },
    dimensions:
      doc.area_x && doc.area_y && doc.area_z
        ? {
            x: doc.area_x,
            y: doc.area_y,
            z: doc.area_z,
          }
        : undefined,
  };
}

//  Auto-convert camelCase to snake_case
function simulationToRowData(params: CreateSimulationParams) {
  return {
    name: params.name,
    status: "pending" as const,
    user_id: params.userId,
    input_file_id: params.fileId,
    file_name: params.fileName,
    voxel_size: params.config.voxelSize,
    fps: params.config.fps,
    num_rays: params.config.numRays,
    material: params.config.material,
    area_x: params.dimensions.x,
    area_y: params.dimensions.y,
    area_z: params.dimensions.z,
  };
}

// The repository class, encapsulates all the CRUD operations with doc strings

class SimulationRepository {
  /**
   * List simulations for a specific user
   *
   * @param userId - The user ID to filter by
   * @returns List of simulations with total count
   * @throws Error if request fails
   */
  async list(userId: string): Promise<SimulationList> {
    const response = await tablesDB.listRows({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      queries: [Query.equal("user_id", userId), Query.orderDesc("$createdAt")],
    });

    return {
      simulations: response.rows.map((row) =>
        documentToSimulation(row as unknown as SimulationDocument),
      ),
      total: response.total,
    };
  }

  /**
   * Get a single simulation by ID
   *
   * @param id - Simulation ID
   * @returns Simulation data
   * @throws Error if not found or request fails
   */
  async getById(id: string): Promise<Simulation> {
    const doc = await tablesDB.getRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      rowId: id,
    });

    return documentToSimulation(doc as unknown as SimulationDocument);
  }

  /**
   * Create a new simulation
   *
   * @param params - Simulation creation parameters
   * @returns Created simulation
   * @throws Error if creation fails
   */
  async create(params: CreateSimulationParams): Promise<Simulation> {
    const doc = await tablesDB.createRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      rowId: ID.unique(),
      data: simulationToRowData(params),
    });

    return documentToSimulation(doc as unknown as SimulationDocument);
  }

  /**
   * Update an existing simulation
   *
   * @param id - Simulation ID
   * @param updates - Fields to update
   * @returns Updated simulation
   * @throws Error if update fails
   */
  async update(
    id: string,
    updates: UpdateSimulationParams,
  ): Promise<Simulation> {
    const data: Record<string, any> = {};

    // Only include fields that were provided
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.resultFileId !== undefined)
      data.result_file_id = updates.resultFileId;
    if (updates.computeTimeMs !== undefined)
      data.compute_time_ms = updates.computeTimeMs;

    const doc = await tablesDB.updateRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      rowId: id,
      data,
    });

    return documentToSimulation(doc as unknown as SimulationDocument);
  }

  /**
   * Delete a simulation
   *
   * @param id - Simulation ID
   * @throws Error if deletion fails
   */
  async delete(id: string): Promise<void> {
    await tablesDB.deleteRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      rowId: id,
    });
  }

  // File Operations 

  /**
   * Upload a simulation file
   *
   * @param file - File to upload
   * @returns Uploaded file metadata
   * @throws Error if upload fails
   */
  async uploadFile(file: File): Promise<Models.File> {
    return await storage.createFile({
      bucketId: CONFIG.bucketId,
      fileId: ID.unique(),
      file: file,});
  }

  /**
   * Get file view URL
   *
   * @param fileId - File ID
   * @returns URL to view the file
   */
  getFileUrl(fileId: string): string {
    return storage.getFileView({
      bucketId: CONFIG.bucketId,
      fileId: fileId,
    });
  }

  /**
   * Delete a file
   *
   * @param fileId - File ID
   * @throws Error if deletion fails
   */
  async deleteFile(fileId: string): Promise<void> {
    await storage.deleteFile({
      bucketId: CONFIG.bucketId,
      fileId: fileId,
    });
  }

  /**
   * Delete simulation and its associated file
   *
   * Atomic operation - if file deletion fails, simulation is still deleted
   * (file orphaning is better than simulation orphaning)
   *
   * @param id - Simulation ID
   * @param fileId - File ID to delete
   * @throws Error if simulation deletion fails
   */
  async deleteWithFile(id: string, fileId: string): Promise<void> {
    // Delete simulation first (more important)
    await this.delete(id);

    try {
      await this.deleteFile(fileId);
    } catch (error) {
      console.warn(`Failed to delete file ${fileId}:`, error);
    }
  }
}

export const simulationRepo = new SimulationRepository();
