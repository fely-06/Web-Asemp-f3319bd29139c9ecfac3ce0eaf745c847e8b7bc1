export class Utilerias {

    private static permisos: string[] = [];

    // ==========================================
    // GUARDAR PERMISOS DESPUÉS DEL LOGIN
    // ==========================================
    static setPermisos(lista: string[]) {
        this.permisos = lista ?? [];
        localStorage.setItem('permisos', JSON.stringify(this.permisos));
    }

    // ==========================================
    // LEER PERMISOS (si no están cargados)
    // ==========================================
    static getPermisos(): string[] {
        if (this.permisos.length === 0) {
            const data = localStorage.getItem('permisos');
            if (data) this.permisos = JSON.parse(data);
        }
        return this.permisos;
    }

    // ==========================================
    // VALIDAR UN PERMISO
    // ==========================================
    static tienePermiso(clave: string): boolean {
        const lista = this.getPermisos();
        return lista.includes(clave);
    }
}
