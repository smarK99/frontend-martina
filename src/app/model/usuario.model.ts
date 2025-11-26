export interface TipoUsuario {
  idTipoUsuario?: number;
  nombreTipoUsuario: string;
  descripcionTipoUsuario: string;
  fechaHoraInicioVigenciaTipoUsuario: string;
  fechaHoraFinVigenciaTipoUsuario?: string | null;
}

export interface Usuario {
  idUsuario?: number;
  username: string;
  password: string;
  nombreCompletoUsuario: string;
  dni: number;
  email: string;
  telefono: number;
  direccion: string;
  fechaHoraAltaUsuario?: string;
  fechaHoraBajaUsuario?: string | null;
  tipoUsuarioList?: TipoUsuario[];
}
