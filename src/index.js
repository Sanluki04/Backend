const express = require("express");
const app = express();
app.use(express.json());

// ---- Datos en memoria ----
let datos = {
  profesores: [
    { id: 1, nombre: "Juan Pérez", email: "juan@mail.com" },
    { id: 2, nombre: "Sebastián Díaz", email: "seba@mail.com" }
  ],
  alumnos: [
    { id: 1, nombre: "Pedro Gómez", email: "pedro@mail.com" },
    { id: 2, nombre: "Roberto Riberos", email: "rober@mail.com" }
  ],
  materias: [
    { id: 1, nombre: "Matemática", profesorId: 1 },
    { id: 2, nombre: "Lengua", profesorId: 2 }
  ],
  matriculas: [
    { id: 1, alumnoId: 1, materiaId: 1 },
    { id: 2, alumnoId: 2, materiaId: 2 }
  ],
  tareas: []
};

// ---- Middleware ----
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// ---- Funciones de ayuda ----
const encontrarPorId = (array, id) => array.find(item => item.id === parseInt(id));
const existeId = (array, id) => array.some(item => item.id === parseInt(id));

// ---- CRUD Básico (Profesores, Alumnos, Materias) ----
const crearCRUD = (entidad) => {
  app.get(`/${entidad}`, (req, res) => res.json(datos[entidad]));
  
  app.post(`/${entidad}`, (req, res) => {
    const camposRequeridos = entidad === 'materias' ? ['nombre', 'profesorId'] : ['nombre', 'email'];
    for (let campo of camposRequeridos) {
      if (!req.body[campo]) return res.status(400).json({ error: `Falta campo: ${campo}` });
    }
    
    if (entidad === 'materias' && !existeId(datos.profesores, req.body.profesorId)) {
      return res.status(400).json({ error: "Profesor no existe" });
    }
    
    const nuevoItem = { id: datos[entidad].length + 1, ...req.body };
    datos[entidad].push(nuevoItem);
    res.status(201).json(nuevoItem);
  });
  
  app.get(`/${entidad}/:id`, (req, res) => {
    const item = encontrarPorId(datos[entidad], req.params.id);
    item ? res.json(item) : res.status(404).json({ error: "No encontrado" });
  });
};

// Crear rutas CRUD para estas entidades
['profesores', 'alumnos', 'materias'].forEach(crearCRUD);

// ---- Matrículas ----
app.post("/matriculas", (req, res) => {
  const { alumnoId, materiaId } = req.body;
  if (!alumnoId || !materiaId) return res.status(400).json({ error: "Faltan alumnoId o materiaId" });
  
  if (!existeId(datos.alumnos, alumnoId) || !existeId(datos.materias, materiaId)) {
    return res.status(400).json({ error: "Alumno o materia no existen" });
  }
  
  const yaMatriculado = datos.matriculas.some(m => m.alumnoId == alumnoId && m.materiaId == materiaId);
  if (yaMatriculado) return res.status(400).json({ error: "Ya está matriculado" });
  
  const matricula = { id: datos.matriculas.length + 1, alumnoId, materiaId };
  datos.matriculas.push(matricula);
  res.status(201).json(matricula);
});

// ---- Consultas específicas ----
app.get("/materias/:id/alumnos", (req, res) => {
  const materiaId = parseInt(req.params.id);
  if (!existeId(datos.materias, materiaId)) return res.status(404).json({ error: "Materia no existe" });
  
  const alumnos = datos.matriculas
    .filter(m => m.materiaId === materiaId)
    .map(m => datos.alumnos.find(a => a.id === m.alumnoId))
    .filter(a => a);
  
  res.json(alumnos);
});

app.get("/alumnos/:id/materias", (req, res) => {
  const alumnoId = parseInt(req.params.id);
  if (!existeId(datos.alumnos, alumnoId)) return res.status(404).json({ error: "Alumno no existe" });
  
  const materias = datos.matriculas
    .filter(m => m.alumnoId === alumnoId)
    .map(m => datos.materias.find(mat => mat.id === m.materiaId))
    .filter(m => m);
  
  res.json(materias);
});

// ---- Tareas ----
app.post("/tareas", (req, res) => {
  const { titulo, descripcion, fechaEntrega, alumnoId, materiaId } = req.body;
  const camposRequeridos = ['titulo', 'descripcion', 'fechaEntrega', 'alumnoId', 'materiaId'];
  
  for (let campo of camposRequeridos) {
    if (!req.body[campo]) return res.status(400).json({ error: `Falta campo: ${campo}` });
  }
  
  if (!existeId(datos.alumnos, alumnoId) || !existeId(datos.materias, materiaId)) {
    return res.status(400).json({ error: "Alumno o materia no existen" });
  }
  
  const tarea = { 
    id: datos.tareas.length + 1, 
    titulo, descripcion, fechaEntrega, alumnoId, materiaId,
    entregada: false, archivo: null, calificacion: null
  };
  
  datos.tareas.push(tarea);
  res.status(201).json(tarea);
});

app.get("/alumnos/:id/tareas", (req, res) => {
  const alumnoId = parseInt(req.params.id);
  if (!existeId(datos.alumnos, alumnoId)) return res.status(404).json({ error: "Alumno no existe" });
  
  const tareasAlumno = datos.tareas.filter(t => t.alumnoId === alumnoId);
  res.json(tareasAlumno);
});

app.put("/tareas/:id/entregar", (req, res) => {
  const tarea = encontrarPorId(datos.tareas, req.params.id);
  if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });
  
  if (!req.body.archivo) return res.status(400).json({ error: "Se requiere archivo" });
  
  tarea.entregada = true;
  tarea.archivo = req.body.archivo;
  tarea.fechaEntregaReal = new Date().toLocaleDateString();
  
  res.json({ message: "Tarea entregada", tarea });
});

// ---- Ruta de estado ----
app.get("/status", (req, res) => {
  res.json({
    profesores: datos.profesores.length,
    alumnos: datos.alumnos.length,
    materias: datos.materias.length,
    matriculas: datos.matriculas.length,
    tareas: datos.tareas.length,
    tareasEntregadas: datos.tareas.filter(t => t.entregada).length
  });
});

// ---- Manejo de errores ----
app.use((req, res) => res.status(404).json({ error: "Endpoint no encontrado" }));

// ---- Iniciar servidor ----
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log("Endpoints: /profesores, /alumnos, /materias, /matriculas, /tareas");
});