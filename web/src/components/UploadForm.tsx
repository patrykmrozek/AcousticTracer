// TODO: Upload form + params form
// Expected behavior:
// - Pick a .glb/.gltf
// - Configure params
// - POST /api/simulations (multipart)
import { useState } from "react";
import { createSimulation } from "../api/simulations";

interface UploadFormProps {
  onClose?: () => void;
}

export default function UploadForm({ onClose }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "Room",
    voxel_size: 0.1,
    floor_material: "concrete",
    wall_material: "plaster",
    roof_material: "acoustic_tile",
    fps: 60,
    num_rays: 10000,
    num_iterations: 100,
    area_x: 10,
    area_y: 10,
    area_z: 5,
  });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!file) {
      alert("Only GLB file type accepted");
      return;
    }

    try {
      console.log("Submitting simulation:", { file, ...formData });
      await createSimulation({ file, ...formData });
      if (onClose) onClose();
    } catch (err) {
      console.error("Failed to create simulation", err);
      alert("Simulation creation failed (check console)");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-1000 p-4 bg-black/75">
      <div className="bg-bg-card rounded-xl p-6 shadow-md w-[550px] max-h-[90vh] overflow-y-auto border border-border-primary">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-border-primary">
          <h3 className="m-0 text-lg font-semibold text-text-primary">
            New Simulation
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-2xl font-bold p-1 leading-none rounded cursor-pointer transition-all duration-200 text-text-secondary bg-transparent hover:text-text-primary hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-button-primary focus-visible:outline-offset-2"
              aria-label="Close"
            >
              &times;
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* File Upload */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Room Model (.glb)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="model-upload"
                  accept=".glb"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                  className="hidden"
                />
                <label
                  htmlFor="model-upload"
                  className="flex items-center w-full py-2 px-2 border border-border-primary bg-input-bg rounded-lg text-sm transition-colors cursor-pointer hover:border-button-primary"
                >
                  <span className="bg-button-primary text-white px-3 py-1.5 rounded text-xs mr-3 font-medium hover:bg-opacity-90 transition-opacity">
                    Browse
                  </span>
                  <span
                    className={`truncate ${
                      !file ? "text-text-secondary" : "text-text-primary"
                    }`}
                  >
                    {file ? file.name : "No file selected"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Simulation Config */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Voxel Size (m)
              </label>
              <input
                type="number"
                step="0.01"
                name="voxel_size"
                value={formData.voxel_size}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                FPS
              </label>
              <input
                type="number"
                name="fps"
                value={formData.fps}
                onChange={handleChange}
                required
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
              Rays
            </label>
            <input
              type="number"
              name="num_rays"
              value={formData.num_rays}
              onChange={handleChange}
              required
              className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
              Genetics Iterations
            </label>
            <input
              type="number"
              name="num_iterations"
              value={formData.num_iterations}
              onChange={handleChange}
              required
              className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
            />
          </div>

          {/* Materials */}
          <div className="border-t border-border-primary pt-4 mt-2">
            <span className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              Materials
            </span>
            <div className="flex flex-col gap-4">
              <input
                placeholder="Floor Material"
                name="floor_material"
                value={formData.floor_material}
                onChange={handleChange}
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
              <input
                placeholder="Wall Material"
                name="wall_material"
                value={formData.wall_material}
                onChange={handleChange}
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
              <input
                placeholder="Roof Material"
                name="roof_material"
                value={formData.roof_material}
                onChange={handleChange}
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
            </div>
          </div>

          {/* Area */}
          <div className="border-t border-border-primary pt-4 mt-2">
            <span className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              Selected Area Dimensions
            </span>
            <div className="grid grid-cols-3 gap-3">
              <input
                placeholder="X"
                type="number"
                name="area_x"
                value={formData.area_x}
                onChange={handleChange}
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
              <input
                placeholder="Y"
                type="number"
                name="area_y"
                value={formData.area_y}
                onChange={handleChange}
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
              <input
                placeholder="Z"
                type="number"
                name="area_z"
                value={formData.area_z}
                onChange={handleChange}
                className="w-full py-2.5 px-3 border border-border-primary bg-input-bg text-text-primary rounded-lg text-sm transition-colors focus:outline-none focus:border-button-primary"
              />
            </div>
          </div>

          <button className="w-full mt-2 px-4 py-2.5 rounded-lg bg-button-primary text-white font-semibold text-sm transition-colors cursor-pointer border-none hover:bg-button-hover focus-visible:outline-2 focus-visible:outline-button-primary focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed">
            Start Simulation
          </button>
        </form>
      </div>
    </div>
  );
}
