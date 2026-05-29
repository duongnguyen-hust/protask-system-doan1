import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import axios from 'axios';

const THEMES = [
  "bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]",
  "bg-gradient-to-br from-[#1A2980] to-[#26D0CE]",
  "bg-gradient-to-br from-[#b92b27] to-[#1565C0]",
  "bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0]",
  "bg-gradient-to-br from-[#FF416C] to-[#FF4B2B]"
];

// DANH SÁCH THÀNH VIÊN GIẢ LẬP TRONG TEAM
const TEAM_MEMBERS = [
  { tag: '@Minh', name: 'Minh', color: 'bg-blue-500', avatar: '👨🏻‍💻' },
  { tag: '@Lan', name: 'Lan', color: 'bg-pink-500', avatar: '👩🏻‍🎨' },
  { tag: '@Dat', name: 'Đạt', color: 'bg-green-500', avatar: '👨🏽‍🔧' },
  { tag: '@Hoa', name: 'Hoa', color: 'bg-purple-500', avatar: '👩🏻‍💼' },
];

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTheme, setCurrentTheme] = useState(0); 
  const [activeMemberFilter, setActiveMemberFilter] = useState(null); // Bộ lọc thành viên
  
  const [addingColumnId, setAddingColumnId] = useState(null);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskContent, setEditingTaskContent] = useState("");
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");

  const fetchBoardData = () => {
    axios.get('http://localhost:8000/api/kanban')
      .then((res) => { setData(res.data); setLoading(false); })
      .catch((err) => console.error(err));
  };

  useEffect(() => { fetchBoardData(); }, []);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1); newTaskIds.splice(destination.index, 0, draggableId);
      const newColumn = { ...startColumn, taskIds: newTaskIds };
      setData({ ...data, columns: { ...data.columns, [newColumn.id]: newColumn } });
      axios.put('http://localhost:8000/api/kanban/update', { startColumn: newColumn, finishColumn: null }).catch(console.error);
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds); startTaskIds.splice(source.index, 1);
    const newStartColumn = { ...startColumn, taskIds: startTaskIds };
    const finishTaskIds = Array.from(finishColumn.taskIds); finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinishColumn = { ...finishColumn, taskIds: finishTaskIds };
    setData({ ...data, columns: { ...data.columns, [newStartColumn.id]: newStartColumn, [newFinishColumn.id]: newFinishColumn }});
    axios.put('http://localhost:8000/api/kanban/update', { startColumn: newStartColumn, finishColumn: newFinishColumn }).catch(console.error);
  };

  const submitNewTask = (columnId) => {
    if (!newTaskContent.trim()) { setAddingColumnId(null); return; }
    axios.post('http://localhost:8000/api/kanban/tasks', { content: newTaskContent, columnId }).then(() => { fetchBoardData(); setNewTaskContent(""); setAddingColumnId(null); });
  };
  const submitNewColumn = () => {
    if (!newListTitle.trim()) { setIsAddingList(false); return; }
    axios.post('http://localhost:8000/api/kanban/columns', { title: newListTitle }).then(() => { fetchBoardData(); setNewListTitle(""); setIsAddingList(false); });
  };
  const handleDeleteTask = (taskId) => {
    if (window.confirm('Xóa thẻ này vĩnh viễn?')) axios.delete(`http://localhost:8000/api/kanban/tasks/${taskId}`).then(fetchBoardData);
  };
  const handleDeleteColumn = (colId) => {
    if (window.confirm('CẢNH BÁO: Xóa cột này sẽ xóa luôn TẤT CẢ công việc bên trong nó! Bạn có chắc không?')) {
      axios.delete(`http://localhost:8000/api/kanban/columns/${colId}`).then(fetchBoardData);
    }
  };
  const saveTaskEdit = (taskId) => {
    if (!editingTaskContent.trim()) return;
    axios.put(`http://localhost:8000/api/kanban/tasks/${taskId}`, { content: editingTaskContent }).then(() => { fetchBoardData(); setEditingTaskId(null); });
  };
  const saveColumnEdit = (colId) => {
    if (!editingColumnTitle.trim()) return;
    axios.put(`http://localhost:8000/api/kanban/columns/${colId}`, { title: editingColumnTitle }).then(() => { fetchBoardData(); setEditingColumnId(null); });
  };

  const renderSmartContent = (text) => {
    const parts = text.split(/(#[^\s]+|@[^\s]+|![^\s]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        const hue = part.length * 25 % 360; 
        return <span key={index} className="inline-block px-2 py-0.5 mt-1 mr-1 text-[11px] font-bold text-white rounded shadow-sm cursor-default" style={{ backgroundColor: `hsl(${hue}, 70%, 45%)` }}>{part}</span>;
      }
      if (part.startsWith('@')) {
        // Tìm xem tag này thuộc về ai để lấy màu và avatar tương ứng
        const member = TEAM_MEMBERS.find(m => m.tag.toLowerCase() === part.toLowerCase());
        const bgColor = member ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600';
        const icon = member ? member.avatar : '👤';
        
        return <span key={index} className={`inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 mr-1 text-[12px] font-bold border border-black/10 rounded cursor-pointer hover:shadow-sm transition-shadow ${bgColor}`} title={`Được giao cho ${member ? member.name : part}`}><span className="text-[10px]">{icon}</span>{part.substring(1)}</span>;
      }
      if (part.startsWith('!')) {
        return <span key={index} className="inline-flex items-center px-1.5 py-0.5 mt-1 mr-1 text-[11px] font-bold text-red-700 bg-red-100 border border-red-300 rounded animate-pulse cursor-default">🔥 {part.substring(1).replace(/_/g, ' ')}</span>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Hàm hỗ trợ chèn Tag khi ấn vào Avatar lúc thêm/sửa việc
  const appendMemberTag = (tag, isEditing) => {
    if (isEditing) {
      setEditingTaskContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + tag + ' ');
    } else {
      setNewTaskContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + tag + ' ');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div></div>;

  return (
    <div className={`flex flex-col h-screen w-screen font-sans antialiased transition-colors duration-700 ease-in-out ${THEMES[currentTheme]}`}>
      
      {/* NAVBAR */}
      <nav className="h-14 bg-black/20 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 shrink-0 shadow-lg">
        <div className="text-xl font-extrabold text-white flex items-center gap-2 tracking-wide">
          <span className="text-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] text-2xl">👥</span> TeamSync Workspace
        </div>
        
        <div className="flex items-center gap-6">
          
          {/* KHU VỰC TEAM MEMBERS - LỌC THEO NGƯỜI */}
          <div className="flex items-center gap-2 border-r border-white/20 pr-6">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider mr-1">Nhóm:</span>
            <div className="flex -space-x-2">
              {TEAM_MEMBERS.map((member) => (
                <div 
                  key={member.tag}
                  onClick={() => setActiveMemberFilter(activeMemberFilter === member.tag ? null : member.tag)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer border-2 transition-all duration-300 ${member.color} ${activeMemberFilter === member.tag ? 'border-white z-10 scale-125 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-black/20 hover:-translate-y-1 hover:z-10 opacity-80'}`}
                  title={`Lọc việc của ${member.name}`}
                >
                  {member.avatar}
                </div>
              ))}
            </div>
            {activeMemberFilter && (
              <button onClick={() => setActiveMemberFilter(null)} className="ml-2 text-xs text-red-300 hover:text-red-100 font-bold bg-black/20 px-2 py-1 rounded">✕ Bỏ lọc</button>
            )}
          </div>

          <div className="relative group">
            <input 
              type="text" placeholder="🔍 Lọc thẻ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-full px-5 py-1.5 text-sm text-white placeholder-white/50 outline-none focus:bg-white/20 focus:ring-2 ring-blue-400 w-48 focus:w-64 transition-all duration-300"
            />
          </div>
          
          <button 
            onClick={() => setCurrentTheme((prev) => (prev + 1) % THEMES.length)}
            className="flex items-center gap-1 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-full transition-all shadow-sm hover:shadow-md"
          >🎨 Đổi Giao Diện</button>
        </div>
      </nav>

      {/* MAIN BOARD */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 items-start h-full">
            
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId];
              
              // LOGIC LỌC: Kết hợp Lọc chữ (Search) và Lọc người (Member)
              const tasks = column.taskIds
                .map(id => data.tasks[id])
                .filter(t => t.content.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(t => activeMemberFilter ? t.content.toLowerCase().includes(activeMemberFilter.toLowerCase()) : true);

              return (
                <div key={column.id} className={`bg-[#f1f2f4]/95 rounded-2xl w-[320px] shrink-0 max-h-full flex flex-col shadow-2xl border transition-all ${activeMemberFilter ? 'border-blue-400 ring-1 ring-blue-300' : 'border-white/20'}`}>
                  
                  {/* COLUMN HEADER */}
                  <div className="px-4 py-3.5 flex justify-between items-center group border-b border-slate-200/50 relative">
                    {editingColumnId === column.id ? (
                      <input 
                        autoFocus className="font-bold text-[16px] bg-white border-2 border-blue-500 rounded px-2 py-1 w-full outline-none shadow-inner"
                        value={editingColumnTitle} onChange={(e) => setEditingColumnTitle(e.target.value)}
                        onBlur={() => saveColumnEdit(column.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveColumnEdit(column.id); }}
                      />
                    ) : (
                      <div className="font-bold text-[16px] text-slate-800 flex items-center gap-2 w-full">
                        <span className="truncate">{column.title}</span>
                        <span className="bg-slate-200/80 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-semibold">{tasks.length}</span>
                        
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 ml-auto transition-opacity bg-[#f1f2f4] pl-2 absolute right-4">
                          <button onClick={() => { setEditingColumnId(column.id); setEditingColumnTitle(column.title); }} className="text-slate-400 text-xs hover:text-blue-600 font-semibold">✎ Sửa</button>
                          <button onClick={() => handleDeleteColumn(column.id)} className="text-slate-400 text-xs hover:text-red-600 font-semibold">🗑️ Xóa</button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Droppable droppableId={column.id} isDropDisabled={searchQuery.length > 0 || activeMemberFilter !== null}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`px-3 pt-3 flex-1 overflow-y-auto ${snapshot.isDraggingOver ? 'bg-blue-50/50 rounded-lg' : ''}`} style={{ minHeight: '60px' }}>
                        
                        {tasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-20 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-sm font-medium mb-3">
                            {activeMemberFilter ? 'Không có việc nào' : 'Kéo thả thẻ vào đây'}
                          </div>
                        )}

                        {tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={searchQuery.length > 0 || activeMemberFilter !== null}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={provided.draggableProps.style}
                                className={`group relative p-3 mb-3 bg-white rounded-xl shadow-sm border hover:border-blue-300 hover:shadow-md transition-shadow flex flex-col ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500 border-blue-500 z-[9999] cursor-grabbing' : 'border-slate-200 cursor-grab'}`}
                              >
                                {editingTaskId === task.id ? (
                                  <div>
                                    <textarea
                                      autoFocus className="w-full text-[14px] text-slate-700 outline-none resize-none border border-blue-400 rounded-t p-2 bg-blue-50/30" rows="3"
                                      value={editingTaskContent} onChange={(e) => setEditingTaskContent(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) saveTaskEdit(task.id); if (e.key === 'Escape') setEditingTaskId(null); }}
                                    />
                                    {/* THANH GIAO VIỆC NHANH KHI SỬA */}
                                    <div className="flex bg-slate-100 border border-t-0 border-blue-400 rounded-b p-1.5 gap-1 items-center">
                                      <span className="text-[10px] text-slate-500 font-bold ml-1">GIAO CHO:</span>
                                      {TEAM_MEMBERS.map(m => (
                                        <button key={m.tag} onClick={() => appendMemberTag(m.tag, true)} className={`w-6 h-6 rounded-full text-xs ${m.color} text-white hover:scale-110 transition-transform`} title={m.name}>{m.avatar}</button>
                                      ))}
                                      <button onClick={() => saveTaskEdit(task.id)} className="ml-auto bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">Lưu</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full pr-7 text-[14px] text-slate-700 leading-relaxed font-medium">
                                    {renderSmartContent(task.content)}
                                  </div>
                                )}
                                
                                {editingTaskId !== task.id && (
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingTaskId(task.id); setEditingTaskContent(task.content); }} className="text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 rounded p-1.5 shadow-sm transition-colors" title="Sửa thẻ">✎</button>
                                    <button onClick={() => handleDeleteTask(task.id)} className="text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-100 rounded p-1.5 shadow-sm transition-colors" title="Xóa thẻ">✕</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  {/* THÊM THẺ MỚI */}
                  <div className="p-3 pt-1 border-t border-slate-200/50 mt-1">
                    {addingColumnId === column.id ? (
                      <div className="bg-white rounded-xl shadow-md p-0 border border-blue-200 overflow-hidden">
                        <textarea
                          autoFocus className="w-full text-sm resize-none outline-none text-slate-700 p-2 pb-0" rows="2" placeholder="Gõ @ten, !gap, hoặc #tag..."
                          value={newTaskContent} onChange={(e) => setNewTaskContent(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNewTask(column.id); } if (e.key === 'Escape') setAddingColumnId(null); }}
                        />
                        {/* THANH GIAO VIỆC NHANH KHI THÊM */}
                        <div className="flex bg-slate-50 p-2 gap-1 items-center border-t border-slate-100">
                          <span className="text-[10px] text-slate-500 font-bold mr-1">GIAO VIỆC:</span>
                          {TEAM_MEMBERS.map(m => (
                            <button key={m.tag} onClick={() => appendMemberTag(m.tag, false)} className={`w-6 h-6 rounded-full text-xs ${m.color} text-white hover:scale-110 transition-transform`} title={m.name}>{m.avatar}</button>
                          ))}
                        </div>
                        <div className="flex gap-2 p-2 pt-0 bg-slate-50">
                          <button onClick={() => submitNewTask(column.id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 font-bold shadow-sm flex-1">Lưu Công Việc</button>
                          <button onClick={() => setAddingColumnId(null)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 rounded-lg text-sm font-bold">Hủy</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingColumnId(column.id)} className="w-full text-left px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 rounded-xl font-semibold transition-colors flex items-center gap-2"><span className="text-lg leading-none">+</span> Thêm công việc</button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* THÊM CỘT MỚI */}
            <div className="w-[320px] shrink-0">
              {isAddingList ? (
                <div className="bg-[#f1f2f4] rounded-2xl p-3 shadow-xl border border-white/20">
                  <input
                    autoFocus type="text" placeholder="Nhập tên cột..." value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitNewColumn(); if (e.key === 'Escape') setIsAddingList(false); }}
                    className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg text-sm outline-none focus:ring-2 ring-blue-200 shadow-inner"
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={submitNewColumn} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 font-bold shadow-sm">Tạo danh sách</button>
                    <button onClick={() => setIsAddingList(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-200 rounded-lg text-sm font-bold">Hủy</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsAddingList(true)} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm text-left px-5 py-4 rounded-2xl transition-all backdrop-blur-md shadow-sm flex items-center gap-2 border border-white/10"><span className="text-xl leading-none">+</span> Thêm danh sách mới</button>
              )}
            </div>

          </div>
        </DragDropContext>
      </main>
    </div>
  );
}

export default App;