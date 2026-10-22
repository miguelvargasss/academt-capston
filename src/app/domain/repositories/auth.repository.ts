import { Observable } from 'rxjs';
import { AuthCredentials, AuthSession } from '../models/auth.model';
import { UserProfile } from '../models/user.model';

export interface AuthRepository {
  login(credentials: AuthCredentials): Observable<AuthSession>;
  logout(): Observable<void>;
  getCurrentUser(): Observable<UserProfile | null>;
}
