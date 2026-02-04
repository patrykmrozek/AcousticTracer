import { ID, Query } from "appwrite";
import { tablesDB, storage, account } from "../lib/appwrite";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID_SIMULATIONS;
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID_SIMULATIONS;

export interface SimulationPayload {
  file: File;
  name: string;
  voxel_size: number;
  floor_material: string;
  wall_material: string;
  roof_material: string;
  fps: number;
  num_rays: number;
  num_iterations: number;
  area_x: number;
  area_y: number;
  area_z: number;
}

export async function createSimulation(payload: SimulationPayload) {
  try {
    const user = await account.get();

    console.log("Uploading file...", payload.file.name);

    const uploadedFile = await storage.createFile({
      bucketId: BUCKET_ID,
      fileId: ID.unique(),
      file: payload.file,
    });

    console.log(uploadedFile);

    console.log("Creating database entry...");
    const row = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data: {
        name: payload.name,
        status: "pending",
        user_id: user.$id, // Link to current user
        input_file_id: uploadedFile.$id,
        voxel_size: Number(payload.voxel_size),
        fps: Number(payload.fps),
        num_rays: Number(payload.num_rays),
        num_iterations: Number(payload.num_iterations),
        floor_material: payload.floor_material,
        wall_material: payload.wall_material,
        roof_material: payload.roof_material,
        area_x: Number(payload.area_x),
        area_y: Number(payload.area_y),
        area_z: Number(payload.area_z),
      },
    });

    return row;
  } catch (error) {
    console.error("Simulation Creation Failed:", error);
    throw error;
  }
}

export async function listSimulations() {
  try {
    const user = await account.get();
    return await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      queries: [
        Query.equal("user_id", user.$id),
        Query.orderDesc("$createdAt"),
      ],
    });
  } catch (err) {
    console.error(err);
    return { rows: [], total: 0 };
  }
}

export async function getSimulation(id: string) {
  try {
    return await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: id,
    });
  } catch (error) {
    console.error("Get Simulation Failed:", error);
    throw error;
  }
}

export async function deleteRow(id: string){
  try{
    return await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: id,
    });
  }catch (error){
    console.error("Delete Row failed:", error)
    throw error
  }
}


export function getFileView(fileId: string) {
  return storage.getFileView({
    bucketId: BUCKET_ID,
    fileId: fileId});
}
