import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../lib/context/user";
import UploadForm from "../components/UploadForm";
import { listSimulations, deleteRow } from "../api/simulations";

export default function Dashboard() {
  const { logout, current } = useUser();
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(true);
  const [simulations, setSimulations] = useState<any[]>([]);

  const loadData = async () => {
    const data = await listSimulations();
    setSimulations(data.rows);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteRow(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2 className="dashboard-welcome">Welcome, {current?.name}</h2>
        <h1>Acoustic Tracer</h1>
        <button className="button" onClick={logout}>
          Logout
        </button>
      </header>
      <main className="dashboard-main">
        <div className="sim-table-container">
          <table className="sim-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Status</th>
                <th>Voxel Size</th>
                <th>FPS</th>
                <th>Rays</th>
                <th>Iterations</th>
              </tr>
            </thead>
            <tbody>
              {simulations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "#6b7280" }}
                  >
                    No simulations found. Create one to get started.
                  </td>
                </tr>
              ) : (
                simulations.map((sim) => (
                  <tr
                    key={sim.$id}
                    onClick={() => navigate(`/scene/${sim.$id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{new Date(sim.$createdAt).toLocaleString()}</td>
                    <td>{sim.name}</td>
                    <td>
                      <span className={`status-badge status-${sim.status}`}>
                        {sim.status}
                      </span>
                    </td>
                    <td>{sim.voxel_size} m</td>
                    <td>{sim.fps}</td>
                    <td>{sim.num_rays.toLocaleString()}</td>
                    <td>{sim.num_iterations}</td>
                    <td>
                      {" "}
                      <button
                        className="close-button"
                        aria-label="Close"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sim.$id);
                        }}
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isUploadOpen && (
            <div className="upload-trigger-container">
              <button className="button" onClick={() => setIsUploadOpen(true)}>
                Create new simulation
              </button>
            </div>
          )}
        </div>
        {isUploadOpen && (
          <UploadForm
            onClose={() => {
              setIsUploadOpen(false);
              loadData();
            }}
          />
        )}
      </main>
    </div>
  );
}
