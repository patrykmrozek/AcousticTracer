import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getSimulation, getFileView } from "../api/simulations";
import SceneCanvas from "../r3f/SceneCanvas";

export default function Scene() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const sim = await getSimulation(id);
        if (sim.input_file_id) {
          const url = getFileView(sim.input_file_id);
          setModelUrl(url);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load simulation");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <div>
      <header>
        <button
          className="button button-ghost"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>
        <h1 className="h1">{id ? `Simulation View` : "Scene Viewer"}</h1>
        <div style={{ width: "64px" }}></div>
      </header>
      <main>
        <div className="canvas-card">
          {loading && <div className="text-secondary">Loading scene...</div>}
          {error && <div className="error-message">{error}</div>}
          {!loading && !error && modelUrl && (
            <SceneCanvas modelUrl={modelUrl} />
          )}
        </div>
      </main>
    </div>
  );
}
