import { jsPDF } from "jspdf";

declare module "jspdf" {
  interface jsPDF {
    /** Última tabla dibujada por jspdf-autotable (con las alturas reales de cada fila). */
    lastAutoTable: {
      finalY: number;
      pageNumber?: number;
      head: { height: number }[];
      body: { height: number }[];
    };
  }
}

declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";
  function autoTable(doc: jsPDF, options: Record<string, unknown>): jsPDF;
  export default autoTable;
}
