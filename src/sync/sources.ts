import { SyncError, type HistoryEntry, type SyncConfig } from "./types";

export interface CommitFile {
  path: string;
  /** Texto del archivo; `null` borra el archivo. */
  text: string | null;
}

/**
 * Lugar remoto donde viven los datos. Hoy hay una implementación (GitHub),
 * pero el motor de sincronización solo conoce esta interfaz, así que se
 * podría cambiar de servidor sin tocar el resto.
 */
export interface RemoteSource {
  readonly canWrite: boolean;
  /** Lee un archivo. `ref` = commit concreto; sin `ref` = última versión. `null` si no existe. */
  readText(path: string, ref?: string): Promise<string | null>;
  /** Identificador de la última versión publicada. */
  head(): Promise<string>;
  /** Publica varios archivos de una sola vez (todo o nada). Falla con `conflict` si alguien publicó antes. */
  commit(files: CommitFile[], message: string, expectedHead: string, author?: string): Promise<string>;
  history(path: string, limit: number): Promise<HistoryEntry[]>;
}

type FetchLike = typeof fetch;

const API = "https://api.github.com";

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export class GitHubSource implements RemoteSource {
  constructor(
    private readonly cfg: Pick<SyncConfig, "owner" | "repo" | "branch" | "token">,
    private readonly fetchImpl: FetchLike = (...args) => fetch(...args),
  ) {}

  get canWrite(): boolean {
    return Boolean(this.cfg.token);
  }

  private get repoPath(): string {
    return `${encodeURIComponent(this.cfg.owner)}/${encodeURIComponent(this.cfg.repo)}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { "X-GitHub-Api-Version": "2022-11-28", ...extra };
    if (this.cfg.token) h.Authorization = `Bearer ${this.cfg.token}`;
    return h;
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, { cache: "no-store", ...init });
    } catch {
      throw new SyncError("network", "Sin conexión con el servidor de datos.");
    }
    if (res.status === 401 || res.status === 403) {
      if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
        throw new SyncError("network", "GitHub limitó temporalmente las consultas. Se reintentará más tarde.");
      }
      throw new SyncError(
        "auth",
        this.cfg.token
          ? "GitHub rechazó la clave de acceso (¿caducó o no tiene permisos?)."
          : "El repositorio de datos es privado: falta la clave de acceso.",
      );
    }
    return res;
  }

  async readText(path: string, ref?: string): Promise<string | null> {
    let res: Response;
    if (this.cfg.token) {
      const url = `${API}/repos/${this.repoPath}/contents/${encodePath(path)}?ref=${encodeURIComponent(
        ref ?? this.cfg.branch,
      )}`;
      res = await this.request(url, { headers: this.headers({ Accept: "application/vnd.github.raw+json" }) });
    } else {
      // Repositorio público: se lee directo, sin límites de la API. El parámetro evita la caché de la CDN.
      const bust = ref ? "" : `?nocache=${Date.now()}`;
      const url = `https://raw.githubusercontent.com/${this.repoPath}/${encodeURIComponent(
        ref ?? this.cfg.branch,
      )}/${encodePath(path)}${bust}`;
      res = await this.request(url);
    }
    if (res.status === 404) {
      // Un repo privado sin clave también responde 404 en raw: se avisa para que se entienda.
      return null;
    }
    if (!res.ok) throw new SyncError("network", `El servidor respondió ${res.status}.`);
    return await res.text();
  }

  async head(): Promise<string> {
    const res = await this.request(
      `${API}/repos/${this.repoPath}/git/ref/heads/${encodePath(this.cfg.branch)}`,
      { headers: this.headers() },
    );
    if (res.status === 404) throw new SyncError("not-found", "No se encontró el repositorio o la rama de datos.");
    if (!res.ok) throw new SyncError("network", `El servidor respondió ${res.status}.`);
    const json = (await res.json()) as { object: { sha: string } };
    return json.object.sha;
  }

  private async api<T>(path: string, method: string, body?: unknown): Promise<{ status: number; json: T }> {
    const res = await this.request(`${API}/repos/${this.repoPath}${path}`, {
      method,
      headers: this.headers({ "Content-Type": "application/json", Accept: "application/vnd.github+json" }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, json };
  }

  async commit(files: CommitFile[], message: string, expectedHead: string, author?: string): Promise<string> {
    if (!this.canWrite) throw new SyncError("no-write", "Para publicar hace falta una clave de acceso con permiso de escritura.");

    const parent = await this.api<{ tree: { sha: string }; message?: string }>(
      `/git/commits/${expectedHead}`,
      "GET",
    );
    if (parent.status !== 200) throw new SyncError("network", "No se pudo leer la versión actual del servidor.");

    const tree: Array<{ path: string; mode: "100644"; type: "blob"; sha: string | null }> = [];
    for (const file of files) {
      if (file.text === null) {
        tree.push({ path: file.path, mode: "100644", type: "blob", sha: null });
        continue;
      }
      const blob = await this.api<{ sha: string }>("/git/blobs", "POST", {
        content: file.text,
        encoding: "utf-8",
      });
      if (blob.status !== 201) throw new SyncError("network", "El servidor no aceptó uno de los archivos.");
      tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.json.sha });
    }

    const newTree = await this.api<{ sha: string }>("/git/trees", "POST", {
      base_tree: parent.json.tree.sha,
      tree,
    });
    if (newTree.status !== 201) throw new SyncError("network", "No se pudo preparar la publicación.");

    const stamp = author ? { name: author, email: "boxmaper@users.noreply.github.com" } : undefined;
    const commit = await this.api<{ sha: string }>("/git/commits", "POST", {
      message,
      tree: newTree.json.sha,
      parents: [expectedHead],
      ...(stamp ? { author: stamp } : {}),
    });
    if (commit.status !== 201) throw new SyncError("network", "No se pudo crear la versión publicada.");

    // force:false → si alguien publicó mientras tanto, GitHub lo rechaza y no se pisa nada.
    const ref = await this.api<{ message?: string }>(
      `/git/refs/heads/${encodePath(this.cfg.branch)}`,
      "PATCH",
      { sha: commit.json.sha, force: false },
    );
    if (ref.status === 422) {
      throw new SyncError("conflict", "Alguien publicó cambios mientras tanto. Actualizá y volvé a intentar.");
    }
    if (ref.status !== 200) throw new SyncError("network", "No se pudo completar la publicación.");
    return commit.json.sha;
  }

  async history(path: string, limit: number): Promise<HistoryEntry[]> {
    const res = await this.request(
      `${API}/repos/${this.repoPath}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(
        this.cfg.branch,
      )}&per_page=${limit}`,
      { headers: this.headers({ Accept: "application/vnd.github+json" }) },
    );
    if (!res.ok) throw new SyncError("network", `No se pudo leer el historial (${res.status}).`);
    const list = (await res.json()) as Array<{
      sha: string;
      commit: { message: string; author?: { name?: string; date?: string } };
    }>;
    return list.map((c) => ({
      id: c.sha,
      message: c.commit.message.split("\n")[0],
      date: c.commit.author?.date ?? "",
      author: c.commit.author?.name ?? "",
    }));
  }
}
