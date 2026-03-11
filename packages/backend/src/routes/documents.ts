import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { getDb } from '../db/connection.js';
import { processDocument } from '../services/ragService.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/plain', 'application/pdf', 'text/markdown', 'text/csv'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { conversation_id } = req.query;
  const db = getDb();
  if (conversation_id) {
    res.json(db.prepare('SELECT * FROM documents WHERE conversation_id = ? ORDER BY uploaded_at DESC').all(conversation_id));
  } else {
    res.json(db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all());
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const id = uuid();
  const db = getDb();
  db.prepare(
    'INSERT INTO documents (id, conversation_id, filename, original_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.body.conversation_id || null, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

  try {
    await processDocument(req.file.path, req.file.mimetype, id);
    res.status(201).json(db.prepare('SELECT * FROM documents WHERE id = ?').get(id));
  } catch (err: any) {
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    if (existsSync(req.file.path)) unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to process document: ' + err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as any;
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, doc.filename);
  if (existsSync(filePath)) unlinkSync(filePath);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
