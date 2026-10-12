import { SyncError, type HistoryEntry } from "./types";
import type { CommitFile, RemoteSource } from "./sources";

/**
 * Servidor de mentira en memoria con historial de versiones. Se usa en las
 * pruebas automáticas para ensayar publicar, actualizar y volver atrás sin red.
 */
export class MemorySource implements RemoteSource {
  private commits: Array<{
    id: string;
    message: string;
    author: string;
    date: string;
    files: Map<string, string>;
    touched: string[];
  }> = [];
  public failNextRead: string | null = null;
  public corrupt: Record<string, string> = {};

  constructor(public canWrite = true) {
    this.commits.push({
      id: "c0",
      message: "inicio",
      author: "",
      date: new Date(0).toISOString(),
      files: new Map(),
      touched: [],
    });
  }

  private get tip() {
    return this.commits[this.commits.length - 1];
  }

  async readText(path: string, ref?: string): Promise<string | null> {
    if (this.failNextRead) {
      const msg = this.failNextRead;
      this.failNextRead = null;
      throw new SyncError("network", msg);
    }
    const commit = ref ? this.commits.find((c) => c.id === ref) : this.tip;
    if (!commit) return null;
    if (!ref && this.corrupt[path] !== undefined) return this.corrupt[path];
    return commit.files.get(path) ?? null;
  }

  async head(): Promise<string> {
    return this.tip.id;
  }

  async commit(files: CommitFile[], message: string, expectedHead: string, author = ""): Promise<string> {
    if (!this.canWrite) throw new SyncError("no-write", "sin permiso");
    if (expectedHead !== this.tip.id) throw new SyncError("conflict", "alguien publicó antes");
    const next = new Map(this.tip.files);
    for (const f of files) {
      if (f.text === null) next.delete(f.path);
      else next.set(f.path, f.text);
    }
    const id = `c${this.commits.length}`;
    this.commits.push({
      id,
      message,
      author,
      date: new Date(this.commits.length * 1000).toISOString(),
      files: next,
      touched: files.map((f) => f.path),
    });
    return id;
  }

  async history(path: string, limit: number): Promise<HistoryEntry[]> {
    return this.commits
      .filter((c) => c.touched.includes(path))
      .reverse()
      .slice(0, limit)
      .map((c) => ({ id: c.id, message: c.message, date: c.date, author: c.author }));
  }

  /** Atajo de pruebas: simula que otra persona publica sin pasar por el motor. */
  rawCommit(files: CommitFile[], message = "externo"): Promise<string> {
    return this.commit(files, message, this.tip.id);
  }
}
