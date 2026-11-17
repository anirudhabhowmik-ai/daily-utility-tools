"use client";

import { useRef, useState } from "react";
import ToolShell, { ToolLabel } from "../ToolShell";

type Task = { id: number; text: string; done: boolean };

export default function ScopeGuard() {
  const nextTaskId = useRef(0);
  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);

  const reset = () => {
    setTaskInput("");
    setTasks([]);
    nextTaskId.current = 0;
  };

  const addTask = () => {
    const text = taskInput.trim();
    if (!text) return;
    setTasks((current) => [...current, { id: nextTaskId.current++, text, done: false }]);
    setTaskInput("");
  };

  const exportScope = () => {
    const lines = [
      "Project scope checklist",
      `Created: ${new Date().toLocaleDateString()}`,
      "",
      ...tasks.map((task) => `${task.done ? "[x]" : "[ ]"} ${task.text}`),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-scope-checklist.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <ToolShell title="Project scope checklist" onReset={reset}>
      <ToolLabel>Deliverable or change request<input className="tool-input" value={taskInput} onChange={(event) => setTaskInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTask(); }} placeholder="e.g. Homepage wireframe, two revision rounds" /></ToolLabel>
      <button type="button" className="btn" onClick={addTask}>Add to scope checklist</button>
      {tasks.length > 0 ? <div style={{ marginTop: "1rem" }}>
        <p>{tasks.filter((task) => task.done).length} of {tasks.length} items confirmed</p>
        <button type="button" className="tool-secondary-button" onClick={exportScope}>Export checklist</button>
        <ul>{tasks.map((task) => <li key={task.id} style={{ marginBottom: "0.75rem" }}><label><input type="checkbox" checked={task.done} onChange={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} /> <span style={{ textDecoration: task.done ? "line-through" : "none" }}>{task.text}</span></label> <button type="button" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}>Remove</button></li>)}</ul>
      </div> : <p>Add deliverables, exclusions, or requested changes to make the scope visible.</p>}
      <p>Your checklist stays in this page session and is not saved to an account.</p>
    </ToolShell>
  );
}
