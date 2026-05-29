import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg'; 

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 1. LẤY DỮ LIỆU
app.get('/api/kanban', async (req, res) => {
  try {
    const columnsResult = await pool.query('SELECT * FROM columns ORDER BY position ASC');
    const tasksResult = await pool.query('SELECT * FROM tasks ORDER BY position ASC');
    const columnsData = columnsResult.rows;
    const tasksData = tasksResult.rows;

    const tasks = {};
    tasksData.forEach(task => { tasks[task.id] = { id: task.id, content: task.content }; });

    const columns = {};
    const columnOrder = [];

    columnsData.forEach(col => {
      columns[col.id] = {
        id: col.id, title: col.title,
        taskIds: tasksData.filter(t => t.column_id === col.id).sort((a, b) => a.position - b.position).map(t => t.id)
      };
      columnOrder.push(col.id);
    });
    res.json({ tasks, columns, columnOrder });
  } catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

// 2. LƯU VỊ TRÍ KÉO THẢ
app.put('/api/kanban/update', async (req, res) => {
  const { startColumn, finishColumn } = req.body;
  try {
    for (let i = 0; i < startColumn.taskIds.length; i++) {
      await pool.query('UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3', [startColumn.id, i + 1, startColumn.taskIds[i]]);
    }
    if (finishColumn && finishColumn.id !== startColumn.id) {
      for (let i = 0; i < finishColumn.taskIds.length; i++) {
        await pool.query('UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3', [finishColumn.id, i + 1, finishColumn.taskIds[i]]);
      }
    }
    res.json({ message: 'OK' });
  } catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

// 3. THÊM THẺ & CỘT
app.post('/api/kanban/tasks', async (req, res) => {
  const { content, columnId } = req.body;
  const taskId = `task-${Date.now()}`;
  try {
    const posResult = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM tasks WHERE column_id = $1', [columnId]);
    await pool.query('INSERT INTO tasks (id, content, column_id, position) VALUES ($1, $2, $3, $4)', [taskId, content, columnId, posResult.rows[0].next_pos]);
    res.json({ message: 'OK' });
  } catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

app.post('/api/kanban/columns', async (req, res) => {
  const { title } = req.body;
  const colId = `column-${Date.now()}`;
  try {
    const posResult = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM columns');
    await pool.query('INSERT INTO columns (id, title, position) VALUES ($1, $2, $3)', [colId, title, posResult.rows[0].next_pos]);
    res.json({ message: 'OK' });
  } catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

// 4. XÓA & SỬA THẺ
app.delete('/api/kanban/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'OK' });
  } catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

app.put('/api/kanban/tasks/:id', async (req, res) => {
  try { await pool.query('UPDATE tasks SET content = $1 WHERE id = $2', [req.body.content, req.params.id]); res.json({ message: 'OK' }); } 
  catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

// 5. XÓA & SỬA CỘT (TÍNH NĂNG MỚI ĐÂY NÈ)
app.put('/api/kanban/columns/:id', async (req, res) => {
  try { await pool.query('UPDATE columns SET title = $1 WHERE id = $2', [req.body.title, req.params.id]); res.json({ message: 'OK' }); } 
  catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

app.delete('/api/kanban/columns/:id', async (req, res) => {
  try {
    // BƯỚC QUAN TRỌNG: Xóa sạch rác (các thẻ công việc) nằm trong cột này trước
    await pool.query('DELETE FROM tasks WHERE column_id = $1', [req.params.id]);
    // SAU ĐÓ: Tiêu hủy luôn cái cột
    await pool.query('DELETE FROM columns WHERE id = $1', [req.params.id]);
    res.json({ message: 'OK' });
  } catch (err) { res.status(500).json({ error: 'Lỗi Backend' }); }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Backend đang chạy tại http://localhost:${PORT}`));