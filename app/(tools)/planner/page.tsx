'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  DndContext, 
  closestCorners, 
  DragOverlay, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable,
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  X, 
  Check, 
  GripVertical, 
  Home, 
  RotateCcw,
  ChevronDown
} from 'lucide-react';

// --- TYPES ---

type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  columnId: string;
  content: string;
  priority: Priority;
  tags: string[];
  createdAt: number;
}

interface ColumnType {
  id: string;
  title: string;
  color: string;
}

// --- CONSTANTS ---

const STORAGE_KEY = 'planner-board-v3';

const DEFAULT_COLUMNS: ColumnType[] = [
  { id: 'todo', title: 'To Do', color: 'bg-zinc-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-indigo-500' },
  { id: 'review', title: 'In Review', color: 'bg-amber-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' },
];

const DEFAULT_TASKS: Task[] = [
  { id: 't1', columnId: 'todo', content: 'Analyze user metrics for Q3', priority: 'high', tags: ['Analytics'], createdAt: Date.now() },
  { id: 't2', columnId: 'in-progress', content: 'Fix navigation gesture bug on mobile', priority: 'medium', tags: ['Bug', 'Mobile'], createdAt: Date.now() },
  { id: 't3', columnId: 'done', content: 'Q4 Roadmap Planning', priority: 'low', tags: ['Strategy'], createdAt: Date.now() },
];

const generateId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

// --- COMPONENTS ---

// 1. Task Card
interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const TaskCard = React.memo(({ task, onDelete, onEdit }: TaskCardProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const priorityStyles = {
    low: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    medium: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500',
    high: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500',
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="opacity-40 h-[100px] rounded-xl border-2 border-dashed border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-white dark:bg-[#18181b] p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all touch-manipulation"
    >
      <div className="flex gap-3">
        {/* Drag Handle */}
        <button 
          {...attributes} 
          {...listeners} 
          className="mt-0.5 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical size={16} />
        </button>

        {/* Content */}
        <div className="flex-1 space-y-2.5 min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed break-words">
            {task.content}
          </p>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wider ${priorityStyles[task.priority]}`}>
              {task.priority}
            </span>
            {task.tags.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 rounded border border-zinc-100 dark:border-zinc-700/50 truncate max-w-[100px]">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => { e.stopPropagation(); onEdit(task); }}
             className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-indigo-500 transition-colors"
           >
             <MoreHorizontal size={14} />
           </button>
        </div>
      </div>
    </div>
  );
});
TaskCard.displayName = 'TaskCard';


// 2. Column Component
interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
}

const Column = React.memo(({ column, tasks, onAddTask, onDeleteTask, onEditTask }: ColumnProps) => {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col h-full w-[85vw] md:w-[320px] min-w-[85vw] md:min-w-[320px] bg-zinc-100/50 dark:bg-[#0c0c0e]/50 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-sm overflow-hidden snap-center"
    >
      {/* Sticky Header */}
      <div className="flex-none p-4 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-[#18181b]/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
           <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#18181b] shadow-sm ${column.color}`} />
           <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-200 tracking-tight">
             {column.title}
           </h3>
           <span className="text-[10px] font-mono font-bold text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
             {tasks.length}
           </span>
        </div>
        <button 
          onClick={() => onAddTask(column.id)}
          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full text-zinc-400 hover:text-indigo-600 border border-zinc-200/50 dark:border-zinc-700/50 transition-all active:scale-95 shadow-sm"
          title="Add Task"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Scrollable Task List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar scroll-smooth">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} onEdit={onEditTask} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center opacity-50">
            <span className="text-xs text-zinc-400 font-medium">Drop tasks here</span>
          </div>
        )}
        
        {/* Padding for bottom scroll to prevent float bar obstruction */}
        <div className="h-20 md:h-12 w-full"></div> 
      </div>
    </div>
  );
});
Column.displayName = 'Column';


// 3. Main Page
export default function PlannerPage() {
  const [columns, setColumns] = useState<ColumnType[]>(DEFAULT_COLUMNS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [targetColumn, setTargetColumn] = useState<string>('todo');

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTasks(parsed.tasks || DEFAULT_TASKS);
      } catch (e) { console.error(e); }
    } else {
      setTasks(DEFAULT_TASKS);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns, tasks }));
    }
  }, [columns, tasks, isClient]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === active.id);
        const overIndex = tasks.findIndex((t) => t.id === over.id);
        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          tasks[activeIndex].columnId = tasks[overIndex].columnId;
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    } else if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === active.id);
        tasks[activeIndex].columnId = over.id as string;
        return arrayMove(tasks, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    if (active.data.current?.type === 'Task' && over.data.current?.type === 'Task') {
       const activeIndex = tasks.findIndex((t) => t.id === active.id);
       const overIndex = tasks.findIndex((t) => t.id === over.id);
       if (activeIndex !== overIndex) {
         setTasks((t) => arrayMove(t, activeIndex, overIndex));
       }
    }
  };

  const openCreateModal = (columnId: string) => {
    setModalMode('create');
    setTargetColumn(columnId);
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = useCallback((task: Task) => {
    setModalMode('edit');
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const saveTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = formData.get('content') as string;
    const priority = formData.get('priority') as Priority;
    const selectedColumnId = formData.get('columnId') as string;
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean);

    if (modalMode === 'create') {
      setTasks(prev => [...prev, {
        id: generateId(),
        columnId: selectedColumnId || targetColumn,
        content,
        priority,
        tags,
        createdAt: Date.now(),
      }]);
    } else if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { 
        ...t, 
        content, 
        priority, 
        tags,
        columnId: selectedColumnId // Update column logic
      } : t));
    }
    setIsModalOpen(false);
  };

  const handleDeleteTask = () => {
    if (editingTask) {
      setTasks(prev => prev.filter(t => t.id !== editingTask.id));
      setIsModalOpen(false);
    }
  };

  if (!isClient) return null;

  return (
    <div className="h-screen bg-zinc-50 dark:bg-[#050505] font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-900/30 relative">
      
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none bg-[radial-gradient(#a1a1aa_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px]"></div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(161, 161, 170, 0.2); 
          border-radius: 99px; 
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Board Area - Snap Scrolling for Mobile */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden z-10 snap-x snap-mandatory scroll-pl-4">
        <div className="h-full p-4 md:p-8 inline-flex items-start gap-4 md:gap-6 min-w-full">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columns.map(c => c.id)}>
              {columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={tasks.filter(t => t.columnId === col.id)}
                  onAddTask={openCreateModal}
                  onDeleteTask={(id) => setTasks(prev => prev.filter(t => t.id !== id))}
                  onEditTask={openEditModal}
                />
              ))}
            </SortableContext>

            <DragOverlay dropAnimation={{
               sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
            }}>
              {activeTask ? (
                <div className="w-[85vw] md:w-[320px] cursor-grabbing rotate-2 shadow-2xl">
                   <div className="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-indigo-500/50 shadow-xl">
                     <p className="text-sm font-medium">{activeTask.content}</p>
                   </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          {/* Spacer for horizontal scroll padding */}
          <div className="w-1 md:w-0 shrink-0"></div>
        </div>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 md:bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
         <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl rounded-full border border-zinc-200/50 dark:border-zinc-800/50 ring-1 ring-black/5 dark:ring-white/5 transition-transform hover:scale-[1.01] max-w-full overflow-x-auto hide-scrollbar">
            <Link 
              href="/"
              className="p-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all shrink-0"
            >
              <Home size={20} />
            </Link>
            
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0"></div>

            <button
              onClick={() => openCreateModal('todo')}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-full transition-colors shadow-lg shadow-indigo-600/20 whitespace-nowrap shrink-0"
            >
              <Plus size={16} /> New Task
            </button>

            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1 shrink-0"></div>

            <button 
               onClick={() => { if(confirm('Reset?')) { setTasks(DEFAULT_TASKS); setColumns(DEFAULT_COLUMNS); }}}
               className="p-3 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-all shrink-0"
               title="Reset Data"
            >
              <RotateCcw size={20} />
            </button>
            <button 
               onClick={() => { if(confirm('Clear all?')) setTasks([]); }}
               className="p-3 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all shrink-0"
               title="Clear All"
            >
              <Trash2 size={20} />
            </button>
         </div>
      </div>

      {/* Modern Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div 
            className="w-full max-w-md bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
           >
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                  {modalMode === 'create' ? 'Create New Task' : 'Edit Task'}
                </h2>
                <div className="flex gap-2">
                   {modalMode === 'edit' && (
                     <button onClick={handleDeleteTask} className="text-zinc-400 hover:text-rose-500 transition-colors mr-2">
                       <Trash2 size={18} />
                     </button>
                   )}
                   <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                     <X size={18} />
                   </button>
                </div>
              </div>

              <form onSubmit={saveTask} className="p-6 space-y-5">
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Content</label>
                   <textarea 
                     name="content" 
                     required 
                     autoFocus
                     defaultValue={editingTask?.content}
                     placeholder="What needs to be done?"
                     className="w-full p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px] resize-none transition-shadow"
                   />
                 </div>

                 {/* Grid for Dropdowns */}
                 <div className="grid grid-cols-2 gap-4">
                   {/* Priority Dropdown */}
                   <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Priority</label>
                      <div className="relative group">
                        <select 
                          name="priority"
                          defaultValue={editingTask?.priority || 'medium'}
                          className="w-full p-2.5 pl-3 pr-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                   </div>

                   {/* Column Dropdown */}
                   <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status</label>
                      <div className="relative group">
                        <select 
                          name="columnId"
                          defaultValue={editingTask?.columnId || targetColumn}
                          className="w-full p-2.5 pl-3 pr-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm appearance-none cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                        >
                          {columns.map(col => (
                            <option key={col.id} value={col.id}>{col.title}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                           <ChevronDown size={14} />
                        </div>
                      </div>
                   </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tags</label>
                    <input 
                      name="tags" 
                      type="text" 
                      defaultValue={editingTask?.tags.join(', ')}
                      placeholder="design, dev..."
                      className="w-full p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    />
                 </div>

                 <button 
                   type="submit"
                   className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white/90 text-white dark:text-zinc-900 rounded-xl font-bold text-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                 >
                   {modalMode === 'create' ? <Plus size={16} /> : <Check size={16} />}
                   {modalMode === 'create' ? 'Create Task' : 'Save Changes'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}