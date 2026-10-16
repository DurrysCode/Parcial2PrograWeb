import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/productos`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error del servidor (${res.status})`);
        return res.json();
      })
      .then(setProductos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="msg">Cargando...</p>;
  if (error) return <p className="msg error">Error: {error}</p>;

  return (
    <main>
      <h1>Productos</h1>
      <div className="grid">
        {productos.map((p) => (
          <div className="card" key={p.id}>
            <h2>{p.nombre}</h2>
            <p>{p.descripcion}</p>
            <div className="info">
              <strong>${p.precio.toFixed(2)}</strong>
              <span>{p.stock > 0 ? `Stock: ${p.stock}` : "Agotado"}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}