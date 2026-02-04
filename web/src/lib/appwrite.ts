import { Client, Account, TablesDB, Storage } from "appwrite";

const client = new Client();

client
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const tablesDB = new TablesDB(client); // Changed from Databases
export const storage = new Storage(client);

// Re-export ID for convenience (used for generating unique IDs)
export { ID } from "appwrite";
export default client;
