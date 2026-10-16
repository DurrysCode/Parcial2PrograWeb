// backend/server.js
import "dotenv/config"; // carga las variables de .env
import express from "express";
import cors from "cors";
import sql from "mssql";

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middlewares ----------
// CORS: permite peticiones desde el frontend de Vite
// (se pueden indicar varios orígenes separados por coma en CORS_ORIGIN)
const origenesPermitidos = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(cors({ origin: origenesPermitidos }));
app.use(express.json());

// ---------- Configuración de conexión a SQL Server ----------
const dbConfig = {
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || "catalogo",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    // encrypt: true es obligatorio en Azure SQL
    encrypt: process.env.DB_ENCRYPT === "true",
    // trustServerCertificate: true acepta certificados autofirmados (solo desarrollo)
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === "true",
  },
  // Pool de conexiones
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

// ---------- Pool de conexiones (singleton) ----------
// Se crea una sola vez y se reutiliza en todas las peticiones
let poolPromise;

function obtenerPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        console.log("Conectado a SQL Server");
        // Si el pool falla después, se reinicia en la siguiente petición
        pool.on("error", (err) => {
          console.error("Error en el pool:", err.message);
          poolPromise = null;
        });
        return pool;
      })
      .catch((err) => {
        poolPromise = null; // permite reintentar en la siguiente petición
        throw err;
      });
  }
  return poolPromise;
}

// ---------- Endpoints ----------
// GET /api/productos → lista todos los productos
app.get("/api/productos", async (req, res) => {
  try {
    const pool = await obtenerPool();
    const result = await pool.request().query(`
      SELECT id, nombre, descripcion, precio, stock, creado_en
      FROM dbo.productos
      ORDER BY id ASC
    `);

    // result.recordset es un arreglo con las filas devueltas
    res.json(result.recordset);
  } catch (err) {
    console.error("Error al obtener productos:", err.message);
    res.status(500).json({ error: "No se pudieron obtener los productos" });
  }
});

// Endpoint simple para verificar que el servidor responde
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ---------- Arranque ----------
async function iniciar() {
  try {
    // Intenta conectar al iniciar para detectar errores de configuración temprano
    await obtenerPool();
  } catch (err) {
    console.error("No se pudo conectar a SQL Server al iniciar:", err.message);
    console.error("    El servidor arrancará igual y reintentará en cada petición.");
  }

  app.listen(PORT, () =>
    console.log(`API lista en http://localhost:${PORT}/api/productos`)
  );
}

iniciar();

// Cierre limpio al detener el proceso
process.on("SIGINT", async () => {
  try {
    const pool = await poolPromise;
    await pool?.close();
  } finally {
    process.exit(0);
  }
});