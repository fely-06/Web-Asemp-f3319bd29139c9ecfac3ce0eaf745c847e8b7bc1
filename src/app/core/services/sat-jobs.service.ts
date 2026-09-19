import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SatJobsService {

  private url = environment.apiUrl + '/api/sat/jobs';

  constructor(private http: HttpClient) {}

  crearJob(dto: any) {
    return this.http.post(this.url + '/crear', dto);
  }

  listarJobs() {
    return this.http.get<any[]>(this.url);
  }

  obtenerLogs(jobId: number) {
    return this.http.get<any[]>(`${this.url}/${jobId}/logs`);
  }

  // En SatJobsService
eliminarJob(jobId: number) {
  return this.http.delete(`${this.url}/${jobId}`);
}
}
